from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.connection import Base

class CertificateRequest(Base):
    __tablename__ = "certificate_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    request_type = Column(String, nullable=False)  # Ex: "Attestation de scolarité"
    status = Column(String, default="pending")     # pending, approved, rejected
    file_path = Column(String, nullable=True)      # Chemin du PDF généré
    rejection_reason = Column(String, nullable=True)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationship
    student = relationship("Student", backref="certificate_requests")