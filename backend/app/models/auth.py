from typing import Optional
from pydantic import BaseModel, EmailStr

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str  # 'Admin', 'Lab Manager', 'Researcher'
    is_active: int = 1
    researcher_id: Optional[int] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[int] = None
    researcher_id: Optional[int] = None
    password: Optional[str] = None

class UserResponse(UserBase):
    user_id: int
    created_at: Optional[str] = None
    researcher_name: Optional[str] = None

TokenResponse.model_rebuild()
