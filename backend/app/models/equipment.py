from typing import Optional
from pydantic import BaseModel, Field

class EquipmentBase(BaseModel):
    equipment_name: str = Field(..., min_length=2, max_length=100)
    equipment_type: Optional[str] = Field(None, max_length=100)
    purchase_date: Optional[str] = None  # YYYY-MM-DD
    equipment_cost: float = Field(0.0, ge=0.0)
    availability_status: Optional[str] = Field("Available", max_length=30)
    lab_code: int

class EquipmentCreate(EquipmentBase):
    equipment_id: Optional[int] = None

class EquipmentUpdate(BaseModel):
    equipment_name: Optional[str] = Field(None, min_length=2, max_length=100)
    equipment_type: Optional[str] = Field(None, max_length=100)
    purchase_date: Optional[str] = None
    equipment_cost: Optional[float] = Field(None, ge=0.0)
    availability_status: Optional[str] = Field(None, max_length=30)
    lab_code: Optional[int] = None

class EquipmentResponse(EquipmentBase):
    equipment_id: int
    lab_name: Optional[str] = None
    discipline: Optional[str] = None
    lab_location: Optional[str] = None
