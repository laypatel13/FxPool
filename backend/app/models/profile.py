from pydantic import BaseModel
from typing import Literal, Optional

Role = Literal["exporter", "admin"]


class ProfileCreate(BaseModel):
    role: Role
    full_name: str
    company_name: Optional[str] = None


class ProfileOut(BaseModel):
    id: str
    role: Role
    full_name: str
    company_name: Optional[str] = None


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    company_name: Optional[str] = None
