from typing import Optional, List, Any
from pydantic import BaseModel, Field, model_validator

class ProjectBase(BaseModel):
    project_name: str = Field(..., min_length=2, max_length=100)
    project_description: Optional[str] = Field(None, max_length=250)
    team_leads_count: int = Field(1, ge=1)
    duration_months: int = Field(12, ge=1)
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    project_status: Optional[str] = Field("Ongoing", max_length=30)
    lab_code: int

    @model_validator(mode="after")
    def validate_dates(self):
        if self.start_date and self.end_date:
            if self.end_date < self.start_date:
                raise ValueError("end_date must be greater than or equal to start_date")
        return self

class ProjectCreate(ProjectBase):
    project_id: Optional[int] = None

class ProjectUpdate(BaseModel):
    project_name: Optional[str] = Field(None, min_length=2, max_length=100)
    project_description: Optional[str] = Field(None, max_length=250)
    team_leads_count: Optional[int] = Field(None, ge=1)
    duration_months: Optional[int] = Field(None, ge=1)
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    project_status: Optional[str] = Field(None, max_length=30)
    lab_code: Optional[int] = None

class ProjectResponse(ProjectBase):
    project_id: int
    lab_name: Optional[str] = None
    discipline: Optional[str] = None
    total_funding: Optional[float] = 0.0
    team_count: Optional[int] = 0
    milestone_count: Optional[int] = 0
    completed_milestones: Optional[int] = 0

class ProjectDetailResponse(ProjectResponse):
    teams: List[Any] = []
    grants: List[Any] = []
    milestones: List[Any] = []
