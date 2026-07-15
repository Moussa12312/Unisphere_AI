from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class CensorBase(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr


class CensorCreate(CensorBase):
    phone: Optional[str] = None
    department: Optional[str] = None


class CensorUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    status: Optional[str] = None


class CensorResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    department: Optional[str] = None
    employee_id: Optional[str] = None
    photo: Optional[str] = None
    status: str
    university_id: int
    created_at: datetime

    class Config:
        from_attributes = True

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"