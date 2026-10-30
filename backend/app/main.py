import sys
try:
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
except Exception:
    pass

from dotenv import load_dotenv
load_dotenv()

from pathlib import Path
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.requests import Request

from app.database.connection import Base, engine, SessionLocal

# ============================================
# IMPORT DES MODÈLES
# ============================================
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
from app.models.censor import Censor
from app.models import certificate_request
from app.models.accounting import Supplier, ExpenseCategory, Expense, BankAccount, CashTransaction, Budget, FixedAsset, PayrollEntry
from app.models.ledger import Account, JournalEntry, JournalEntryLine, FiscalYear, BankReconciliation
from app.models.client_billing import ClientInvoice, ClientPayment
from app.models.password_reset_request import PasswordResetRequest

_optional_models = [
    ('app.models.incident', 'Incident'),
    ('app.models.alumni', 'AlumniProfile'),
    ('app.models.scan_session', 'ScanSession'),
    ('app.models.document', 'Document'),
    ('app.models.exam_session', 'ExamSession'),
    ('app.models.report_card', 'ReportCard'),
    ('app.models.class_room', 'ClassRoom'),
    ('app.models.schedule', 'Schedule'),
    ('app.models.announcement', 'Announcement'),
    ('app.models.deliberation', 'DeliberationRule'),
    ('app.models.audit_log', 'AuditLog'),
    ('app.models.academic_config', 'AcademicConfig'),
    ('app.models.course_history', 'CourseHistory'),
    ('app.models.anomaly_config', 'AnomalyConfig'),
]

for module_path, _ in _optional_models:
    try:
        __import__(module_path)
    except ImportError:
        pass

# ✅ Enregistrer automatiquement toutes les tables SQLAlchemy
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"[WARNING] Erreur creation tables: {e}")



# ============================================
# CRÉER LES DOSSIERS
# ============================================
for folder in ["qr_codes", "uploads", "uploads/logos", "uploads/courses", "uploads/documents",
               "uploads/profiles", "uploads/messages", "uploads/incidents", "uploads/certificates",
               "uploads/materials", "uploads/student_documents", "uploads/temp_scans", "uploads/dossier_etudiant"]:
    Path(folder).mkdir(parents=True, exist_ok=True)

# ============================================
# APP FASTAPI
# ============================================
app = FastAPI(
    title="UniSphere AI API",
    description="API UniSphere AI",
    version="2.0.0",
    redirect_slashes=False,  # ✅ Désactivé (pas de 307)
)

