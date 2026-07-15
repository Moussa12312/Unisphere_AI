from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.connection import Base


class Payment(Base):
    __tablename__ = "payments"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)
    
    amount = Column(Float, nullable=False)
    currency = Column(String, default="FCFA")
    payment_type = Column(String, nullable=False)
    payment_method = Column(String, nullable=False)
    
    reference = Column(String, unique=True, nullable=False)
    receipt_number = Column(String, nullable=True)
    status = Column(String, default="completed")
    description = Column(String, nullable=True)
    
    # ✅ NOUVEAUX CHAMPS
    payment_date = Column(Date, nullable=True)
    paid_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    tranche_id = Column(Integer, ForeignKey("payment_tranches.id"), nullable=True)
    
    # ✅ LIEN VERS TRANCHE (optionnel)
    tranche_id = Column(Integer, ForeignKey("payment_tranches.id"), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    student = relationship("Student", back_populates="payments")
    university = relationship("University")
    payer = relationship("User", foreign_keys=[paid_by])
    tranche = relationship("PaymentTranche", foreign_keys=[tranche_id])