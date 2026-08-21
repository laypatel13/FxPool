from pydantic import BaseModel
from datetime import date, datetime
from typing import Literal, Optional

PoolStatus = Literal["collecting", "suggested", "locked", "settled"]


class PoolOut(BaseModel):
    id: str
    currency: str
    bucket_start_date: date
    bucket_end_date: date
    bucket_width_days: int
    status: PoolStatus
    total_amount: float
    locked_rate: Optional[float] = None
    executed_at: Optional[datetime] = None
    settled_at: Optional[datetime] = None
    created_at: datetime


class PoolDetailOut(PoolOut):
    invoices: list[dict] = []
