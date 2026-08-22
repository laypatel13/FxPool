from pydantic import BaseModel, ConfigDict, Field
from datetime import date, datetime
from typing import Any, Literal, Optional

InvoiceStatus = Literal[
    "pending_pool", "recommended", "pooled", "pool_not_filled", "locked", "settled"
]


class InvoiceCreate(BaseModel):
    amount: float = Field(gt=0)
    currency: str = Field(min_length=3, max_length=3)
    due_date: date
    invoice_number: Optional[str] = None
    issue_date: Optional[date] = None
    buyer_name: Optional[str] = None
    buyer_country: Optional[str] = None
    payment_terms: Optional[str] = None
    document_text: Optional[str] = None
    document_url: Optional[str] = None


class InvoiceOut(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    exporter_id: str
    exporter_name: Optional[str] = None
    bank_id: Optional[str] = None
    amount: float
    currency: str
    due_date: date
    invoice_number: Optional[str] = None
    issue_date: Optional[date] = None
    buyer_name: Optional[str] = None
    buyer_country: Optional[str] = None
    payment_terms: Optional[str] = None
    document_url: Optional[str] = None
    extracted_data: Optional[Any] = None
    validation_status: Optional[str] = None
    indicative_rate: Optional[float] = None
    status: InvoiceStatus
    pool_id: Optional[str] = None
    locked_rate: Optional[float] = None
    payout_amount: Optional[float] = None
    risk_score: Optional[float] = None
    compliance_status: Optional[str] = None
    agent_recommended_pool_id: Optional[str] = None
    pool_match_status: Optional[str] = None
    match_score: Optional[float] = None
    match_reason: Optional[str] = None
    recommended_alternatives: Optional[Any] = None
    exporter_confirmed: bool = False
    created_at: datetime


class ParticipateBody(BaseModel):
    pool_id: Optional[str] = None
