from fastapi import APIRouter, Depends
from typing import List
from app.api.deps import require_exporter, CurrentUser
from app.core.supabase import get_supabase
from app.models.agent import AgentRunOut

router = APIRouter(prefix="/invoices", tags=["agent_runs"])

@router.get("/{invoice_id}/agent-runs", response_model=List[AgentRunOut])
def get_agent_runs(invoice_id: str, user: CurrentUser = Depends(require_exporter)):
    """Fetch agent runs for a specific invoice"""
    db = get_supabase()
    # RLS ensures exporter can only select agent_runs for their own invoices
    res = db.table("agent_runs").select("*").eq("invoice_id", invoice_id).order("created_at").execute()
    return res.data
