from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.connection import Base

class Teacher(Base):
    __tablename__ = "teachers"
    
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    department = Column(String, nullable=False)  
    speciality = Column(String, nullable=False)
    phone = Column(String)
    photo = Column(String)
    qr_code = Column(String)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)
    university_name = Column(String)
    filiere_id = Column(Integer, ForeignKey("filieres.id"), nullable=True)  

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    courses = relationship("Course", back_populates="teacher")
    filiere = relationship("Filiere")  
    classes = relationship("ClassRoom", back_populates="main_teacher")