from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.connection import Base


class TeachingUnit(Base):
    """
    Unité d'Enseignement (UE) du système LMD.
    Regroupe plusieurs matières / éléments constitutifs (ECUE).
    Dans le système LMD :
    - Une année = 2 semestres = 60 crédits ECTS (30 crédits par semestre).
    - Une UE regroupe 1 à 4 cours et confère un nombre déterminé de crédits ECTS (ex: 4, 6, 8).
    - Catégories : Fondamentale, Méthodologique, Transversale, Découverte.
    """
    __tablename__ = "teaching_units"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), nullable=False, index=True)  # Ex: "UE-INF101"
    name = Column(String(200), nullable=False)            # Ex: "Algorithmique & Structures de Données"
    credits = Column(Integer, default=6, nullable=False)   # ECTS (ex: 6)
    category = Column(String(50), default="Fondamentale") # Fondamentale, Méthodologique, Transversale, Découverte
    semester = Column(String(10), default="S1")           # S1, S2, S3, S4, S5, S6
    level = Column(String(20), default="L1")              # L1, L2, L3, M1, M2, Doctorat
    description = Column(Text, nullable=True)

    filiere_id = Column(Integer, ForeignKey("filieres.id"), nullable=True)
    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relations
    university = relationship("University")
    filiere = relationship("Filiere")
    courses = relationship("Course", back_populates="teaching_unit")
