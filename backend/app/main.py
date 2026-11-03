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
from app.models.payment_reminder import PaymentReminder
from app.models.academic_fee import AcademicFee
from app.models.payment_deadline import PaymentDeadline
from app.models.payment_installment import PaymentInstallment
from app.models.payment_tranche import PaymentTranche
from app.models.material import Material
from app.models.censor import Censor
from app.models import certificate_request
from app.models.accounting import Supplier, ExpenseCategory, Expense, BankAccount, CashTransaction, Budget, FixedAsset, PayrollEntry
from app.models.ledger import Account, JournalEntry, JournalEntryLine, FiscalYear, BankReconciliation
from app.models.client_billing import ClientInvoice, ClientPayment, UniversityBillingConfig, FeatureRequest
from app.models.password_reset_request import PasswordResetRequest

_optional_models = [
    ('app.models.incident', 'Incident'),
    ('app.models.alumni', 'AlumniProfile'),
    ('app.models.scan_session', 'ScanSession'),
    ('app.models.document', 'Document'),
    ('app.models.exam_session', 'ExamSession'),
    ('app.models.exam_schedule', 'ExamSchedule'),
    ('app.models.report_card', 'ReportCard'),
    ('app.models.class_room', 'ClassRoom'),
    ('app.models.schedule', 'Schedule'),
    ('app.models.announcement', 'Announcement'),
    ('app.models.deliberation', 'DeliberationRule'),
    ('app.models.audit_log', 'AuditLog'),
    ('app.models.academic_config', 'AcademicConfig'),
    ('app.models.course_history', 'CourseHistory'),
    ('app.models.anomaly_config', 'AnomalyConfig'),
    ('app.models.teaching_unit', 'TeachingUnit'),
    ('app.models.room', 'Room'),
    ('app.models.password_reset_otp', 'PasswordResetOTP'),
    ('app.models.student_academic_history', 'StudentAcademicHistory'),
]

for module_path, _ in _optional_models:
    try:
        __import__(module_path)
    except ImportError:
        pass

# Importer dynamiquement tout autre modèle présent dans app/models/
try:
    import pkgutil
    import app.models as _models_pkg
    for _, _mod_name, _ in pkgutil.iter_modules(_models_pkg.__path__):
        if not _mod_name.startswith("_"):
            try:
                __import__(f"app.models.{_mod_name}")
            except Exception:
                pass
except Exception:
    pass

# ✅ S'assurer que le dossier de travail relatif pointe bien sur backend/
BASE_DIR_BOOT = Path(__file__).resolve().parent.parent
try:
    os.chdir(str(BASE_DIR_BOOT))
except Exception:
    pass

# ✅ Créer les tables ET synchroniser automatiquement toutes les colonnes manquantes (PostgreSQL & SQLite)
try:
    from app.database.auto_migrate import run_auto_migrations
    _added_cols = run_auto_migrations(engine)
    if _added_cols:
        print(f"[STARTUP] ✅ Auto-migration : {_added_cols} colonne(s) ajoutée(s) avec succès.")
except Exception as e:
    print(f"[WARNING] Erreur auto-migration / creation tables: {e}")

# ============================================
# CRÉER TOUS LES DOSSIERS DE STOCKAGE
# ============================================
for folder in [
    "qr_codes", "uploads", "uploads/avatars", "uploads/logos", "uploads/courses",
    "uploads/documents", "uploads/profiles", "uploads/messages", "uploads/incidents",
    "uploads/certificates", "uploads/materials", "uploads/student_documents",
    "uploads/temp_scans", "uploads/dossier_etudiant", "uploads/dossiers",
    "uploads/photos", "uploads/qrcodes"
]:
    (BASE_DIR_BOOT / folder).mkdir(parents=True, exist_ok=True)

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
def ensure_db_columns():
    try:
        import sqlalchemy as sa
        insp = sa.inspect(engine)
        cols = [col['name'] for col in insp.get_columns('courses')]
        if 'semester' not in cols:
            with engine.connect() as conn:
                conn.execute(sa.text("ALTER TABLE courses ADD COLUMN semester VARCHAR"))
                conn.commit()
            print("[STARTUP] Colonne 'semester' ajoutée à la table courses.")
    except Exception as e:
        print(f"[STARTUP] Colonne semester check: {e}")

