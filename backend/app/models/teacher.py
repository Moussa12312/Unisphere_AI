from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.connection import Base

class Teacher(Base):
    __tablename__ = "teachers"
    __table_args__ = (
        UniqueConstraint('user_id', 'university_id', name='uq_teacher_user_university'),
        UniqueConstraint('email', 'university_id', name='uq_teacher_email_university'),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, nullable=False, index=True)
    department = Column(String, nullable=False)  
    speciality = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    photo = Column(String, nullable=True)
    qr_code = Column(String, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False, index=True)
    university_name = Column(String, nullable=True)
    filiere_id = Column(Integer, ForeignKey("filieres.id"), nullable=True)  

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    courses = relationship("Course", back_populates="teacher")
    filiere = relationship("Filiere")  
    classes = relationship("ClassRoom", back_populates="main_teacher")
