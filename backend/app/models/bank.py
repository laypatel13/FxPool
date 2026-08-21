from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Literal

class BankBase(BaseModel):
    name: str
    code: str
    status: Literal['active', 'inactive', 'suspended'] = 'active'
    supported_currencies: list[str] = []
    api_endpoint: Optional[str] = None
    contact_email: Optional[str] = None
    contact_name: Optional[str] = None

class BankCreate(BankBase):
    pass

class BankOut(BankBase):
    id: str
    created_at: datetime

class BankCapacityBase(BaseModel):
    currency: str
    max_exposure: float
    min_pool_amount: Optional[float] = 5000

class BankCapacityOut(BankCapacityBase):
    id: str
    bank_id: str
    current_exposure: float
    updated_at: datetime

class BankQuoteOut(BaseModel):
    id: str
    pool_id: str
    bank_id: str
    quoted_rate: float
    source: str
    valid_until: Optional[datetime] = None
    created_at: datetime
