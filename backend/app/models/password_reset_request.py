from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func

from app.database.connection import Base


class PasswordResetRequest(Base):
    """
    Demande de réinitialisation de mot de passe adressée à l'administration.

    Sécurité : l'utilisateur ne peut JAMAIS changer lui-même son mot de passe
    depuis la page « Mot de passe oublié ». Il envoie un message ; un membre
    habilité de l'administration vérifie son identité puis définit un nouveau
    mot de passe :
      - étudiants / alumni   -> secrétariat OU administration
      - personnel            -> administration uniquement
    """
    __tablename__ = "password_reset_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    university_id = Column(Integer, ForeignKey("universities.id", ondelete="CASCADE"), nullable=True, index=True)
    email = Column(String(255), nullable=False)
    user_role = Column(String(50), nullable=False)
    message = Column(Text, nullable=True)
    # pending, resolved, rejected
    status = Column(String(20), nullable=False, default="pending", index=True)
    handled_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    handled_at = Column(DateTime(timezone=True), nullable=True)
    admin_note = Column(Text, nullable=True)
    requester_ip = Column(String(64), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

