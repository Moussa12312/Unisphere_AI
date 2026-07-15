from pydantic import BaseModel
from typing import Optional

class GradeCreate(BaseModel):
    student_id: int
    course_id: int
    value: float
    semester: str
    year: int
    comment: Optional[str] = None

class GradeUpdate(BaseModel):
    value: float
    comment: Optional[str] = None