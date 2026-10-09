from typing import Optional, List, Any
from pydantic import BaseModel, Field, EmailStr

class FundingSourceBase(BaseModel):
    funding_source_name: str = Field(..., min_length=2, max_length=100)
    funding_type: str = Field(..., min_length=2, max_length=50)
    contact_email: Optional[EmailStr] = None
    contact_number: Optional[str] = Field(None, max_length=15)

class FundingSourceCreate(FundingSourceBase):
    funding_source_id: Optional[int] = None

class FundingSourceUpdate(BaseModel):
    funding_source_name: Optional[str] = Field(None, min_length=2, max_length=100)
    funding_type: Optional[str] = Field(None, min_length=2, max_length=50)
    contact_email: Optional[EmailStr] = None
    contact_number: Optional[str] = Field(None, max_length=15)

class FundingSourceResponse(FundingSourceBase):
    funding_source_id: int
    grants_count: Optional[int] = 0
    total_funded_amount: Optional[float] = 0.0

class FundingSourceDetailResponse(FundingSourceResponse):
    grants: List[Any] = []
