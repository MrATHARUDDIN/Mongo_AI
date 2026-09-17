from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class MemoryType(str, Enum):
    FACT = "fact"
    CORRECTION = "correction"
    RULE = "rule"
    EXCEPTION = "exception"
    DECISION = "decision"
    ASSUMPTION = "assumption"


class MemoryCreate(BaseModel):
    type: MemoryType
    content: str
    authority_level: float = Field(..., ge=0.0, le=10.0)
    source: str
    replaces_id: Optional[str] = None
    expires_at: Optional[datetime] = None

class MemoryUpdate(BaseModel):
    type: Optional[str] = None
    content: Optional[str] = None
    source: Optional[str] = None
    authority_level: Optional[float] = None
    is_overridden: Optional[bool] = None


class MemoryResponse(MemoryCreate):
    id: str
    created_at: datetime
    is_overridden: bool = False
    superseded_by: Optional[str] = None


class QueryRequest(BaseModel):
    user_prompt: str