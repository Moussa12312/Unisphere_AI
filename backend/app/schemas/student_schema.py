from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import date, datetime


class StudentBase(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    filiere: str = Field(..., min_length=1)
    level: str = Field(..., min_length=1)
    photo: str


class StudentCreate(StudentBase):
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    place_of_birth: Optional[str] = None
    address: Optional[str] = None
    gender: Optional[str] = None
    enrollment_date: Optional[date] = None


class StudentUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    filiere: Optional[str] = None
    level: Optional[str] = None
    address: Optional[str] = None
    status: Optional[str] = None
    date_of_birth: Optional[date] = None
    place_of_birth: Optional[str] = None
    gender: Optional[str] = None
    photo: Optional[str] = None 


class StudentResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    place_of_birth: Optional[str] = None
    address: Optional[str] = None
    gender: Optional[str] = None
    filiere: str
    level: str
    matricule: str
    qr_code: Optional[str] = None
    photo: Optional[str] = None
    status: str
    university_id: int
    university_name: Optional[str] = None
    enrollment_date: Optional[date] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"


class StudentStats(BaseModel):
    total: int
    by_filiere: dict
    by_level: dict
    by_status: dict
    new_this_month: int