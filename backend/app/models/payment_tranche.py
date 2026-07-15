from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.connection import Base

class PaymentTranche(Base):
    """Tranches de paiement configurées par l'admin"""
    __tablename__ = "payment_tranches"
    
    id = Column(Integer, primary_key=True, index=True)
    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)
    
    # Niveau et type de paiement
    level = Column(String, nullable=False)  # "L1", "L2", "L3", "M1", "M2"
    payment_type = Column(String, nullable=False)  # "scolarite", "inscription", "autre"
    academic_year = Column(String, nullable=False)  # "2025-2026"
    
    # Configuration des tranches
    tranche_number = Column(Integer, nullable=False)  # 1, 2, 3...
    tranche_name = Column(String, nullable=False)  # "1ère tranche", "2ème tranche"...
    percentage = Column(Float, nullable=False)  # Pourcentage du montant total (ex: 30.0 pour 30%)
    amount = Column(Float, nullable=False)  # Montant calculé automatiquement
    due_date = Column(DateTime, nullable=True)  # Date limite pour cette tranche
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    university = relationship("University")