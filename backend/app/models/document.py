from pydantic import BaseModel, Field
from datetime import datetime
from typing import Literal, Optional
from enum import Enum


class DocumentEntityType(str, Enum):
    profile = "profile"
    invoice = "invoice"


class DocumentCategory(str, Enum):
    business_kyc = "business_kyc"
    individual_kyc = "individual_kyc"
    commercial = "commercial"
    shipment = "shipment"
    service_export = "service_export"
    payment_proof = "payment_proof"
    hedging_proof = "hedging_proof"
    other = "other"


class DocumentStatus(str, Enum):
    pending = "pending"
    verified = "verified"
    rejected = "rejected"


class DocumentCreate(BaseModel):
    entity_type: DocumentEntityType
    entity_id: str
    category: DocumentCategory
    document_name: str
    file_url: str


class DocumentOut(BaseModel):
    id: str
    uploader_id: str
    entity_type: DocumentEntityType
    entity_id: str
    category: DocumentCategory
    document_name: str
    file_url: str
    status: DocumentStatus
    verified_at: Optional[datetime] = None
    verified_by: Optional[str] = None
    rejection_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class DocumentVerify(BaseModel):
    status: Literal["verified", "rejected"]
    rejection_reason: Optional[str] = None
