import os
import sys
import json
from dotenv import load_dotenv

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from app.services.agents import (
    run_invoice_agent,
    run_compliance_agent,
    run_bank_routing_agent,
    run_pooling_agent,
    run_risk_agent,
)

# Mock Data
MOCK_INVOICE = {
    "id": "11111111-1111-1111-1111-111111111111",
    "exporter_id": "22222222-2222-2222-2222-222222222222",
    "amount": 50000,
    "currency": "USD",
    "due_date": "2026-10-15",
    "indicative_rate": 83.5,
}

def test_all():
    print("Testing Invoice Agent...")
    try:
        inv_out = run_invoice_agent(MOCK_INVOICE)
        print("✅ Invoice Agent Output:", json.dumps(inv_out, indent=2))
    except Exception as e:
        print("❌ Error:", e)

    print("\nTesting Compliance Agent...")
    try:
        comp_out = run_compliance_agent(MOCK_INVOICE)
        print("✅ Compliance Agent Output:", json.dumps(comp_out, indent=2))
    except Exception as e:
        print("❌ Error:", e)

    print("\nTesting Bank Routing Agent...")
    try:
        bank_out = run_bank_routing_agent(MOCK_INVOICE)
        print("✅ Bank Routing Agent Output:", json.dumps(bank_out, indent=2))
    except Exception as e:
        print("❌ Error:", e)

    print("\nTesting Pooling Agent...")
    try:
        pool_out = run_pooling_agent(MOCK_INVOICE, bank_out.get("bank_id"))
        print("✅ Pooling Agent Output:", json.dumps(pool_out, indent=2))
    except Exception as e:
        print("❌ Error:", e)

    print("\nTesting Risk Agent...")
    try:
        risk_out = run_risk_agent(MOCK_INVOICE, pool_out)
        print("✅ Risk Agent Output:", json.dumps(risk_out, indent=2))
    except Exception as e:
        print("❌ Error:", e)

    print("\nExecution Agent was skipped because it modifies real pool state.")

if __name__ == "__main__":
    test_all()
