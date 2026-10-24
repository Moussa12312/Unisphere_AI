from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.database.connection import Base

class Room(Base):
    __tablename__ = "rooms"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)  # Ex: "Salle 01", "Amphi A", "Labo 02"
    building = Column(String, nullable=True)  # Ex: "Bloc A", "Campus Principal"
    capacity = Column(Integer, nullable=True)  # Ex: 50
    room_type = Column(String, default="classroom")  # classroom, amphitheater, lab, exam_room
    is_available = Column(Boolean, default=True)
    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)
    
    university = relationship("University")
