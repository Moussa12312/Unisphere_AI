from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.connection import Base


class AcademicFee(Base):
    """Frais académiques configurés par l'admin (scolarité, inscription, autre)"""
    __tablename__ = "academic_fees"
    
    id = Column(Integer, primary_key=True, index=True)
    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)
    
    # Niveau et type
    level = Column(String, nullable=False)  # "L1", "L2", "L3", "M1", "M2"
    payment_type = Column(String, nullable=False)  # "scolarite", "inscription", "autre"
    
    # Montant
    amount = Column(Float, nullable=False)
    currency = Column(String, default="FCFA")
    
    # Année académique
    academic_year = Column(String, nullable=False)  # "2025-2026"
    
    # Verrouillage (si déjà appliqué à des étudiants)
    is_locked = Column(Boolean, default=False)
    locked_count = Column(Integer, default=0)  # Nombre d'étudiants utilisant cette config
    
    # Metadata
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    university = relationship("University")
    creator = relationship("User")