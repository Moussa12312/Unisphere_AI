from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime


class AttendanceCreate(BaseModel):
    student_id: int
    course_id: Optional[int] = None
    date: date
    status: str = "present"
    method: str = "manual"
    notes: Optional[str] = None


class AttendanceResponse(BaseModel):
    id: int
    student_id: int
    student_name: Optional[str] = None
    course_id: Optional[int] = None
    date: date
    status: str
    check_in_time: Optional[datetime] = None
    method: str
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AttendanceStats(BaseModel):
    total_present: int
    total_absent: int
    total_late: int
    total_excused: int
    attendance_rate: float
    by_date: dict