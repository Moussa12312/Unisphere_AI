from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Date
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.connection import Base


class Student(Base):
    __tablename__ = "students"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # ✅ Infos personnelles
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    date_of_birth = Column(Date, nullable=True)
    place_of_birth = Column(String, nullable=True)
    gender = Column(String, nullable=True)
    nationality = Column(String, nullable=True)
    
    # ✅ Contact
    phone = Column(String, nullable=True)
    address = Column(String, nullable=True)
    
    # ✅ Académique
    filiere = Column(String)
    level = Column(String)
    domain = Column(String, nullable=True)  # ✅ AJOUTÉ
    matricule = Column(String, unique=True)
    
    # ✅ Parent/Tuteur
    parent_name = Column(String, nullable=True)
    parent_phone = Column(String, nullable=True)
    parent_email = Column(String, nullable=True)
    
    # Système
    qr_code = Column(String, nullable=True)
    photo = Column(String, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    university_id = Column(Integer, ForeignKey("universities.id"))
    university_name = Column(String, default="UniSphere AI")
    status = Column(String, default="active")  # ✅ AJOUTÉ
    
    locked_fee_id = Column(Integer, ForeignKey("academic_fees.id"), nullable=True)

    # ✅ NOUVEAUX CHAMPS : Dossiers étudiants
    birth_certificate = Column(String, nullable=True)   
    previous_diploma = Column(String, nullable=True)    
    id_document = Column(String, nullable=True)         
    photo_id = Column(String, nullable=True)            
    file_status = Column(String, default="incomplete")  

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    university = relationship("University", back_populates="students")
    grades = relationship("Grade", back_populates="student")
    payments = relationship("Payment", back_populates="student", cascade="all, delete")
    attendances = relationship("Attendance", back_populates="student", cascade="all, delete")
    locked_fee = relationship("AcademicFee")
    class_room_id = Column(Integer, ForeignKey("class_rooms.id"), nullable=True)
    class_room = relationship("ClassRoom", back_populates="students")