"""Critical V2 isolation: Bank A invoices never match Bank B pools."""

from datetime import date

from app.services.eligibility import (
    assignment_guard,
    filter_eligible_pools,
    sanitize_pools_for_ai,
    validate_ai_recommendation,
)


BANK_A = "bank-a"
BANK_B = "bank-b"
EXPORTER_A = "exp-a"

INVOICE_A = {
    "id": "inv-a",
    "exporter_id": EXPORTER_A,
    "bank_id": BANK_A,
    "amount": 37500,
    "currency": "USD",
    "due_date": date(2026, 9, 18),
    "compliance_status": "approved",
}

POOL_A = {
    "id": "pool-a1",
    "bank_id": BANK_A,
    "name": "USD September Pool",
    "currency": "USD",
    "status": "collecting",
    "bucket_start_date": date(2026, 9, 15),
    "bucket_end_date": date(2026, 9, 30),
    "total_amount": 82000,
    "minimum_amount": 50000,
    "target_amount": 100000,
    "maximum_amount": 150000,
    "risk_score": 20,
}

POOL_B = {
    "id": "pool-b1",
    "bank_id": BANK_B,
    "name": "HDFC USD Pool",
    "currency": "USD",
    "status": "collecting",
    "bucket_start_date": date(2026, 9, 15),
    "bucket_end_date": date(2026, 9, 30),
    "total_amount": 10000,
    "minimum_amount": 25000,
    "target_amount": 75000,
    "maximum_amount": 150000,
    "risk_score": 10,
}


def test_bank_b_pool_not_eligible_for_exporter_a():
    eligible = filter_eligible_pools(INVOICE_A, [POOL_A, POOL_B], EXPORTER_A, BANK_A)
    ids = {p["id"] for p in eligible}
    assert "pool-a1" in ids
    assert "pool-b1" not in ids


def test_ai_payload_contains_only_bank_a_pools():
    eligible = filter_eligible_pools(INVOICE_A, [POOL_A, POOL_B], EXPORTER_A, BANK_A)
    payload = sanitize_pools_for_ai(eligible)
    assert {p["id"] for p in payload} == {"pool-a1"}
    assert all(p["bank_id"] == BANK_A for p in payload)


def test_ai_cannot_recommend_other_bank():
    eligible_ids = {"pool-a1"}
    assert validate_ai_recommendation({"recommended_pool_id": "pool-b1", "match_score": 99}, eligible_ids) is None
    assert validate_ai_recommendation({"recommended_pool_id": "pool-a1", "match_score": 91}, eligible_ids) == "pool-a1"


def test_join_bank_b_rejected():
    ok, reason = assignment_guard(INVOICE_A, POOL_B, EXPORTER_A, BANK_A)
    assert ok is False
    assert reason in ("bank_mismatch", "invoice_bank_mismatch")


def test_capacity_blocks_overfill():
    tight = {**POOL_A, "total_amount": 140000, "maximum_amount": 150000}
    ok, reason = assignment_guard(INVOICE_A, tight, EXPORTER_A, BANK_A)
    assert ok is False
    assert reason == "capacity"


def test_http_join_bank_b_rejected():
    import os
    os.environ["SUPABASE_URL"] = "http://localhost:8000"
    os.environ["SUPABASE_SERVICE_ROLE_KEY"] = "dummy"

    from fastapi.testclient import TestClient
    from unittest.mock import patch, MagicMock
    from app.main import app
    from app.api.deps import require_exporter, CurrentUser

    app.dependency_overrides[require_exporter] = lambda: CurrentUser(
        id=EXPORTER_A, email="exp@test.com", role="exporter"
    )

    client = TestClient(app)

    with patch("app.api.v1.endpoints.pools.resolve_exporter_bank_id") as mock_resolve_pools, \
         patch("app.services.pooling_service.resolve_exporter_bank_id") as mock_resolve_svc, \
         patch("app.api.v1.endpoints.pools.get_supabase") as mock_db_pools, \
         patch("app.services.pooling_service.get_supabase") as mock_db_svc:

        mock_resolve_pools.return_value = BANK_A
        mock_resolve_svc.return_value = BANK_A

        mock_pools_client = MagicMock()
        mock_db_pools.return_value = mock_pools_client
        mock_pools_client.table().select().eq().eq().maybe_single().execute().data = INVOICE_A

        mock_svc_client = MagicMock()
        mock_db_svc.return_value = mock_svc_client
        mock_svc_client.table().select().eq().maybe_single().execute().data = POOL_B

        response = client.post("/api/v1/pools/pool-b1/join?invoice_id=inv-a")
        
        assert response.status_code == 403
        
    app.dependency_overrides.clear()

