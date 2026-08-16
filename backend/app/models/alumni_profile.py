from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Date
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.connection import Base


class AlumniProfile(Base):
    __tablename__ = "alumni_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)
    
    # Lien avec l'ancien dossier étudiant (optionnel)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=True)

    # ==========================================
    # INFORMATIONS ACADÉMIQUES
    # ==========================================
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    photo = Column(String, nullable=True)
    
    filiere = Column(String, nullable=True)          # Ex: "Informatique"
    domain = Column(String, nullable=True)            # Ex: "Sciences & Technologies"
    level = Column(String, nullable=True)             # Dernier niveau: "L3", "M2"
    graduation_year = Column(Integer, nullable=True)  # Année de diplomation: 2023
    promotion = Column(String, nullable=True)         # Nom de la classe/promotion

    # ==========================================
    # PARCOURS PROFESSIONNEL
    # ==========================================
    current_position = Column(String, nullable=True)   # Poste actuel
    company = Column(String, nullable=True)            # Entreprise
    activity_domain = Column(String, nullable=True)    # Domaine d'activité
    location = Column(String, nullable=True)           # Ville/Pays
    linkedin_url = Column(String, nullable=True)       # LinkedIn
    website = Column(String, nullable=True)            # Site personnel

    # ==========================================
    # HISTOIRE & CONSEILS (visible par étudiants)
    # ==========================================
    career_path = Column(Text, nullable=True)          # Parcours professionnel
    difficulties = Column(Text, nullable=True)         # Difficultés rencontrées
    advice = Column(Text, nullable=True)               # Conseils aux étudiants
    skills = Column(Text, nullable=True)               # Compétences clés (séparées par virgule)

    # ==========================================
    # STATUT & VISIBILITÉ
    # ==========================================
    is_visible = Column(Boolean, default=True)         # Visible par les étudiants
    is_verified = Column(Boolean, default=False)       # Vérifié par l'admin
    is_open_to_mentoring = Column(Boolean, default=False)  # Accepte le mentorat
    is_open_to_internship = Column(Boolean, default=False) # Propose des stages

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", backref="alumni_profile")
    university = relationship("University")
    student = relationship("Student")