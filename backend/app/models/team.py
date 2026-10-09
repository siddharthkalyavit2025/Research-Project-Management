from typing import Optional
from pydantic import BaseModel, Field

class TeamBase(BaseModel):
    team_name: str = Field(..., min_length=2, max_length=100)
    team_size: int = Field(..., gt=0)
    team_lead_id: int
    project_id: int

class TeamCreate(TeamBase):
    team_id: Optional[int] = None

class TeamUpdate(BaseModel):
    team_name: Optional[str] = Field(None, min_length=2, max_length=100)
    team_size: Optional[int] = Field(None, gt=0)
    team_lead_id: Optional[int] = None
    project_id: Optional[int] = None

class TeamResponse(TeamBase):
    team_id: int
    team_lead_name: Optional[str] = None
    team_lead_email: Optional[str] = None
    project_name: Optional[str] = None
