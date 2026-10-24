from sqlalchemy import Column, Integer, String, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.database.connection import Base

class ExamSchedule(Base):
    __tablename__ = "exam_schedules"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("exam_sessions.id", ondelete="CASCADE"), nullable=False)
    class_id = Column(Integer, ForeignKey("class_rooms.id", ondelete="CASCADE"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    exam_date = Column(Date, nullable=False)  # Date de composition de l'épreuve
    start_time = Column(String, nullable=False)  # Ex: "08:30"
    end_time = Column(String, nullable=False)  # Ex: "10:30"
    room = Column(String, nullable=True)  # Ex: "Salle 01"
    building = Column(String, nullable=True)  # Ex: "Bloc A"
    supervisor_id = Column(Integer, ForeignKey("teachers.id"), nullable=True)
    supervisor_name = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)
    
    session = relationship("ExamSession")
    class_room = relationship("ClassRoom")
    course = relationship("Course")
    supervisor = relationship("Teacher")
    university = relationship("University")
