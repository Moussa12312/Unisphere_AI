from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.database.connection import Base

class PaymentReminder(Base):
    __tablename__ = "payment_reminders"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False, index=True)
    
    # Canal : sms, whatsapp, internal
    channel = Column(String(20), default="sms", nullable=False)
    # Cible : student, parent, both
    target = Column(String(20), default="student", nullable=False)
    
    recipient_phone = Column(String(50), nullable=True)
    recipient_name = Column(String(150), nullable=True)
    amount_due = Column(Float, default=0.0)
    message = Column(Text, nullable=False)
    
    # Statut : sent, delivered, failed, simulated
    status = Column(String(20), default="sent", nullable=False)
    
    sent_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

