from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class BankCreate(BaseModel):
    code: str
    name: str
    status: Optional[str] = "pending"


class BankUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None


class BankOut(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    code: str
    name: str
    status: str
    created_at: datetime


class InviteCreate(BaseModel):
    kind: str = "exporter"
    code: Optional[str] = None


class InviteOut(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    bank_id: str
    code: str
    kind: str
    status: str
    created_at: datetime


class BankOverviewOut(BaseModel):
    bank: BankOut
    active_pools: int
    exporters: int
    pending_invoices: int
    total_pooled: float
    hedged_exposure: float
    open_exposure: float
