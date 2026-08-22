from pydantic import BaseModel, ConfigDict
from typing import Literal, Optional

Role = Literal["exporter", "admin", "bank"]


class ProfileCreate(BaseModel):
    role: Role
    full_name: str
    company_name: Optional[str] = None
    invitation_code: Optional[str] = None


class ProfileOut(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    role: Role
    full_name: str
    company_name: Optional[str] = None
    bank_id: Optional[str] = None


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    company_name: Optional[str] = None
