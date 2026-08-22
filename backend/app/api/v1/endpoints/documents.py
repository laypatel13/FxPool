from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from app.api.deps import get_current_user, require_admin, CurrentUser
from app.core.supabase import get_supabase

router = APIRouter(prefix="/documents", tags=["documents"])

class DocumentCreate(BaseModel):
    entity_type: str
    entity_id: str
    category: str
    document_name: str
    file_url: str

class DocumentVerify(BaseModel):
    status: str
    rejection_reason: Optional[str] = None

@router.get("/entity/{entity_type}/{entity_id}")
def get_documents_by_entity(entity_type: str, entity_id: str, user: CurrentUser = Depends(get_current_user)):
    db = get_supabase()
    res = db.table("compliance_documents").select("*").eq("entity_type", entity_type).eq("entity_id", entity_id).execute()
    return res.data

@router.post("/")
def upload_document(doc: DocumentCreate, user: CurrentUser = Depends(get_current_user)):
    db = get_supabase()
    row = {
        "uploader_id": user.id,
        "entity_type": doc.entity_type,
        "entity_id": doc.entity_id,
        "category": doc.category,
        "document_name": doc.document_name,
        "file_url": doc.file_url,
        "status": "pending"
    }
    res = db.table("compliance_documents").insert(row).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to create document")
    return res.data[0]

@router.patch("/{document_id}/verify")
def verify_document(document_id: str, body: DocumentVerify, user: CurrentUser = Depends(require_admin)):
    db = get_supabase()
    update_data = {
        "status": body.status,
        "verified_at": datetime.utcnow().isoformat() if body.status == "verified" else None,
        "verified_by": user.id if body.status == "verified" else None,
        "rejection_reason": body.rejection_reason
    }
    res = db.table("compliance_documents").update(update_data).eq("id", document_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Document not found")
    return res.data[0]
