from sqlalchemy import Column, Integer, String, Date, Time, ForeignKey, DateTime, Boolean, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.connection import Base


class Attendance(Base):
    __tablename__ = "attendances"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=True)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=True)
    schedule_id = Column(Integer, ForeignKey("schedules.id"), nullable=True)  # Lien vers le créneau horaire
    
    # Date et heure
    date = Column(Date, nullable=False)
    check_in_time = Column(Time, nullable=True)
    check_out_time = Column(Time, nullable=True)
    expected_start_time = Column(String, nullable=True)  # Heure de début du cours prévue (ex: "08:00")
    expected_end_time = Column(String, nullable=True)    # Heure de fin du cours prévue (ex: "10:00")
    
    # Statut
    status = Column(String, default="present")  # "present", "absent", "late", "excused"
    
    # Retard en minutes (pour les profs surtout)
    late_minutes = Column(Integer, default=0)  # Minutes de retard
    effective_hours = Column(Float, nullable=True)  # Heures effectives (heures assignées - retard)
    
    # Type de pointage : étudiant ou enseignant
    attendance_type = Column(String, default="student")  # "student" ou "teacher"
    
    # Méthode de pointage
    method = Column(String, default="manual")  # "qr_code", "manual", "biometric", "teacher_appel"
    
    # Qui a scanné
    scanned_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Commentaire / justification
    comment = Column(String, nullable=True)
    
    # Metadata
    university_id = Column(Integer, ForeignKey("universities.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    student = relationship("Student", back_populates="attendances")
    teacher = relationship("Teacher")
    course = relationship("Course")
    schedule = relationship("Schedule")
    university = relationship("University")
    scanner = relationship("User", foreign_keys=[scanned_by])