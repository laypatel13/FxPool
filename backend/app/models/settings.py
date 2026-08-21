from pydantic import BaseModel, Field
from typing import Optional


class PoolSettingsOut(BaseModel):
    id: str
    currency: Optional[str] = None
    bucket_width_days: int
    min_pool_amount: Optional[float] = None


class PoolSettingsUpdate(BaseModel):
    bucket_width_days: Optional[int] = Field(default=None, gt=0)
    min_pool_amount: Optional[float] = Field(default=None, ge=0)
