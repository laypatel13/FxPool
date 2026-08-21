from fastapi import APIRouter, Depends, HTTPException
from datetime import date
from app.api.deps import require_exporter
from app.services.rate_service import compute_indicative_forward_rate

router = APIRouter(prefix="/rate", tags=["rate"])


@router.get("/indicative")
def get_indicative_rate(
    currency: str,
    due_date: date,
    user=Depends(require_exporter),
):
    try:
        rate = compute_indicative_forward_rate(currency, due_date)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return {"currency": currency.upper(), "due_date": due_date, "indicative_rate": rate}
