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

# ✅ Enregistrer automatiquement toutes les tables SQLAlchemy
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"[WARNING] Erreur creation tables: {e}")
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

# ============================================
# CORS
# ============================================
_frontend_urls = os.getenv("FRONTEND_URL", "http://localhost:3000")
ALLOWED_ORIGINS = [url.strip() for url in _frontend_urls.split(",") if url.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
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
                    
                    # Ne pas ajouter de slash si c'est un ID numérique
                    if not resource.isdigit() and not path.endswith('/'):
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
}

registered = []
for name, router in all_routers.items():
    if router is not None:
        app.include_router(router, prefix="/api/v1")
        registered.append(name)



# ============================================
# MOUNTS STATIQUES
# ============================================
app.mount("/qr_codes", StaticFiles(directory="qr_codes"), name="qr_codes")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


# ============================================
# ROUTES RACINE
# ============================================
@app.get("/")
def root():
    return {"message": "UniSphere AI Backend Running", "docs": "/docs"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.get("/api/v1/health")
def health_check_v1():
    return {"status": "healthy"}