from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.connection import Base


class Grade(Base):
    __tablename__ = "grades"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    session_id = Column(Integer, ForeignKey("exam_sessions.id"), nullable=False)
    
    # ✅ NOUVEAUX CHAMPS CC + EXAMEN
    cc_score = Column(Float, nullable=True)  # Note Contrôle Continu
    exam_score = Column(Float, nullable=True)  # Note Examen
    cc_coefficient = Column(Float, default=0.3)  # Coefficient CC (30%)
    exam_coefficient = Column(Float, default=0.7)  # Coefficient Examen (70%)
    
    # Note finale calculée automatiquement
    score = Column(Float, nullable=True)
    coefficient = Column(Float, default=1.0)
    status = Column(String, default="draft")  # draft, validated, rejected
    comment = Column(Text, nullable=True)
    
    # Workflow de validation
    validated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    validated_at = Column(DateTime, nullable=True)
    rejected_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    rejected_at = Column(DateTime, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    graded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    student = relationship("Student", back_populates="grades")
    course = relationship("Course", back_populates="grades")
    session = relationship("ExamSession")
    grader = relationship("User", foreign_keys=[graded_by])
    university = relationship("University")

    # ✅ Validation professionnelle stricte du barème (0 à 20/20)
    from sqlalchemy.orm import validates

    @validates("score", "cc_score", "exam_score")
    def validate_score_bounds(self, key, value):
        if value is not None:
            try:
                num = float(value)
            except (TypeError, ValueError):
                raise ValueError(f"Le champ {key} doit être une valeur numérique valide.")
            if num < 0.0:
                raise ValueError(f"La note ({key}: {num}) ne peut pas être négative.")
            if num > 20.0:
                raise ValueError(f"La note ({key}: {num}) ne peut pas dépasser 20/20. Barème académique officiel sur 20 points.")
            return round(num, 2)
        return value