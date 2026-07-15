from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.connection import Base

class Message(Base):
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    recipient_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # NULL = message à tous
    subject = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    message_type = Column(String, default="direct")  # direct, broadcast, system
    is_read = Column(Boolean, default=False)
    is_starred = Column(Boolean, default=False)
    is_deleted_sender = Column(Boolean, default=False)
    is_deleted_recipient = Column(Boolean, default=False)
    parent_id = Column(Integer, ForeignKey("messages.id"), nullable=True)  # Pour les réponses
    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    read_at = Column(DateTime, nullable=True)
    
    sender = relationship("User", foreign_keys=[sender_id])
    recipient = relationship("User", foreign_keys=[recipient_id])
    parent = relationship("Message", remote_side=[id])
    university = relationship("University")