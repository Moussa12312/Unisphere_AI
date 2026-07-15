from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.connection import Base


class Incident(Base):
    __tablename__ = "incidents"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    incident_type = Column(String(100), nullable=False)  # violence, vol, vandalisme, etc.
    severity = Column(String(20), default="medium")  # low, medium, high, critical
    location = Column(String(255), nullable=True)
    status = Column(String(20), default="open")  # open, in_progress, resolved, closed
    photo = Column(String(255), nullable=True)
    
    # Relations
    student_id = Column(Integer, ForeignKey("students.id"), nullable=True)
    reported_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    reporter = relationship("User", foreign_keys=[reported_by])
    student = relationship("Student")
    university = relationship("University")