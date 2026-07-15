from dotenv import load_dotenv
load_dotenv()
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.database.connection import Base, engine

# Import des modèles
from app.models.university import University
from app.models.user import User
from app.models.student import Student
from app.models.course import Course
from app.models.grade import Grade
from app.models.attendance import Attendance
from app.models.teacher import Teacher
from app.models.filiere import Filiere
from app.models.notification import Notification
from app.models.message import Message
from app.models.payment import Payment
from app.models.academic_fee import AcademicFee
from app.models.payment_deadline import PaymentDeadline
from app.models.payment_installment import PaymentInstallment
from app.models.payment_tranche import PaymentTranche
from app.models.material import Material 



from app.database.connection import SessionLocal
from app.models.filiere import Filiere

def create_default_filieres():
    """Crée les filières par défaut au démarrage"""
    db = SessionLocal()
    try:
        # Vérifier si le tronc commun existe déjà
        tronc = db.query(Filiere).filter(
            Filiere.name == "Tronc commun",
            Filiere.domain == "Tronc commun"
        ).first()
        
        if not tronc:
            # Créer le tronc commun pour chaque université existante
            from app.models.university import University
            universities = db.query(University).all()
            
            for university in universities:
                new_tronc = Filiere(
                    name="Tronc commun",
                    domain="Tronc commun",
                    levels="L1",
                    description="Tronc commun obligatoire pour tous les étudiants de L1",
                    university_id=university.id
                )
                db.add(new_tronc)
            
            db.commit()
            print(f"✅ Filière 'Tronc commun' créée pour {len(universities)} université(s)")
        else:
            print("✅ Filière 'Tronc commun' existe déjà")
            
    except Exception as e:
        print(f"❌ Erreur création tronc commun: {e}")
        db.rollback()
    finally:
        db.close()

# ✅ Appeler la fonction au démarrage
create_default_filieres()


# Créer les tables
Base.metadata.create_all(bind=engine)

import os
os.makedirs("qr_codes", exist_ok=True)
os.makedirs("uploads", exist_ok=True)
os.makedirs("uploads/logos", exist_ok=True)

app = FastAPI(
    title="UniSphere AI API",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# Import des routers
from app.api.auth import router as auth_router
from app.api.protected import router as protected_router
from app.api.students import router as students_router
from app.api.grades import router as grades_router
from app.api.courses import router as courses_router
from app.api.attendance import router as attendance_router
from app.api.roles import router as roles_router
from app.api.teachers import router as teachers_router
from app.api import teacher
from app.api.filieres import router as filieres_router
from app.api.universities import router as universities_router
from app.api.dashboard import router as dashboard_router
from app.api.notifications import router as notifications_router
from app.api.messages import router as messages_router
from app.api.staff import router as staff_router
from app.api.statistics import router as statistics_router
from app.api.financials import router as financials_router
from app.api.ai_assistant import router as ai_router
from app.api.settings import router as settings_router
from app.api.announcements import router as announcements_router 
from app.api.academic_fees import router as academic_fees_router
from app.api.payment_tranches import router as payment_tranches_router
from app.api.classes import router as classes_router
from app.api.schedules import router as schedules_router
from app.api.exam_sessions import router as exam_sessions_router
from app.api.report_cards import router as report_cards_router
from app.api.documents import router as documents_router
from app.api.student_stats import router as student_stats_router
from app.api.academic import router as academic_router
from app.api.security import router as security_router
from app.api import incidents



from app.api import users 
from app.api import payment_deadlines
from app.api import payments

# Enregistrement avec préfixe /api/v1
app.include_router(users.router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1")
app.include_router(protected_router, prefix="/api/v1")
app.include_router(students_router, prefix="/api/v1")
app.include_router(grades_router, prefix="/api/v1")  
app.include_router(courses_router, prefix="/api/v1")
app.include_router(attendance_router, prefix="/api/v1")
app.include_router(roles_router, prefix="/api/v1")
app.include_router(teachers_router, prefix="/api/v1")
app.include_router(teacher.router, prefix="/api/v1") 
app.include_router(filieres_router, prefix="/api/v1")
app.include_router(universities_router, prefix="/api/v1")
app.include_router(dashboard_router, prefix="/api/v1")
app.include_router(notifications_router, prefix="/api/v1")
app.include_router(messages_router, prefix="/api/v1")
app.include_router(staff_router, prefix="/api/v1")
app.include_router(statistics_router, prefix="/api/v1")
app.include_router(financials_router, prefix="/api/v1")
app.include_router(ai_router, prefix="/api/v1")
app.include_router(settings_router, prefix="/api/v1")
app.include_router(academic_fees_router, prefix="/api/v1")
app.include_router(announcements_router, prefix="/api/v1")
app.include_router(payments.router, prefix="/api/v1")
app.include_router(payment_tranches_router, prefix="/api/v1")
app.include_router(payment_deadlines.router, prefix="/api/v1")
app.include_router(classes_router, prefix="/api/v1")
app.include_router(schedules_router, prefix="/api/v1")
app.include_router(exam_sessions_router, prefix="/api/v1")
app.include_router(report_cards_router, prefix="/api/v1")
app.include_router(documents_router, prefix="/api/v1")
app.include_router(student_stats_router, prefix="/api/v1")
app.include_router(academic_router, prefix="/api/v1")
app.include_router(security_router, prefix="/api/v1")
app.include_router(incidents.router, prefix="/api/v1")

# ✅ MOUNTS CORRIGÉS (un seul mount par préfixe)
app.mount("/qr_codes", StaticFiles(directory="qr_codes"), name="qr_codes")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/")
def root():
    return {
        "message": "UniSphere AI Backend Running",
        "docs": "/docs"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}