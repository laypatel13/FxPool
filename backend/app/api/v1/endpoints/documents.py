from fastapi import APIRouter, Depends, HTTPException
from typing import List
from datetime import datetime

from app.api.deps import get_current_user, CurrentUser
from app.core.supabase import get_supabase
from app.models.document import DocumentCreate, DocumentOut, DocumentVerify
from app.core.config import settings

router = APIRouter()


@router.post("/", response_model=DocumentOut)
async def upload_document(
    doc: DocumentCreate,
    current_user: CurrentUser = Depends(get_current_user),
):
    db = get_supabase()
    """
    Register a newly uploaded document in the database.
    (The file itself should be uploaded to Supabase Storage by the client first,
    and the resulting URL passed here).
    """
    data = {
        "uploader_id": current_user.id,
        "entity_type": doc.entity_type.value,
        "entity_id": doc.entity_id,
        "category": doc.category.value,
        "document_name": doc.document_name,
        "file_url": doc.file_url,
        "status": "pending",
    }
    
    response = db.table("documents").insert(data).execute()
    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to save document record")
    return response.data[0]


@router.get("/entity/{entity_type}/{entity_id}", response_model=List[DocumentOut])
async def get_documents_by_entity(
    entity_type: str,
    entity_id: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    db = get_supabase()
    """
    Get all documents associated with a specific profile or invoice.
    """
    if entity_type not in ["profile", "invoice"]:
        raise HTTPException(status_code=400, detail="Invalid entity type")
        
    response = (
        db.table("documents")
        .select("*")
        .eq("entity_type", entity_type)
        .eq("entity_id", entity_id)
        .order("created_at", desc=True)
        .execute()
    )
    
    # If not admin, ensure they are the uploader
    if current_user.role != "admin":
        docs = [d for d in response.data if d["uploader_id"] == current_user.id]
    else:
        docs = response.data
        
    return docs


@router.patch("/{document_id}/verify", response_model=DocumentOut)
async def verify_document(
    document_id: str,
    verification: DocumentVerify,
    current_user: CurrentUser = Depends(get_current_user),
):
    db = get_supabase()
    """
    Approve or reject a document. Admin only.
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    update_data = {
        "status": verification.status,
        "verified_by": current_user.id,
        "verified_at": datetime.utcnow().isoformat(),
        "rejection_reason": verification.rejection_reason if verification.status == "rejected" else None,
        "updated_at": datetime.utcnow().isoformat()
    }

    response = db.table("documents").update(update_data).eq("id", document_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Document not found")
        
    return response.data[0]
