from pydantic import BaseModel
from typing import Optional


class AdminOverviewOut(BaseModel):
    total_exporters: int
    active_pools: int
    pending_approvals: int
    contracts_executed: int
    total_volume_hedged: float
    total_banks: int = 0


class MonthlyVolumePoint(BaseModel):
    month: str
    total: float


class CurrencyMixPoint(BaseModel):
    currency: str
    value: float


class AdminAnalyticsOut(BaseModel):
    monthly_volume: list[MonthlyVolumePoint]
    currency_mix: list[CurrencyMixPoint]


class ExporterSummaryOut(BaseModel):
    id: str
    full_name: str
    company_name: Optional[str] = None
    invoice_count: int
    total_volume: float
