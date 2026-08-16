from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.database.connection import Base


class PaymentDeadline(Base):
    __tablename__ = "payment_deadlines"
    
    id = Column(Integer, primary_key=True, index=True)
    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)
    academic_year = Column(String, nullable=False)
    deadline_type = Column(String, nullable=False)  # ex: "exams_s2", "inscription", "scolarite"
    deadline_date = Column(Date, nullable=False)
    amount = Column(Float, nullable=True)
    description = Column(String, nullable=True)
    
    created_at = Column(String, nullable=True)
    updated_at = Column(String, nullable=True)
    
    # Relationships
    university = relationship("University", back_populates="payment_deadlines")