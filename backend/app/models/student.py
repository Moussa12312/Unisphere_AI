from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Date
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

    # ✅ TARIFICATION PARTICULIÈRE & RÉDUCTIONS / BOURSES ACCORDÉES
    discount_amount = Column(Float, default=0.0)             # Montant de la remise (ex: 100000 FCFA)
    discount_percentage = Column(Float, default=0.0)         # Pourcentage de remise (ex: 15.0%)
    discount_reason = Column(String, nullable=True)          # Motif ("Accord verbal Direction", "Bourse sociale", etc.)
    discount_approved_by = Column(String, nullable=True)     # Accordé par ("Direction Générale", etc.)
    net_tuition_amount = Column(Float, nullable=True)        # Frais nets convenus après déduction (ex: 600000 FCFA)

    # ✅ PLAN DE PAIEMENT (Tranches classiques vs Modalité Mensuelle)
    payment_plan = Column(String, default="tranches")        # "tranches" ou "mensuel"
    monthly_deposit = Column(Float, nullable=True)           # Acompte à l'inscription (ex: 350000 FCFA)
    monthly_installment = Column(Float, nullable=True)       # Mensualité (ex: 100000 FCFA)
    monthly_months_count = Column(Integer, default=5)        # Nombre de mois (ex: 5)

    # ✅ CHAMPS : Dossiers étudiants (Nouveau vs Ancien)
    student_type = Column(String, default="new")        # "new" (nouveau) ou "returning" (ancien / réinscription)
    birth_certificate = Column(String, nullable=True)   # Acte de naissance
    previous_diploma = Column(String, nullable=True)    # Diplôme précédent
    id_document = Column(String, nullable=True)         # CNI / Passeport / Carte étudiant
    photo_id = Column(String, nullable=True)            # Photo d'identité d'inscription
    
    # Pièces pour Nouvel Étudiant
    bac_diploma = Column(String, nullable=True)         # Diplôme / Attestation du Bac
    bac_transcript = Column(String, nullable=True)      # Relevé de notes du Bac
    medical_certificate = Column(String, nullable=True) # Certificat médical d'aptitude
    
    # Pièces pour Ancien Étudiant (Réinscription)
    previous_transcript = Column(String, nullable=True) # Relevé de notes N-1
    success_certificate = Column(String, nullable=True) # Attestation de passage / réussite
    financial_clearance = Column(String, nullable=True) # Quitus financier / reçu solde
    reenrollment_form = Column(String, nullable=True)   # Fiche de réinscription signée
    
    file_status = Column(String, default="incomplete")  # "complete", "incomplete", "validated"  

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