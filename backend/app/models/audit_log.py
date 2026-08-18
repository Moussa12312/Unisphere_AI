from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from app.database.connection import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    action = Column(String, nullable=False)  # Ex: "Connexion réussie"
    user_email = Column(String, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    status = Column(String, default="success")  # success, failure, warning
    details = Column(Text, nullable=True)  # Détails JSON
    university_id = Column(Integer, ForeignKey("universities.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class SecuritySetting(Base):
    __tablename__ = "security_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False, unique=True)
    two_factor_enabled = Column(Integer, default=0)  # 0 ou 1
    password_expiry_days = Column(Integer, default=90)
    password_expiry_enabled = Column(Integer, default=1)
    session_timeout_minutes = Column(Integer, default=30)
    max_login_attempts = Column(Integer, default=5)
    ip_whitelist_enabled = Column(Integer, default=0)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())