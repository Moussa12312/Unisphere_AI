from pydantic import BaseModel
from typing import Optional

class CourseCreate(BaseModel):
    title: str
    code: Optional[str] = None
    department: Optional[str] = None 
    level: str
    semester: Optional[str] = None
    is_common_core: Optional[bool] = False
    common_core_filieres: Optional[str] = None
    teacher_id: Optional[int] = None
    credits: int = 3
    hours: int = 20
    filiere_id: Optional[int] = None  
    teaching_unit_id: Optional[int] = None


class CourseUpdate(BaseModel):
    title: Optional[str] = None
    code: Optional[str] = None
    department: Optional[str] = None
    level: Optional[str] = None
    semester: Optional[str] = None
    is_common_core: Optional[bool] = None
    common_core_filieres: Optional[str] = None
    teacher_id: Optional[int] = None
    credits: Optional[int] = None
    hours: Optional[int] = None
    filiere_id: Optional[int] = None  
    teaching_unit_id: Optional[int] = None