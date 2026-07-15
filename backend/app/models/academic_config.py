from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, Time, DateTime
from sqlalchemy.sql import func
from app.database.connection import Base
from datetime import time


class AcademicConfig(Base):
    __tablename__ = "academic_configs"
    
    id = Column(Integer, primary_key=True, index=True)
    university_id = Column(Integer, ForeignKey("universities.id"), unique=True)
    
    # Notation
    grading_system = Column(String, default="sur_20")
    min_passing_grade = Column(Float, default=10.0)
    max_grade = Column(Float, default=20.0)
    
    # Coefficients
    default_cc_coefficient = Column(Float, default=0.3)
    default_exam_coefficient = Column(Float, default=0.7)
    
    # Options
    allow_compensation = Column(Boolean, default=True)
    allow_makeup_exam = Column(Boolean, default=True)
    min_gpa_to_pass = Column(Float, default=10.0)
    
    # Année académique
    current_academic_year = Column(String, default="2025-2026")
    semester_system = Column(String, default="semestriel")
    
    # ✅ ASSIDUITÉ
    min_attendance_rate = Column(Float, default=75.0)
    
    # ✅ NOUVEAU : Heure limite de présence (défaut 08:30)
    late_threshold_time = Column(Time, default=time(8, 30))
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())