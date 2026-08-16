from sqlalchemy import Column, Integer, String, Date, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.database.connection import Base

class ExamSession(Base):
    __tablename__ = "exam_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)  # Ex: "Semestre 1 - 2025/2026"
    session_type = Column(String, nullable=False)  # semester1, semester2, partial, makeup
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    status = Column(String, default="draft")  # draft, open, closed
    description = Column(String, nullable=True)
    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)
    
    university = relationship("University")