from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.connection import Base


class AcademicFee(Base):
    """Frais académiques configurés par l'admin (scolarité, inscription, autre)"""
    __tablename__ = "academic_fees"
    
    id = Column(Integer, primary_key=True, index=True)
    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)
    
    # Niveau, Domaine et type
    level = Column(String, nullable=False)  # "L1", "L2", "L3", "M1", "M2"
    domain = Column(String, nullable=True, default=None)  # "Sciences de Gestion", "Sciences & Technologies", etc. (ou None pour tous)
    payment_type = Column(String, nullable=False)  # "scolarite", "inscription", "autre"
    
    # Montant
    amount = Column(Float, nullable=False)
    currency = Column(String, default="FCFA")
    
    # Modalité Mensuelle
    has_monthly_option = Column(Boolean, default=True)
    monthly_deposit = Column(Float, nullable=True)          # Acompte à l'inscription (ex: 350000 FCFA)
    monthly_installment = Column(Float, nullable=True)      # Montant par mois (ex: 100000 FCFA)
    monthly_months_count = Column(Integer, default=5)       # Nombre de mois (ex: 5)
    
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