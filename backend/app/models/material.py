from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.connection import Base


class Material(Base):
    __tablename__ = "materials"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(50), nullable=False)  # pdf, docx, pptx, video, image, zip
    file_size = Column(Integer, default=0)  # en bytes
    original_name = Column(String(255), nullable=True)
    
    # Relations
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=True)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=False)
    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)
    
    # Metadata
    visibility = Column(String(20), default="students")  # students, public, teachers_only
    download_count = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    course = relationship("Course")
    teacher = relationship("Teacher")
    university = relationship("University")