@app.on_event("startup")
def ensure_alumni_demo():
    try:
        from app.models.university import University
        from app.models.user import User
        from app.models.student import Student
        from app.models.alumni import AlumniProfile, AlumniConnection
        from app.core.security import hash_password
        from datetime import datetime, timezone

        db = SessionLocal()
        try:
            univ = db.query(University).first()
            univ_id = univ.id if univ else None

            user = db.query(User).filter(User.email == "alumni@unisphere.ai").first()
            if not user:
                user = User(
                    email="alumni@unisphere.ai",
                    hashed_password=hash_password("unisphere2026"),
                    full_name="Moussa Fofana",
                    role="alumni",
                    university_id=univ_id,
                    is_active=True,
                    is_email_verified=True
                )
                db.add(user)
                db.commit()
                db.refresh(user)
                print(f"[STARTUP] Compte alumni cree: {user.email}")
            else:
                user.hashed_password = hash_password("unisphere2026")
                user.role = "alumni"
                user.is_active = True
                user.is_email_verified = True
                db.commit()

            profile = db.query(AlumniProfile).filter(AlumniProfile.user_id == user.id).first()
            if not profile:
                profile = AlumniProfile(
                    user_id=user.id,
                    university_id=univ_id or 1,
                    first_name="Moussa",
                    last_name="Fofana",
                    email=user.email,
                    phone="+223 70 12 34 56",
                    filiere="Genie Logiciel",
                    domain="Informatique & Reseaux",
                    level="Master",
                    graduation_year=2022,
                    promotion="Promotion 2022",
                    current_position="Lead Architect Cloud & DevOps",
                    company="Orange Digital Center",
                    activity_domain="Technologies de l'Information",
                    location="Bamako, Mali",
                    linkedin_url="https://linkedin.com/in/moussa-fofana",
                    career_path="Sorti major de promotion en 2022, j'ai debute comme developpeur Full Stack puis evolue vers l'architecture Cloud et l'ingenierie DevOps.",
                    difficulties="La gestion du temps entre les projets universitaires et les certifications professionnelles.",
                    advice="Pratiquez chaque jour, contribuez a des projets open source et n'hesitez jamais a poser des questions a vos aines.",
                    skills="Python, FastAPI, TypeScript, React, Docker, Kubernetes, CI/CD",
                    is_open_to_mentoring=True,
                    is_open_to_internship=True,
                    accepted_conditions=True
                )
                db.add(profile)
                db.commit()
                db.refresh(profile)
                print(f"[STARTUP] Profil alumni cree: #{profile.id}")
            else:
                profile.current_position = "Lead Architect Cloud & DevOps"
                profile.company = "Orange Digital Center"
                profile.is_open_to_mentoring = True
                profile.is_open_to_internship = True
                db.commit()

            students = db.query(Student).limit(4).all()
            if len(students) >= 2:
                c1 = db.query(AlumniConnection).filter(
                    AlumniConnection.alumni_id == profile.id,
                    AlumniConnection.student_id == students[0].id
                ).first()
                if not c1:
                    c1 = AlumniConnection(
                        alumni_id=profile.id,
                        student_id=students[0].id,
                        connection_type="mentor",
                        status="accepted",
                        message="Bonjour M. Fofana, je souhaiterais beneficier de vos conseils pour mon projet de fin d'etudes.",
                        created_at=datetime.now(timezone.utc),
                        accepted_at=datetime.now(timezone.utc)
                    )
                    db.add(c1)

                c2 = db.query(AlumniConnection).filter(
                    AlumniConnection.alumni_id == profile.id,
                    AlumniConnection.student_id == students[1].id
                ).first()
                if not c2:
                    c2 = AlumniConnection(
                        alumni_id=profile.id,
                        student_id=students[1].id,
                        connection_type="mentor",
                        status="pending",
                        message="Bonjour, je suis etudiant en L3 et j'aimerais echanger sur les carrieres en ingenierie logicielle.",
                        created_at=datetime.now(timezone.utc)
                    )
                    db.add(c2)
                db.commit()
                print("[STARTUP] Connexions Alumni assurees avec succes.")
        finally:
            db.close()
    except Exception as e:
        print(f"[STARTUP] Erreur initialisation alumni demo: {e}")

# ============================================
# CORS
# ============================================
_frontend_urls = (os.getenv("FRONTEND_URL", "") + "," + os.getenv("CORS_ORIGINS", "")).split(",")
ALLOWED_ORIGINS = [url.strip() for url in _frontend_urls if url.strip()]
_default_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://localhost:8081",
    "http://127.0.0.1:8081",
    "http://192.168.1.7:3000",
    "http://192.168.1.7:8000",
    "http://192.168.1.7:8081",
    "http://192.168.100.17:3000",
    "http://192.168.100.17:8000",
]
for o in _default_origins:
    if o not in ALLOWED_ORIGINS:
        ALLOWED_ORIGINS.append(o)

# En développement ou réseau local, autoriser les connexions mobiles
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================
# ✅ MIDDLEWARE ASGI NATIF : AJOUT SLASH FINAL
# ============================================
from starlette.types import ASGIApp, Receive, Scope, Send

