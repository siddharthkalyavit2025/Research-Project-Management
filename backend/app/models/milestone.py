from typing import Optional
from pydantic import BaseModel, Field

class MilestoneBase(BaseModel):
    milestone_name: str = Field(..., min_length=2, max_length=100)
    milestone_description: Optional[str] = Field(None, max_length=250)
    target_date: Optional[str] = None  # YYYY-MM-DD
    milestone_status: Optional[str] = Field("Pending", max_length=30)
    project_id: int

class MilestoneCreate(MilestoneBase):
    milestone_id: Optional[int] = None

class MilestoneUpdate(BaseModel):
    milestone_name: Optional[str] = Field(None, min_length=2, max_length=100)
    milestone_description: Optional[str] = Field(None, max_length=250)
    target_date: Optional[str] = None
    milestone_status: Optional[str] = Field(None, max_length=30)
    project_id: Optional[int] = None

class MilestoneResponse(MilestoneBase):
    milestone_id: int
    project_name: Optional[str] = None
    lab_name: Optional[str] = None
    is_overdue: Optional[bool] = False
