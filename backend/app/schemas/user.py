from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    phone: Optional[str] = None
    role: str


class UserCreate(UserBase):
    password: str = Field(..., min_length=6)
    university_name: str = Field(..., min_length=2)
    role: str = "admin"


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    avatar: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict


class UserResponse(BaseModel):
    id: int
    full_name: str
    email: str
    role: str
    phone: Optional[str] = None
    avatar: Optional[str] = None
    is_active: bool
    university_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class PasswordChange(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=6)