class AddSlashMiddleware:
    """
    Middleware ASGI natif qui ajoute le slash final aux routes de liste.
    S'exécute AVANT le routing FastAPI.
    """
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] == "http":
            path = scope.get("path", "")
            
            # Routes API qui nécessitent un slash final
            if path.startswith("/api/v1/"):
                parts = path.rstrip("/").split("/")
                
                # Pattern : ['', 'api', 'v1', 'resource'] = routes de liste
                if len(parts) == 4 and parts[3]:
                    resource = parts[3]
                    
                    # Ne pas ajouter de slash si c'est un ID numérique ou une route spécifique
                    if not resource.isdigit() and not path.endswith('/') and resource not in ['health', 'docs', 'openapi.json']:
                        scope["path"] = path + "/"
                        
        
        await self.app(scope, receive, send)

# ✅ Enregistrer AVANT les autres middlewares
app.add_middleware(AddSlashMiddleware)

# ============================================
# IMPORT DES ROUTERS
# ============================================
def try_import_router(module_path, attr="router"):
    try:
        module = __import__(module_path, fromlist=[attr])
        return getattr(module, attr)
    except (ImportError, AttributeError) as e:
        print(f"[WARNING] Router manquant: {module_path} -> {e}")
        return None

auth_router = try_import_router("app.api.auth")
protected_router = try_import_router("app.api.protected")
roles_router = try_import_router("app.api.roles")
dashboard_router = try_import_router("app.api.dashboard")
statistics_router = try_import_router("app.api.statistics")
ai_router = try_import_router("app.api.ai_assistant")
ai_compat_router = try_import_router("app.api.ai_assistant", "ai_compat_router")
security_router = try_import_router("app.api.security")
universities_router = try_import_router("app.api.universities")

students_router = try_import_router("app.api.students")
student_stats_router = try_import_router("app.api.student_stats")
teachers_router = try_import_router("app.api.teachers")
teacher_router = try_import_router("app.api.teacher")
filieres_router = try_import_router("app.api.filieres")
courses_router = try_import_router("app.api.courses")
classes_router = try_import_router("app.api.classes")
schedules_router = try_import_router("app.api.schedules")
exam_sessions_router = try_import_router("app.api.exam_sessions")

grades_router = try_import_router("app.api.grades")
attendance_router = try_import_router("app.api.attendance")
academic_router = try_import_router("app.api.academic")
report_cards_router = try_import_router("app.api.report_cards")
documents_router = try_import_router("app.api.documents")
certificates_router = try_import_router("app.api.certificates")

financials_router = try_import_router("app.api.financials")
payments_router = try_import_router("app.api.payments")
payment_tranches_router = try_import_router("app.api.payment_tranches")
payment_deadlines_router = try_import_router("app.api.payment_deadlines")
academic_fees_router = try_import_router("app.api.academic_fees")
accounting_router = try_import_router("app.api.accounting")
ledger_router = try_import_router("app.api.ledger")

messages_router = try_import_router("app.api.messages")
notifications_router = try_import_router("app.api.notifications")
announcements_router = try_import_router("app.api.announcements")
incidents_router = try_import_router("app.api.incidents")

staff_router = try_import_router("app.api.staff")
users_router = try_import_router("app.api.users")
settings_router = try_import_router("app.api.settings")

alumni_router = try_import_router("app.api.alumni")
scan_sessions_router = try_import_router("app.api.scan_sessions")
deliberations_router = try_import_router("app.api.deliberations")


censors_router = try_import_router("app.api.censors")
superadmin_router = try_import_router("app.api.superadmin")
teaching_units_router = try_import_router("app.api.teaching_units")
rooms_router = try_import_router("app.api.rooms")
exam_schedules_router = try_import_router("app.api.exam_schedules")
subscriptions_router = try_import_router("app.api.subscriptions")
password_reset_router = try_import_router("app.api.password_reset")


