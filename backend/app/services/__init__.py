from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Time
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.base import Base


class Schedule(Base):
    __tablename__ = "schedules"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=False)
    day_of_week = Column(String(20), nullable=False)  # Monday, Tuesday, etc.
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    room = Column(String(100), nullable=True)
    building = Column(String(100), nullable=True)
    session_type = Column(String(50), default="lecture")  # lecture, tutorial, lab
    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    course = relationship("Course", back_populates="schedules")
    teacher = relationship("Teacher", back_populates="schedules")
    university = relationship("University")

    def __repr__(self):
        return f"<Schedule {self.course_id} on {self.day_of_week}>"