from pydantic import BaseModel
from typing import Optional

class TeacherCreate(BaseModel):
    first_name: str
    last_name: str
    email: str
    department: str
    speciality: str
    phone: Optional[str] = None
    photo: Optional[str] = None
    filiere_id: Optional[int] = None
    filieres_interventions: Optional[str] = "ALL"

class TeacherUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    department: Optional[str] = None
    speciality: Optional[str] = None
    phone: Optional[str] = None
    photo: Optional[str] = None
    password: Optional[str] = None
    filiere_id: Optional[int] = None
    filieres_interventions: Optional[str] = None