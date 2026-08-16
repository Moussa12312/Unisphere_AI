from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.connection import Base


class Censor(Base):
    __tablename__ = "censors"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(50), nullable=True)
    department = Column(String(100), nullable=True)
    employee_id = Column(String(50), unique=True, nullable=True)
    photo = Column(String(500), nullable=True)
    status = Column(String(20), default="active")
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=True)
    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="censor_profile")
    university = relationship("University", back_populates="censors")

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    def __repr__(self):
        return f"<Censor {self.employee_id}>"
