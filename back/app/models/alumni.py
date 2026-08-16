from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database.connection import Base


class AlumniInvitation(Base):
    """Liens d'invitation générés par l'admin"""
    __tablename__ = "alumni_invitations"

    id = Column(Integer, primary_key=True, index=True)
    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)
    token = Column(String(64), unique=True, nullable=False, index=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    max_uses = Column(Integer, default=100)
    used_count = Column(Integer, default=0)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    university = relationship("University")
    creator = relationship("User")


class AlumniProfile(Base):
    """Profil d'un alumni (ancien étudiant diplômé)"""
    __tablename__ = "alumni_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)

    # Identité
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    photo = Column(String, nullable=True)

    # Parcours académique
    filiere = Column(String, nullable=True)
    domain = Column(String, nullable=True)
    level = Column(String, nullable=True)
    graduation_year = Column(Integer, nullable=True)
    promotion = Column(String, nullable=True)

    # Parcours professionnel
    current_position = Column(String, nullable=True)
    company = Column(String, nullable=True)
    activity_domain = Column(String, nullable=True)
    location = Column(String, nullable=True)
    linkedin_url = Column(String, nullable=True)
    website = Column(String, nullable=True)

    # Histoire & conseils
    career_path = Column(Text, nullable=True)
    difficulties = Column(Text, nullable=True)
    advice = Column(Text, nullable=True)
    skills = Column(Text, nullable=True)

    # Disponibilités
    is_open_to_mentoring = Column(Boolean, default=False)
    is_open_to_internship = Column(Boolean, default=False)

    # Statut
    status = Column(String, default="pending")  # pending, active, rejected
    is_visible = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    accepted_conditions = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", backref="alumni_profile")
    university = relationship("University")


class AlumniConnection(Base):
    """Relations mentor/ami entre étudiant et alumni"""
    __tablename__ = "alumni_connections"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    alumni_id = Column(Integer, ForeignKey("alumni_profiles.id"), nullable=False)
    connection_type = Column(String, default="mentor")  # mentor, directeur_memoire, ami
    status = Column(String, default="pending")  # pending, accepted, rejected
    message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    accepted_at = Column(DateTime(timezone=True), nullable=True)

    student = relationship("Student")
    alumni = relationship("AlumniProfile")


class AlumniMessage(Base):
    """Chat dédié alumni-étudiant"""
    __tablename__ = "alumni_messages"

    id = Column(Integer, primary_key=True, index=True)
    connection_id = Column(Integer, ForeignKey("alumni_connections.id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    connection = relationship("AlumniConnection")
    sender = relationship("User", foreign_keys=[sender_id])
    receiver = relationship("User", foreign_keys=[receiver_id])