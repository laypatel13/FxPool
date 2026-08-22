from pydantic import BaseModel, ConfigDict, Field
from datetime import date, datetime
from typing import Any, Literal, Optional

PoolStatus = Literal[
    "draft",
    "collecting",
    "target_reached",
    "hedging",
    "hedged",
    "settled",
    "cancelled",
    "expired",
]


class PoolCreate(BaseModel):
    name: str
    currency: str = Field(min_length=3, max_length=3)
    bucket_start_date: date
    bucket_end_date: date
    bucket_width_days: Optional[int] = None
    minimum_amount: float = Field(gt=0)
    target_amount: float = Field(gt=0)
    maximum_amount: float = Field(gt=0)
    eligible_exporter_ids: Optional[list[str]] = None
    status: Optional[Literal["draft", "collecting"]] = "collecting"


class PoolUpdate(BaseModel):
    name: Optional[str] = None
    minimum_amount: Optional[float] = None
    target_amount: Optional[float] = None
    maximum_amount: Optional[float] = None
    eligible_exporter_ids: Optional[list[str]] = None
    status: Optional[Literal["draft", "collecting", "cancelled"]] = None


class PoolOut(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    bank_id: Optional[str] = None
    name: Optional[str] = None
    currency: str
    bucket_start_date: date
    bucket_end_date: date
    bucket_width_days: int
    status: str
    total_amount: float
    minimum_amount: Optional[float] = None
    target_amount: Optional[float] = None
    maximum_amount: Optional[float] = None
    eligible_exporter_ids: Optional[list[str]] = None
    locked_rate: Optional[float] = None
    executed_at: Optional[datetime] = None
    settled_at: Optional[datetime] = None
    risk_score: Optional[float] = None
    compliance_status: Optional[str] = None
    created_at: datetime


class PoolDetailOut(PoolOut):
    invoices: list[dict] = []


class RecommendationOut(BaseModel):
    invoice: dict
    eligible_pools: list[dict]
    recommendation: dict
    bank: Optional[dict] = None
