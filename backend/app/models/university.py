from sqlalchemy import Column, Integer, String, DateTime, JSON, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.connection import Base

class University(Base):
    __tablename__ = "universities"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=True)
    email = Column(String, nullable=True)
    country = Column(String, nullable=True)
    address = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    logo = Column(String, nullable=True)
    slogan = Column(String, nullable=True)
    
    website = Column(String, nullable=True)
    description = Column(String, nullable=True)
    established_year = Column(String, nullable=True)
    rector_name = Column(String, nullable=True)
    academic_year = Column(String, nullable=True)
    
    # ✅ NOUVEAU : Configuration dynamique de la carte étudiant (JSON) & Statut d'accès
    card_config = Column(JSON, nullable=True)
    is_active = Column(Boolean, default=True)
    status = Column(String, default="active")  # active, suspended
    custom_domain = Column(String, nullable=True, unique=True)
    institution_type = Column(String, nullable=True)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # RELATIONSHIPS
    users = relationship("User", back_populates="university")
    students = relationship("Student", back_populates="university")
    courses = relationship("Course", back_populates="university")
    payment_deadlines = relationship("PaymentDeadline", back_populates="university")
    classes = relationship("ClassRoom", back_populates="university")
    announcements = relationship("Announcement", back_populates="university")
    censors = relationship("Censor", back_populates="university")