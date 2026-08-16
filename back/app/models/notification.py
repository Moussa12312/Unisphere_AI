from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.connection import Base


class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    
    # Type de notification
    notification_type = Column(String(50), nullable=False, default="general")
    
    # Type visuel (info, success, warning, error)
    type = Column(String(20), default="info")
    
    # Rôles ciblés (liste JSON)
    target_roles = Column(JSON, nullable=True)
    
    # ID de l'utilisateur destinataire (optionnel)
    recipient_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Métadonnées
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime, nullable=True)
    
    # ✅ RENOMMÉ : extra_data au lieu de metadata
    # Le nom de colonne SQL reste "metadata" pour compatibilité
    extra_data = Column("metadata", JSON, nullable=True)
    
    # Université
    university_id = Column(Integer, ForeignKey("universities.id"), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    recipient = relationship("User", foreign_keys=[recipient_id])