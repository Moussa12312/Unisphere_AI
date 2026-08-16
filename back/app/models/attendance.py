from sqlalchemy import Column, Integer, String, Date, Time, ForeignKey, DateTime, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.connection import Base


class Attendance(Base):
    __tablename__ = "attendances"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=True)  # ✅ Nullable
    
    # Date et heure
    date = Column(Date, nullable=False)
    check_in_time = Column(Time, nullable=True)
    check_out_time = Column(Time, nullable=True)
    
    # Statut
    status = Column(String, default="present")  # "present", "absent", "late", "excused"
    
    # Méthode de pointage
    method = Column(String, default="manual")  # "qr_code", "manual", "biometric"
    
    # Qui a scanné
    scanned_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Metadata
    university_id = Column(Integer, ForeignKey("universities.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    student = relationship("Student", back_populates="attendances")
    course = relationship("Course")
    university = relationship("University")
    scanner = relationship("User", foreign_keys=[scanned_by])