@app.on_event("startup")
def ensure_alumni_demo():
    try:
        from sqlalchemy import text
        from app.models.university import University
        from app.models.user import User
        from app.models.student import Student
        from app.models.alumni import AlumniProfile, AlumniConnection
        from app.core.security import hash_password
        from datetime import datetime, timezone

        db = SessionLocal()
        got_lock = True
        try:
            if engine.dialect.name == "postgresql":
                got_lock = bool(db.execute(text("SELECT pg_try_advisory_lock(84920174);")).scalar())
                if not got_lock:
                    return

            univ = db.query(University).order_by(University.id.asc()).first()
            if not univ:
                return
            univ_id = univ.id

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
                user.role = "alumni"
                user.is_active = True
                user.is_email_verified = True
                if not user.university_id:
                    user.university_id = univ_id
                db.commit()

            profile = db.query(AlumniProfile).filter(AlumniProfile.user_id == user.id).first()
            if not profile:
                profile = AlumniProfile(
                    user_id=user.id,
                    university_id=univ_id,
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

            # ✅ Filtrer strictement par la même université pour ne jamais créer de liens inter-universités
            students = (
                db.query(Student)
                .filter(Student.university_id == profile.university_id)
                .order_by(Student.id.asc())
                .limit(4)
                .all()
            )
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
        finally:
            if got_lock and engine.dialect.name == "postgresql":
                try:
                    db.execute(text("SELECT pg_advisory_unlock(84920174);"))
                    db.commit()
                except Exception:
                    pass
            db.close()
    except Exception as e:
        print(f"[STARTUP] Erreur initialisation alumni demo: {e}")


@app.on_event("startup")
async def start_nightly_backup_scheduler():
    import asyncio
    from datetime import datetime, timedelta

    async def run_nightly_backup_loop():
        await asyncio.sleep(15)  # Laisser le temps à l'application de démarrer
        while True:
            try:
                now = datetime.utcnow()
                target = now.replace(hour=2, minute=0, second=0, microsecond=0)
                if now >= target:
                    target += timedelta(days=1)
                sleep_seconds = max(60.0, (target - now).total_seconds())
                await asyncio.sleep(sleep_seconds)

                print("[NIGHTLY BACKUP] 🌙 Démarrage de la sauvegarde automatique nocturne (02:00 UTC)...")
                from app.services.backup_service import perform_automated_backup
                res = perform_automated_backup(source="nightly_cron_02h")
                print(f"[NIGHTLY BACKUP] ✅ Sauvegarde réussie : {res.get('filename')} ({res.get('size_mb')} MB)")
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"[NIGHTLY BACKUP] ⚠️ Erreur lors de la sauvegarde nocturne : {e}")
                await asyncio.sleep(3600)

    asyncio.create_task(run_nightly_backup_loop())
    print("[STARTUP] 🕒 Scheduler de sauvegarde nocturne automatique (02:00) activé.")

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

