from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.connection import Base


class ScanSession(Base):
    __tablename__ = "scan_sessions"

    id = Column(Integer, primary_key=True, index=True)
    token = Column(String(64), unique=True, nullable=False, index=True)
    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)
    
    # Lien avec l'étudiant (null si nouvelle inscription)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=True)
    
    # Créateur de la session
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Destinataire
    recipient_email = Column(String, nullable=False)
    recipient_name = Column(String, nullable=True)
    
    # Type de session
    session_type = Column(String, default="document_scan")  # document_scan, photo_id
    
    # Statut
    status = Column(String, default="pending")  # pending, active, completed, expired, cancelled
    
    # Métadonnées
    student_name = Column(String, nullable=True)  # Nom affiché (pour nouvelle inscription)
    student_level = Column(String, nullable=True)
    student_filiere = Column(String, nullable=True)
    
    # Documents scannés
    documents = Column(JSON, default=list)  # Liste de {type, filename, path, ocr_data}
    
    # Données OCR extraites
    ocr_extracted_data = Column(JSON, nullable=True)
    
    # Timestamps
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relations
    university = relationship("University")
    student = relationship("Student")
    creator = relationship("User")