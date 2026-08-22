from pydantic import BaseModel
from datetime import datetime
from typing import Literal, Optional, Any


class AgentRunOut(BaseModel):
    id: str
    invoice_id: Optional[str] = None
    pool_id: Optional[str] = None
    agent_name: Literal[
        "invoice", "risk", "pooling", "compliance", "orchestrator", "bank_routing", "execution"
    ]
    input: Optional[dict[str, Any]] = None
    output: Optional[dict[str, Any]] = None
    recommendation: Optional[str] = None
    confidence: Optional[float] = None
    created_at: datetime
