from typing import Optional, List, Any
from pydantic import BaseModel, Field

class LabBase(BaseModel):
    lab_name: str = Field(..., min_length=2, max_length=100)
    discipline: str = Field(..., min_length=2, max_length=50)
    allocated_budget: float = Field(0.0, ge=0.0)
    lab_location: Optional[str] = Field(None, max_length=100)
    lab_status: Optional[str] = Field("Active", max_length=20)

class LabCreate(LabBase):
    lab_code: Optional[int] = None

class LabUpdate(BaseModel):
    lab_name: Optional[str] = Field(None, min_length=2, max_length=100)
    discipline: Optional[str] = Field(None, min_length=2, max_length=50)
    allocated_budget: Optional[float] = Field(None, ge=0.0)
    lab_location: Optional[str] = Field(None, max_length=100)
    lab_status: Optional[str] = Field(None, max_length=20)

class LabResponse(LabBase):
    lab_code: int
    project_count: Optional[int] = 0
    equipment_count: Optional[int] = 0
    total_equipment_value: Optional[float] = 0.0

class LabDetailResponse(LabResponse):
    projects: List[Any] = []
    equipment: List[Any] = []
