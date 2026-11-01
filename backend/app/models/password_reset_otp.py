from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database.connection import Base

class PasswordResetOTP(Base):
    __tablename__ = "password_reset_otps"

    id = Column(Integer, primary_key=True, index=True)
    identifier = Column(String(255), nullable=False, index=True)  # Email ou Numéro de téléphone
    otp_code_hash = Column(String(255), nullable=False)           # Hash sécurisé du code à 6 chiffres
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    attempts = Column(Integer, default=0)                         # Compteur de tentatives (max 5)
    is_used = Column(Boolean, default=False)
    channel = Column(String(50), default="email")                 # "email", "sms", "whatsapp"
    created_at = Column(DateTime(timezone=True), server_default=func.now())

