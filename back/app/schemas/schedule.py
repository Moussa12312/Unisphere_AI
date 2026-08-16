from pydantic import BaseModel, Field
from typing import Optional
from datetime import time, datetime


class ScheduleBase(BaseModel):
    course_id: int
    teacher_id: int
    day_of_week: str = Field(..., pattern="^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$")
    start_time: time
    end_time: time


class ScheduleCreate(ScheduleBase):
    room: Optional[str] = None
    building: Optional[str] = None
    session_type: str = "lecture"


class ScheduleUpdate(BaseModel):
    course_id: Optional[int] = None
    teacher_id: Optional[int] = None
    day_of_week: Optional[str] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    room: Optional[str] = None
    building: Optional[str] = None
    session_type: Optional[str] = None


class ScheduleResponse(BaseModel):
    id: int
    course_id: int
    course_name: Optional[str] = None
    teacher_id: int
    teacher_name: Optional[str] = None
    day_of_week: str
    start_time: time
    end_time: time
    room: Optional[str] = None
    building: Optional[str] = None
    session_type: str
    university_id: int
    created_at: datetime

    class Config:
        from_attributes = True