from pydantic import BaseModel, Field
from datetime import date, datetime
from typing import Literal, Optional

InvoiceStatus = Literal["pending_pool", "pooled", "locked", "settled"]


class InvoiceCreate(BaseModel):
    amount: float = Field(gt=0)
    currency: str = Field(min_length=3, max_length=3)
    due_date: date


class InvoiceOut(BaseModel):
    id: str
    exporter_id: str
    exporter_name: Optional[str] = None
    amount: float
    currency: str
    due_date: date
    indicative_rate: Optional[float] = None
    status: InvoiceStatus
    pool_id: Optional[str] = None
    locked_rate: Optional[float] = None
    payout_amount: Optional[float] = None
    risk_score: Optional[float] = None
    compliance_status: Optional[str] = None
    agent_recommended_pool_id: Optional[str] = None
    created_at: datetime
