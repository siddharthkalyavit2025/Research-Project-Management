from typing import Optional, List, Any
from pydantic import BaseModel, Field, EmailStr

class ResearcherBase(BaseModel):
    researcher_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    specialization: Optional[str] = Field(None, max_length=100)
    contact_number: Optional[str] = Field(None, max_length=15)
    researcher_role: Optional[str] = Field("Researcher", max_length=50)

class ResearcherCreate(ResearcherBase):
    researcher_id: Optional[int] = None

class ResearcherUpdate(BaseModel):
    researcher_name: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    specialization: Optional[str] = Field(None, max_length=100)
    contact_number: Optional[str] = Field(None, max_length=15)
    researcher_role: Optional[str] = Field(None, max_length=50)

class ResearcherResponse(ResearcherBase):
    researcher_id: int
    teams_led_count: Optional[int] = 0

class ResearcherDetailResponse(ResearcherResponse):
    teams: List[Any] = []
