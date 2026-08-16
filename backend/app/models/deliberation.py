from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.connection import Base


class DeliberationRule(Base):
    """
    ✅ AJOUTÉ : règle de validation utilisée pendant les délibérations
    (ex: moyenne minimale requise, nombre maximum de matières en échec).
    """
    __tablename__ = "deliberation_rules"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    filiere = Column(String, nullable=True)   # Vide = s'applique à toutes les filières
    level = Column(String, nullable=True)     # Vide = s'applique à tous les niveaux

    min_average = Column(Float, default=10.0)         # Moyenne minimale pour admission directe
    max_failed_courses = Column(Integer, default=2)   # Nb max de matières en échec tolérées pour un rattrapage
    catchup_min_average = Column(Float, default=8.0)  # Moyenne min pour passer en rattrapage (sinon redoublement)

    is_active = Column(Integer, default=1)  # 1 = actif, 0 = désactivé
    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    university = relationship("University")


class DeliberationSession(Base):
    """✅ AJOUTÉ : session de jury de délibération pour une filière/niveau donnés."""
    __tablename__ = "deliberation_sessions"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    filiere = Column(String, nullable=False)
    level = Column(String, nullable=False)
    academic_year = Column(String, nullable=False)
    session_date = Column(DateTime, nullable=True)

    status = Column(String, default="draft")  # draft, in_progress, completed
    jury_members = Column(Text, nullable=True)  # Noms des membres du jury (texte libre)
    rule_id = Column(Integer, ForeignKey("deliberation_rules.id"), nullable=True)

    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    completed_at = Column(DateTime, nullable=True)

    rule = relationship("DeliberationRule")
    university = relationship("University")
    decisions = relationship("DeliberationDecision", back_populates="session", cascade="all, delete-orphan")


class DeliberationDecision(Base):
    """✅ AJOUTÉ : décision individuelle prise pour un étudiant lors d'une session."""
    __tablename__ = "deliberation_decisions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("deliberation_sessions.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)

    average = Column(Float, nullable=True)
    failed_courses_count = Column(Integer, default=0)

    decision = Column(String, default="pending")  # pending, admis, rattrapage, redouble, exclu
    comment = Column(Text, nullable=True)

    created_at = Column(DateTime, server_default=func.now())

    session = relationship("DeliberationSession", back_populates="decisions")
    student = relationship("Student")
