from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date


class AnnouncementCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    content: str = Field(..., min_length=10)
    category: str = "general"
    priority: str = "normal"
    target_audience: str = "all"
    expires_at: Optional[datetime] = None
    event_date: Optional[date] = None


class AnnouncementUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    is_published: Optional[bool] = None
    target_audience: Optional[str] = None
    expires_at: Optional[datetime] = None
    event_date: Optional[date] = None


class AnnouncementResponse(BaseModel):
    id: int
    title: str
    content: str
    category: str
    priority: str
    is_published: bool
    target_audience: str
    university_id: int
    created_by: int
    published_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    event_date: Optional[date] = None
    created_at: datetime

    class Config:
        from_attributes = True