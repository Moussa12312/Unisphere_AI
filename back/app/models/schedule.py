from sqlalchemy import Column, Integer, String, ForeignKey, Time
from sqlalchemy.orm import relationship
from app.database.connection import Base

class Schedule(Base):
    __tablename__ = "schedules"
    
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    class_id = Column(Integer, ForeignKey("class_rooms.id"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=False)
    room = Column(String, nullable=True)
    building = Column(String, nullable=True)
    day_of_week = Column(String, nullable=False)  # Lundi, Mardi, etc.
    start_time = Column(String, nullable=False)  # "08:00"
    end_time = Column(String, nullable=False)    # "10:00"
    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)
    
    course = relationship("Course")
    class_room = relationship("ClassRoom")
    teacher = relationship("Teacher")
    university = relationship("University")