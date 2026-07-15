from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database.connection import Base

class ClassRoom(Base):
    __tablename__ = "class_rooms"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    filiere_id = Column(Integer, ForeignKey("filieres.id"), nullable=True)
    level = Column(String, nullable=False)
    room = Column(String, nullable=True)
    building = Column(String, nullable=True)
    capacity = Column(Integer, nullable=True)
    academic_year = Column(String, nullable=True)
    main_teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=True)
    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)
    
    filiere = relationship("Filiere", back_populates="classes")
    main_teacher = relationship("Teacher", back_populates="classes")
    university = relationship("University", back_populates="classes")
    students = relationship("Student", back_populates="class_room")