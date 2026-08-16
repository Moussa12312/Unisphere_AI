from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.connection import Base

class Course(Base):
    __tablename__ = "courses"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    code = Column(String, unique=True, nullable=False)
    department = Column(String, nullable=False)
    level = Column(String, nullable=False)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=True)
    credits = Column(Integer, default=3)
    hours = Column(Integer, default=20)
    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)
    filiere_id = Column(Integer, ForeignKey("filieres.id"), nullable=True)  

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    university = relationship("University", back_populates="courses")
    teacher = relationship("Teacher", back_populates="courses")
    grades = relationship("Grade", back_populates="course", cascade="all, delete-orphan")
    filiere = relationship("Filiere")  
    history = relationship("CourseHistory", back_populates="course", cascade="all, delete-orphan")