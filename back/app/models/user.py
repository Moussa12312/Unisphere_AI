from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Enum, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.connection import Base
import enum

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    TEACHER = "teacher"
    CENSEUR = "censeur"
    SECRETARY = "secretary"
    ACCOUNTANT = "accountant"
    GUARD = "guard"     
    STUDENT = "student"
    ALUMNI = "alumni"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    role = Column(String, default=UserRole.STUDENT.value) # ✅ Ajouté .value pour être sûr que c'est une string
    
    # ✅ NOUVEAUX CHAMPS AJOUTÉS
    phone = Column(String, nullable=True)
    photo = Column(String, nullable=True)
    last_login = Column(DateTime, nullable=True)

    # ✅ AJOUTÉ : vérification d'email réelle avant activation du compte
    is_email_verified = Column(Boolean, default=False)
    email_verification_token = Column(String, nullable=True)
    last_seen = Column(DateTime, nullable=True)
    is_online = Column(Boolean, default=False)
    
    university_id = Column(Integer, ForeignKey("universities.id"), nullable=True)

    university = relationship("University", back_populates="users")
    recorded_payments = relationship("Payment", foreign_keys="Payment.paid_by", back_populates="payer")
    announcements = relationship("Announcement", back_populates="creator")
    censor_profile = relationship("Censor", back_populates="user", uselist=False)