# ============================================================
# 🚨 GESTIONNAIRE GLOBAL DES EXCEPTIONS 500 POUR LE SUPER-ADMIN
# ============================================================
import traceback
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Intercepte tout crash/bug 500 dans l'application, enregistre automatiquement
    une alerte prioritaire avec la stacktrace pour le Super-Admin,
    et répond un message clair.
    """
    # Ne pas intercepter les erreurs HTTP normales (400, 401, 403, 404, 422)
    if isinstance(exc, (StarletteHTTPException, HTTPException)):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail}
        )
    if isinstance(exc, RequestValidationError):
        return JSONResponse(
            status_code=422,
            content={"detail": exc.errors()}
        )

    # Erreur inattendue (500)
    tb_str = traceback.format_exc()
    route_info = f"{request.method} {request.url.path}"
    print(f"🚨 [CRASH 500] {route_info} : {exc}")

    try:
        from app.database.connection import SessionLocal
        from app.models.notification import Notification
        db = SessionLocal()
        try:
            # Créer la notification Bug en priorité absolue pour le SuperAdmin
            bug_notif = Notification(
                title=f"🚨 Bug Système [500] : {route_info}",
                message=f"Erreur : {str(exc)}\n\nTraceback :\n{tb_str[:1500]}",
                notification_type="bug",
                type="error",
                target_roles=["super_admin", "superadmin"],
                university_id=None,
                is_read=False
            )
            db.add(bug_notif)
            db.commit()
        finally:
            db.close()
    except Exception as db_err:
        print(f"⚠️ Impossible d'enregistrer la notification bug: {db_err}")

    return JSONResponse(
        status_code=500,
        content={
            "detail": f"Erreur interne du serveur ({str(exc)}). Un rapport d'incident prioritaire a été transmis au SuperAdmin.",
            "error_type": exc.__class__.__name__,
            "route": route_info
        }
    )


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
academic_year_transition_router = try_import_router("app.api.academic_year_transition")


censors_router = try_import_router("app.api.censors")
superadmin_router = try_import_router("app.api.superadmin")
teaching_units_router = try_import_router("app.api.teaching_units")
rooms_router = try_import_router("app.api.rooms")
exam_schedules_router = try_import_router("app.api.exam_schedules")
subscriptions_router = try_import_router("app.api.subscriptions")
password_reset_router = try_import_router("app.api.password_reset")
reminders_router = try_import_router("app.api.reminders")


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
    "academic_year_transition": academic_year_transition_router,
    "reminders": reminders_router,
}

registered = []
for name, router in all_routers.items():
    if router is not None:
        app.include_router(router, prefix="/api/v1")
        registered.append(name)



# ============================================
# MOUNTS STATIQUES AVEC FALLBACK MULTI-DOSSIERS (LOGOS, AVATARS, SCANS)
# ============================================
class SmartStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        clean_path = path.replace("\\", "/").lstrip("/")
        response = await super().get_response(clean_path, scope)
        if response.status_code == 404:
            clean_name = Path(clean_path).name
            base_p = Path(self.directory)
            # 1. Dossiers standards
            for sub in ("logos", "avatars", "photos", "profiles", "materials", "documents", "courses", "student_documents"):
                cand = base_p / sub / clean_name
                if cand.is_file():
                    try:
                        rel = str(cand.relative_to(base_p)).replace("\\", "/")
                        return await super().get_response(rel, scope)
                    except Exception:
                        pass
            # 2. Dossiers étudiants par ID : dossier_etudiant/*/<clean_name>
            dossier_base = base_p / "dossier_etudiant"
            if dossier_base.exists() and dossier_base.is_dir():
                for sub_d in dossier_base.iterdir():
                    if sub_d.is_dir():
                        cand = sub_d / clean_name
                        if cand.is_file():
                            try:
                                rel = str(cand.relative_to(base_p)).replace("\\", "/")
                                return await super().get_response(rel, scope)
                            except Exception:
                                pass
                        val_cand = sub_d / "validated" / clean_name
                        if val_cand.is_file():
                            try:
                                rel = str(val_cand.relative_to(base_p)).replace("\\", "/")
                                return await super().get_response(rel, scope)
                            except Exception:
                                pass
            # 3. Fallback dossier uploads à la racine si exécuté hors backend/
            alt_base = base_p.parent / "uploads"
            if alt_base.exists() and alt_base != base_p:
                alt_cand = alt_base / clean_name
                if alt_cand.is_file():
                    from fastapi.responses import FileResponse
                    return FileResponse(str(alt_cand))
                for sub in ("logos", "avatars", "photos", "dossier_etudiant"):
                    sub_cand = alt_base / sub / clean_name
                    if sub_cand.is_file():
                        from fastapi.responses import FileResponse
                        return FileResponse(str(sub_cand))
        return response

BASE_DIR = Path(__file__).resolve().parent.parent
(BASE_DIR / "qr_codes").mkdir(parents=True, exist_ok=True)
(BASE_DIR / "uploads").mkdir(parents=True, exist_ok=True)
(BASE_DIR / "uploads" / "logos").mkdir(parents=True, exist_ok=True)
(BASE_DIR / "uploads" / "avatars").mkdir(parents=True, exist_ok=True)
(BASE_DIR / "uploads" / "photos").mkdir(parents=True, exist_ok=True)
(BASE_DIR / "uploads" / "dossier_etudiant").mkdir(parents=True, exist_ok=True)

app.mount("/qr_codes", StaticFiles(directory=str(BASE_DIR / "qr_codes")), name="qr_codes")
app.mount("/uploads", SmartStaticFiles(directory=str(BASE_DIR / "uploads")), name="uploads")


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
