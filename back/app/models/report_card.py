from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.connection import Base

class ReportCard(Base):
    __tablename__ = "report_cards"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    session_id = Column(Integer, ForeignKey("exam_sessions.id"), nullable=False)
    average = Column(Float, nullable=True)  # Moyenne générale
    rank = Column(Integer, nullable=True)  # Rang dans la classe
    mention = Column(String, nullable=True)  # Excellent, Très Bien, etc.
    status = Column(String, default="draft")  # draft, validated, published
    total_credits = Column(Integer, default=0)
    obtained_credits = Column(Integer, default=0)
    generated_at = Column(DateTime, server_default=func.now())
    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)
    
    student = relationship("Student")
    session = relationship("ExamSession")
    university = relationship("University")