from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database.connection import Base

class Filiere(Base):
    __tablename__ = "filieres"
    
    id = Column(Integer, primary_key=True, index=True)
    domain = Column(String, nullable=False)       # Ex: "Informatique", "Mines et Géologie"
    name = Column(String, nullable=False)         # Ex: "Génie Logiciel", "Géologie Appliquée"
    levels = Column(String, nullable=False)       # Ex: "L1, L2, L3, M1, M2" (séparé par des virgules)
    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)
    classes = relationship("ClassRoom", back_populates="filiere")