from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.connection import Base


class PaymentInstallment(Base):
    """Échéances de paiement (reliquats)"""
    __tablename__ = "payment_installments"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Lien vers le paiement principal
    payment_id = Column(Integer, ForeignKey("payments.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    
    # Montants
    amount_due = Column(Float, nullable=False)  # Montant dû pour cette échéance
    amount_paid = Column(Float, default=0.0)  # Montant déjà payé
    balance = Column(Float, nullable=False)  # Reliquat = amount_due - amount_paid
    
    # Numéro d'échéance
    installment_number = Column(Integer, nullable=False)  # 1, 2, 3...
    total_installments = Column(Integer, nullable=False)  # Total d'échéances (ex: 3)
    
    # Dates
    due_date = Column(DateTime, nullable=False)  # Date limite
    paid_at = Column(DateTime, nullable=True)  # Date de paiement
    
    # Statut
    status = Column(String, default="pending")
    # "pending" : en attente
    # "partial" : partiellement payé
    # "completed" : payé
    # "overdue" : en retard
    
    # Blocage examens
    is_exam_blocked = Column(Boolean, default=False)
    
    # Description
    description = Column(String, nullable=True)
    
    # Metadata
    university_id = Column(Integer, ForeignKey("universities.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    payment = relationship("Payment", backref="installments")
    student = relationship("Student")
    university = relationship("University")