# ============================================
# ENREGISTREMENT DES ROUTERS
# ============================================
all_routers = {
    "auth": auth_router,
    "protected": protected_router,
    "roles": roles_router,
    "dashboard": dashboard_router,
    "statistics": statistics_router,
    "ai": ai_router,
    "ai_compat": ai_compat_router,
    "security": security_router,
    "universities": universities_router,
    "superadmin": superadmin_router,
    "students": students_router,
    "student_stats": student_stats_router,
    "teachers": teachers_router,
    "teacher": teacher_router,
    "filieres": filieres_router,
    "courses": courses_router,
    "classes": classes_router,
    "schedules": schedules_router,
    "exam_sessions": exam_sessions_router,
    "exam_schedules": exam_schedules_router,
    "rooms": rooms_router,
    "grades": grades_router,
    "attendance": attendance_router,
    "academic": academic_router,
    "report_cards": report_cards_router,
    "documents": documents_router,
    "certificates": certificates_router,
    "financials": financials_router,
    "payments": payments_router,
    "payment_tranches": payment_tranches_router,
    "payment_deadlines": payment_deadlines_router,
    "academic_fees": academic_fees_router,
    "accounting": accounting_router,
    "ledger": ledger_router,
    "messages": messages_router,
    "notifications": notifications_router,
    "announcements": announcements_router,
    "incidents": incidents_router,
    "staff": staff_router,
    "users": users_router,
    "settings": settings_router,
    "alumni": alumni_router,
    "scan_sessions": scan_sessions_router,
    "deliberations": deliberations_router,
    "censors": censors_router,
    "teaching_units": teaching_units_router,
    "subscriptions": subscriptions_router,
    "password_reset": password_reset_router,
}

registered = []
for name, router in all_routers.items():
    if router is not None:
        app.include_router(router, prefix="/api/v1")
        registered.append(name)



# ============================================
# MOUNTS STATIQUES
# ============================================
BASE_DIR = Path(__file__).resolve().parent.parent
(BASE_DIR / "qr_codes").mkdir(parents=True, exist_ok=True)
(BASE_DIR / "uploads").mkdir(parents=True, exist_ok=True)
app.mount("/qr_codes", StaticFiles(directory=str(BASE_DIR / "qr_codes")), name="qr_codes")
app.mount("/uploads", StaticFiles(directory=str(BASE_DIR / "uploads")), name="uploads")


# ============================================
# ROUTES RACINE
# ============================================
@app.get("/")
def root():
    return {"message": "UniSphere AI Backend Running", "docs": "/docs"}

@app.get("/health")
@app.get("/health/")
def health_check():
    return {"status": "healthy"}

@app.get("/api/v1/health")
@app.get("/api/v1/health/")
def health_check_v1():
    return {"status": "healthy"}

from fastapi.responses import FileResponse

@app.get("/download/unisphereai.apk")
@app.get("/api/v1/download/unisphereai.apk")
def download_apk():
    apk_paths = [
        Path("frontend/public/download/unisphereai.apk"),
        Path("../frontend/public/download/unisphereai.apk"),
        Path("c:/UniSphere_AI/frontend/public/download/unisphereai.apk")
    ]
    for p in apk_paths:
        if p.exists():
            return FileResponse(
                path=str(p),
                filename="unisphereai.apk",
                media_type="application/vnd.android.package-archive"
            )
    return {"error": "APK not found"}

import qrcode

@app.get("/api/v1/teacher/qrcode")
def get_teacher_qrcode(teacher_id: int = None):
    db = SessionLocal()
    try:
        if teacher_id:
            teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
        else:
            teacher = db.query(Teacher).filter(Teacher.user_id == 60).first() or db.query(Teacher).first()
        
        if not teacher:
            return {"error": "Teacher not found"}
            
        os.makedirs("qr_codes", exist_ok=True)
        qr_filename = f"TEACHER_{teacher.id}.png"
        qr_path = os.path.join("qr_codes", qr_filename)
        
        if not (os.path.exists(qr_path) and os.path.getsize(qr_path) > 0):
            qr = qrcode.make(f"TEACHER-{teacher.id}")
            qr.save(qr_path)
            
        return FileResponse(qr_path, media_type="image/png", filename=f"QR_TEACHER_{teacher.id}.png")
    finally:
        db.close()
