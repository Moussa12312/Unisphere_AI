"""
UniSphere AI - Modèle d'Historique Académique Étudiant
Conserve la trace de chaque année universitaire passée par un étudiant,
son niveau, sa moyenne annuelle et la décision du jury.
"""

from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.connection import Base


class StudentAcademicHistory(Base):
    __tablename__ = "student_academic_histories"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False, index=True)
    academic_year = Column(String, nullable=False, index=True)  # ex: "2026-2027"
    filiere = Column(String, nullable=False)
    level = Column(String, nullable=False)                      # ex: "L1", "L2", "L3", "M1", "M2"

    annual_average = Column(Float, nullable=True)               # Moyenne annuelle finale
    credits_obtained = Column(Integer, default=0)               # Crédits ECTS validés
    total_credits = Column(Integer, default=60)
    decision = Column(String, default="admis")                  # "admis", "redouble", "diplome", "exclu", "en_cours"
    promoted_to_level = Column(String, nullable=True)           # Niveau attribué suite à la bascule
    
    notes = Column(Text, nullable=True)                         # Mention ou remarque
    is_archived = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    student = relationship("Student")
    university = relationship("University")
