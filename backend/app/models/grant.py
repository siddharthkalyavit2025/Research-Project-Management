from typing import Optional
from pydantic import BaseModel, Field

class GrantBase(BaseModel):
    grant_name: str = Field(..., min_length=2, max_length=100)
    grant_amount: float = Field(..., gt=0)
    grant_date: str = Field(...)  # YYYY-MM-DD
    funding_source_id: int
    project_id: int

class GrantCreate(GrantBase):
    grant_id: Optional[int] = None

class GrantUpdate(BaseModel):
    grant_name: Optional[str] = Field(None, min_length=2, max_length=100)
    grant_amount: Optional[float] = Field(None, gt=0)
    grant_date: Optional[str] = None
    funding_source_id: Optional[int] = None
    project_id: Optional[int] = None

class GrantResponse(GrantBase):
    grant_id: int
    funding_source_name: Optional[str] = None
    funding_type: Optional[str] = None
    project_name: Optional[str] = None
