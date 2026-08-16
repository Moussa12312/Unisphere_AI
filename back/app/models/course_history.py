from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.connection import Base

class CourseHistory(Base):
    __tablename__ = "course_history"
    
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    action = Column(String, nullable=False)  # "created", "updated", "teacher_changed"
    field_changed = Column(String, nullable=True)  # "teacher_id", "hours", "title"
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    user_name = Column(String, nullable=False)  # Qui a fait la modification
    created_at = Column(DateTime, default=datetime.utcnow)
    
    course = relationship("Course", back_populates="history")