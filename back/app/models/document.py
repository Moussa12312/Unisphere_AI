from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.connection import Base

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    document_type = Column(String, nullable=False)  # enrollment_certificate, transcript, grade_certificate, course_material
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    file_path = Column(String, nullable=True)  # Pour les uploads
    student_id = Column(Integer, ForeignKey("students.id"), nullable=True)
    generated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)
    is_downloaded = Column(Boolean, default=False)
    download_count = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
    
    student = relationship("Student")
    generator = relationship("User", foreign_keys=[generated_by])
    university = relationship("University")