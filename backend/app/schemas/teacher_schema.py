from pydantic import BaseModel
from typing import Optional

class TeacherCreate(BaseModel):
    first_name: str
    last_name: str
    email: str
    department: str
    speciality: str
    phone: Optional[str] = None
    photo: str  # Obligatoire pour la création

class TeacherUpdate(BaseModel):
    first_name: str
    last_name: str
    email: str
    department: str
    speciality: str
    phone: Optional[str] = None
    photo: Optional[str] = None
    password: Optional[str] = None