from sqlalchemy import Column, Integer, String, DateTime, Date, ForeignKey, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.connection import Base

class Announcement(Base):
    __tablename__ = "announcements"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    content = Column(String, nullable=False)
    category = Column(String, nullable=False)
    priority = Column(String, default="normal")
    target_audience = Column(String, default="all")
    is_published = Column(Boolean, default=True)
    published_at = Column(DateTime, server_default=func.now())
    expires_at = Column(DateTime, nullable=True)
    event_date = Column(Date, nullable=True)  # ✅ Date de l'événement
    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Relations
    university = relationship("University", back_populates="announcements")
    creator = relationship("User", back_populates="announcements")