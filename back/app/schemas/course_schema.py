from pydantic import BaseModel
from typing import Optional

class CourseCreate(BaseModel):
    title: str
    code: Optional[str] = None
    department: Optional[str] = None 
    level: str
    teacher_id: Optional[int] = None
    credits: int = 3
    hours: int = 20
    filiere_id: Optional[int] = None  


class CourseUpdate(BaseModel):
    title: Optional[str] = None
    code: Optional[str] = None
    department: Optional[str] = None
    level: Optional[str] = None
    teacher_id: Optional[int] = None
    credits: Optional[int] = None
    hours: Optional[int] = None
    filiere_id: Optional[int] = None  