import shutil
import os
from fastapi import APIRouter, Depends, HTTPException, Request, Body
from sqlalchemy.orm import Session
from sqlalchemy.sql import func, text
from datetime import datetime, date, timedelta
from typing import Optional, List
from pydantic import BaseModel
from jose import jwt

from app.database.connection import SessionLocal
from app.models.user import User
from app.models.university import University
from app.models.student import Student
from app.models.client_billing import ClientInvoice, ClientPayment, UniversityBillingConfig, FeatureRequest
from app.core.dependencies import get_current_user, require_role
from app.core.config import SECRET_KEY, ALGORITHM

router = APIRouter(prefix="/superadmin", tags=["Super Admin"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Pydantic Schemas
class InvoiceCreate(BaseModel):
    university_id: int
    title: str
    description: Optional[str] = None
    amount: float
    issue_date: str  # YYYY-MM-DD
    due_date: str    # YYYY-MM-DD
    invoice_type: Optional[str] = "subscription"  # subscription, direct_sale, maintenance, feature_request, other
    feature_request_id: Optional[int] = None
    notes: Optional[str] = None

class InvoiceUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    issue_date: Optional[str] = None
    due_date: Optional[str] = None
    status: Optional[str] = None
    invoice_type: Optional[str] = None
    notes: Optional[str] = None

class PaymentCreate(BaseModel):
    invoice_id: int
    amount: float
    payment_date: str
    payment_method: str = "virement"
    reference: Optional[str] = None
    notes: Optional[str] = None

class BillingConfigUpdate(BaseModel):
    billing_model: Optional[str] = "monthly"  # monthly, yearly, direct_sale
    amount: Optional[float] = 250000.0
    maintenance_enabled: Optional[bool] = True
    maintenance_interval_months: Optional[int] = 6
    maintenance_amount: Optional[float] = 350000.0
    last_maintenance_date: Optional[str] = None
    next_maintenance_date: Optional[str] = None
    contract_start_date: Optional[str] = None
    contract_end_date: Optional[str] = None
    notes: Optional[str] = None

class FeatureRequestCreate(BaseModel):
    university_id: int
    title: str
    description: Optional[str] = None
    amount: float = 0.0  # Montant configurable par le superadmin
    status: Optional[str] = "pending"  # pending, approved, in_development, completed, billed
    requested_date: Optional[str] = None
    notes: Optional[str] = None

class FeatureRequestUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    status: Optional[str] = None
    completed_date: Optional[str] = None
    notes: Optional[str] = None


# Helper to format invoice number
def generate_invoice_number(db: Session) -> str:
    year = datetime.now().year
    count = db.query(ClientInvoice).count() + 1
    return f"FAC-{year}-{count:04d}"



# ==========================================
# DASHBOARD STATS
# ==========================================
@router.get("/dashboard-stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin"))
):
    total_universities = db.query(University).count()
    total_students = db.query(Student).count()

    invoices = db.query(ClientInvoice).filter(ClientInvoice.status != "cancelled").all()
    total_invoiced = sum(i.amount for i in invoices)

    payments = db.query(ClientPayment).all()
    total_paid = sum(p.amount for p in payments)

    balance_due = max(0.0, total_invoiced - total_paid)

    today = date.today()
    pending_count = 0
    overdue_count = 0

    for inv in invoices:
        if inv.status == "paid":
            continue
        inv_payments = sum(p.amount for p in inv.payments)
        if inv_payments >= inv.amount:
            inv.status = "paid"
            db.commit()
        elif inv.due_date < today:
            inv.status = "overdue"
            db.commit()
            overdue_count += 1
        else:
            pending_count += 1

    # Recent payments
    recent_payments = (
        db.query(ClientPayment)
        .order_by(ClientPayment.created_at.desc())
        .limit(5)
        .all()
    )

    formatted_recent_payments = []
    for p in recent_payments:
        inv = p.invoice
        univ_name = inv.university.name if inv and inv.university else "Inconnu"
        formatted_recent_payments.append({
            "id": p.id,
            "invoice_number": inv.invoice_number if inv else "—",
            "university_name": univ_name,
            "amount": p.amount,
            "payment_date": str(p.payment_date),
            "payment_method": p.payment_method,
            "reference": p.reference
        })

    return {
        "total_universities": total_universities,
        "total_students": total_students,
        "total_invoiced": total_invoiced,
        "total_paid": total_paid,
        "balance_due": balance_due,
        "pending_invoices_count": pending_count,
        "overdue_invoices_count": overdue_count,
        "recent_payments": formatted_recent_payments
    }


# ==========================================
# UNIVERSITIES LIST WITH FINANCIAL SUMMARY
# ==========================================
@router.get("/universities")
def get_universities_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin"))
):
    universities = db.query(University).order_by(University.name.asc()).all()
    result = []

    for univ in universities:
        student_count = db.query(Student).filter(Student.university_id == univ.id).count()
        user_count = db.query(User).filter(User.university_id == univ.id).count()

        invoices = db.query(ClientInvoice).filter(
            ClientInvoice.university_id == univ.id,
            ClientInvoice.status != "cancelled"
        ).all()

        total_invoiced = sum(i.amount for i in invoices)

        payments = (
            db.query(ClientPayment)
            .join(ClientInvoice)
            .filter(ClientInvoice.university_id == univ.id)
            .all()
        )
        total_paid = sum(p.amount for p in payments)
        balance_due = max(0.0, total_invoiced - total_paid)

        result.append({
            "university": {
                "id": univ.id,
                "name": univ.name,
                "email": univ.email,
                "country": univ.country,
                "phone": univ.phone,
                "logo": univ.logo,
                "is_active": univ.is_active if hasattr(univ, 'is_active') and univ.is_active is not None else True,
                "status": univ.status if hasattr(univ, 'status') and univ.status else "active",
                "created_at": univ.created_at
            },
            "student_count": student_count,
            "user_count": user_count,
            "total_invoiced": total_invoiced,
            "total_paid": total_paid,
            "balance_due": balance_due,
            "invoices_count": len(invoices)
        })

    return result


@router.put("/universities/{university_id}/status")
def toggle_university_status(
    university_id: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin"))
):
    univ = db.query(University).filter(University.id == university_id).first()
    if not univ:
        raise HTTPException(status_code=404, detail="Université non trouvée")

    is_active = data.get("is_active")
    status = data.get("status")

    if is_active is not None:
        univ.is_active = is_active
        univ.status = "active" if is_active else "suspended"
    elif status is not None:
        univ.status = status
        univ.is_active = (status == "active")

    db.commit()
    db.refresh(univ)

    action_label = "activée" if univ.is_active else "suspendue / bloquée"
    return {
        "message": f"L'université {univ.name} a été {action_label} avec succès",
        "is_active": univ.is_active,
        "status": univ.status
    }


# ==========================================
# INVOICES MANAGEMENT
# ==========================================
@router.get("/invoices")
def get_invoices(
    university_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin"))
):
    query = db.query(ClientInvoice)

    if university_id:
        query = query.filter(ClientInvoice.university_id == university_id)
    if status and status != "all":
        query = query.filter(ClientInvoice.status == status)

    invoices = query.order_by(ClientInvoice.created_at.desc()).all()

    today = date.today()
    result = []

    for inv in invoices:
        total_paid = sum(p.amount for p in inv.payments)

        # Check and update status dynamically
        if inv.status != "cancelled":
            if total_paid >= inv.amount and inv.status != "paid":
                inv.status = "paid"
                db.commit()
            elif inv.status == "pending" and inv.due_date < today:
                inv.status = "overdue"
                db.commit()

        result.append({
            "id": inv.id,
            "invoice_number": inv.invoice_number,
            "university_id": inv.university_id,
            "university_name": inv.university.name if inv.university else "Non définie",
            "title": inv.title,
            "description": inv.description,
            "amount": inv.amount,
            "issue_date": str(inv.issue_date),
            "due_date": str(inv.due_date),
            "status": inv.status,
            "invoice_type": getattr(inv, "invoice_type", "subscription") or "subscription",
            "notes": inv.notes,
            "total_paid": total_paid,
            "balance": max(0.0, inv.amount - total_paid),
            "created_at": inv.created_at,
            "payments": [
                {
                    "id": p.id,
                    "amount": p.amount,
                    "payment_date": str(p.payment_date),
                    "payment_method": p.payment_method,
                    "reference": p.reference
                }
                for p in inv.payments
            ]
        })

    return result


@router.post("/invoices")
def create_invoice(
    data: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin"))
):
    univ = db.query(University).filter(University.id == data.university_id).first()
    if not univ:
        raise HTTPException(status_code=404, detail="Université non trouvée")

    try:
        issue_date_obj = datetime.strptime(data.issue_date, "%Y-%m-%d").date()
        due_date_obj = datetime.strptime(data.due_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Format de date invalide (AAAA-MM-JJ requis)")

    inv_num = generate_invoice_number(db)
    status = "pending"
    if due_date_obj < date.today():
        status = "overdue"

    invoice = ClientInvoice(
        invoice_number=inv_num,
        university_id=data.university_id,
        title=data.title,
        description=data.description,
        amount=data.amount,
        issue_date=issue_date_obj,
        due_date=due_date_obj,
        status=status,
        invoice_type=data.invoice_type or "subscription",
        notes=data.notes
    )

    db.add(invoice)
    db.commit()
    db.refresh(invoice)

    if data.feature_request_id:
        feat = db.query(FeatureRequest).filter(FeatureRequest.id == data.feature_request_id).first()
        if feat:
            feat.invoice_id = invoice.id
            feat.status = "billed"
            db.commit()

    return {
        "message": f"Facture {inv_num} créée avec succès",
        "id": invoice.id,
        "invoice_number": invoice.invoice_number
    }


@router.put("/invoices/{invoice_id}")
def update_invoice(
    invoice_id: int,
    data: InvoiceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin"))
):
    invoice = db.query(ClientInvoice).filter(ClientInvoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Facture non trouvée")

    if data.title is not None:
        invoice.title = data.title
    if data.description is not None:
        invoice.description = data.description
    if data.amount is not None:
        invoice.amount = data.amount
    if data.issue_date is not None:
        invoice.issue_date = datetime.strptime(data.issue_date, "%Y-%m-%d").date()
    if data.due_date is not None:
        invoice.due_date = datetime.strptime(data.due_date, "%Y-%m-%d").date()
    if data.status is not None:
        invoice.status = data.status
    if data.notes is not None:
        invoice.notes = data.notes

    db.commit()
    db.refresh(invoice)

    return {"message": "Facture mise à jour avec succès"}



# ==========================================
# MARQUER UNE FACTURE COMME PAYÉE / SOLDÉE (ESPÈCES, CHÈQUE, VIREMENT, MOBILE MONEY)
# ==========================================
class MarkInvoicePaidRequest(BaseModel):
    payment_method: str = "virement" # virement, cheque, especes, mobile_money, carte
    reference: Optional[str] = None
    notes: Optional[str] = None
    payment_date: Optional[str] = None

@router.post("/invoices/{invoice_id}/mark-paid")
def mark_invoice_as_paid(
    invoice_id: int,
    data: MarkInvoicePaidRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin"))
):
    """
    Permet au Super-Admin de marquer une facture comme soldée directement
    lorsque l'université a payé par chèque, espèces, mobile money ou virement.
    Crée automatiquement le reçu de règlement et solde la facture.
    """
    invoice = db.query(ClientInvoice).filter(ClientInvoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Facture non trouvée")

    total_already_paid = sum(p.amount for p in invoice.payments)
    remaining_balance = max(0.0, invoice.amount - total_already_paid)

    p_date = date.today()
    if data.payment_date:
        try:
            p_date = datetime.strptime(data.payment_date, "%Y-%m-%d").date()
        except Exception:
            p_date = date.today()

    if remaining_balance > 0:
        ref_text = data.reference or f"REG-{invoice.invoice_number}"
        payment = ClientPayment(
            invoice_id=invoice.id,
            amount=remaining_balance,
            payment_date=p_date,
            payment_method=data.payment_method,
            reference=ref_text,
            notes=data.notes or f"Règlement direct validé par le Super-Admin ({data.payment_method})"
        )
        db.add(payment)

    invoice.status = "paid"
    db.commit()
    db.refresh(invoice)

    return {
        "message": f"Facture {invoice.invoice_number} marquée comme SOLDEE avec succès !",
        "invoice_number": invoice.invoice_number,
        "status": "paid",
        "total_amount": invoice.amount,
        "amount_settled": remaining_balance
    }

@router.delete("/invoices/{invoice_id}")
def cancel_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin"))
):
    invoice = db.query(ClientInvoice).filter(ClientInvoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Facture non trouvée")

    invoice.status = "cancelled"
    db.commit()

    return {"message": "Facture annulée avec succès"}


# ==========================================
# PAYMENTS MANAGEMENT
# ==========================================
@router.get("/payments")
def get_payments(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin"))
):
    payments = db.query(ClientPayment).order_by(ClientPayment.created_at.desc()).all()
    result = []

    for p in payments:
        inv = p.invoice
        univ_name = inv.university.name if inv and inv.university else "Inconnu"
        result.append({
            "id": p.id,
            "invoice_id": p.invoice_id,
            "invoice_number": inv.invoice_number if inv else "—",
            "invoice_title": inv.title if inv else "—",
            "university_name": univ_name,
            "amount": p.amount,
            "payment_date": str(p.payment_date),
            "payment_method": p.payment_method,
            "reference": p.reference,
            "notes": p.notes,
            "created_at": p.created_at
        })

    return result


@router.post("/payments")
def record_payment(
    data: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin"))
):
    invoice = db.query(ClientInvoice).filter(ClientInvoice.id == data.invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Facture non trouvée")

    try:
        payment_date_obj = datetime.strptime(data.payment_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Format de date invalide (AAAA-MM-JJ requis)")

    payment = ClientPayment(
        invoice_id=data.invoice_id,
        amount=data.amount,
        payment_date=payment_date_obj,
        payment_method=data.payment_method,
        reference=data.reference,
        notes=data.notes
    )

    db.add(payment)
    db.commit()

    # Recalculate total paid
    total_paid = sum(p.amount for p in invoice.payments)
    if total_paid >= invoice.amount:
        invoice.status = "paid"
    else:
        invoice.status = "pending"
    db.commit()

    return {
        "message": "Paiement enregistré avec succès",
        "invoice_status": invoice.status,
        "total_paid": total_paid,
        "remaining_balance": max(0.0, invoice.amount - total_paid)
    }


# ==========================================
# CREATE UNIVERSITY + ADMIN (onboarding contrôlé)
# ==========================================
from app.core.security import pwd_context

class UniversityCreate(BaseModel):
    university_name: str
    country: Optional[str] = None
    institution_type: Optional[str] = None
    university_email: Optional[str] = None
    phone: Optional[str] = None
    custom_domain: Optional[str] = None
    admin_full_name: str
    admin_email: str
    admin_phone: Optional[str] = None
    admin_password: str

@router.post("/universities")
def create_university(
    data: UniversityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin"))
):
    if not data.university_name.strip():
        raise HTTPException(status_code=400, detail="Nom de l'université requis")

    existing_admin = db.query(User).filter(User.email == data.admin_email).first()
    if existing_admin:
        raise HTTPException(status_code=400, detail="Cet email administrateur existe déjà")

    if data.custom_domain:
        dom = data.custom_domain.strip().lower().replace("https://", "").replace("http://", "").split("/")[0]
        existing = db.query(University).filter(University.custom_domain == dom).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Le domaine {dom} est déjà utilisé par {existing.name}")
        data.custom_domain = dom
    else:
        data.custom_domain = None

    university = University(
        name=data.university_name.strip(),
        email=data.university_email,
        country=data.country,
        phone=data.phone,
        custom_domain=data.custom_domain,
        institution_type=data.institution_type,
        is_active=True,
        status="active",
    )
    db.add(university)
    db.commit()
    db.refresh(university)

    admin = User(
        full_name=data.admin_full_name.strip(),
        email=data.admin_email.strip().lower(),
        hashed_password=pwd_context.hash(data.admin_password),
        role="admin",
        phone=data.admin_phone,
        university_id=university.id,
        is_active=True,
        is_email_verified=True,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)

    return {
        "message": f"Université {university.name} créée avec succès",
        "university_id": university.id,
        "admin_email": admin.email,
        "admin_password": data.admin_password,
    }


# ==========================================
# 🛡️ AUDIT MULTI-UNIVERSITÉS POUR SUPER-ADMIN
# ==========================================
@router.get("/audit-logs")
def get_superadmin_audit_logs(
    university_id: Optional[int] = None,
    page: int = 1,
    per_page: int = 30,
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin"))
):
    from app.models.audit_log import AuditLog
    query = db.query(AuditLog, University.name.label("university_name"))\
        .outerjoin(University, AuditLog.university_id == University.id)

    if university_id:
        query = query.filter(AuditLog.university_id == university_id)
    if status:
        query = query.filter(AuditLog.status == status)
    if search:
        query = query.filter(
            (AuditLog.action.ilike(f"%{search}%")) |
            (AuditLog.user_email.ilike(f"%{search}%")) |
            (AuditLog.ip_address.ilike(f"%{search}%"))
        )

    total = query.count()
    items = query.order_by(AuditLog.created_at.desc())\
        .offset((page - 1) * per_page)\
        .limit(per_page)\
        .all()

    total_actions = db.query(AuditLog).count()
    failed_attempts = db.query(AuditLog).filter(AuditLog.status == "failure").count()
    today_start = datetime.combine(date.today(), datetime.min.time())
    today_actions = db.query(AuditLog).filter(AuditLog.created_at >= today_start).count()
    suspicious_ips = db.query(AuditLog.ip_address).filter(AuditLog.status == "failure").distinct().count()

    all_univs = db.query(University.id, University.name).filter(University.is_active == True).all()

    return {
        "data": [
            {
                "id": log.AuditLog.id,
                "action": log.AuditLog.action,
                "user": log.AuditLog.user_email or "Système",
                "ip": log.AuditLog.ip_address or "N/A",
                "university_id": log.AuditLog.university_id,
                "university_name": log.university_name or "Plateforme Globale",
                "time": log.AuditLog.created_at.isoformat() if log.AuditLog.created_at else None,
                "status": "Succès" if log.AuditLog.status == "success" else "Échec",
                "status_code": log.AuditLog.status,
                "details": log.AuditLog.details
            }
            for log in items
        ],
        "stats": {
            "total_actions": total_actions,
            "failed_attempts": failed_attempts,
            "today_actions": today_actions,
            "suspicious_ips": suspicious_ips
        },
        "universities": [{"id": u.id, "name": u.name} for u in all_univs],
        "total": total,
        "page": page,
        "per_page": per_page
    }


# ==========================================
# 🚨 CENTRE DES INCIDENTS & ALERTES TECHNIQUES
# ==========================================
class CrashReport(BaseModel):
    url: Optional[str] = None
    api_url: Optional[str] = None
    error_message: str
    error_code: Optional[int] = None
    stack_trace: Optional[str] = None
    component: Optional[str] = None
    action_attempted: Optional[str] = None


@router.post("/report-incident")
def report_client_incident(
    data: CrashReport,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Reçoit un crash report automatique depuis le frontend quand un utilisateur clique sur
    quelque chose qui échoue, et crée un incident détaillé pour le Super-Admin.
    """
    from app.models.incident import Incident
    from app.models.notification import Notification

    user_id = None
    user_name = "Utilisateur Inconnu"
    user_role = "visiteur"
    university_id = 1
    university_name = "Plateforme UniSphere"

    token = None
    auth_hdr = request.headers.get("Authorization") or request.headers.get("authorization")
    if auth_hdr and auth_hdr.lower().startswith("bearer "):
        token = auth_hdr.split(" ", 1)[1].strip()
    if not token:
        token = request.query_params.get("token")

    if token:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            email = payload.get("sub")
            if email:
                u = db.query(User).filter(User.email == email).first()
                if u:
                    user_id = u.id
                    user_name = u.full_name
                    user_role = u.role
                    if u.university_id:
                        university_id = u.university_id
                        univ = db.query(University).filter(University.id == u.university_id).first()
                        if univ:
                            university_name = univ.name
        except Exception:
            pass

    incident_title = f"Crash / Bug : {data.error_message[:120]}"
    incident_desc = (
        f"🚨 Incident technique automatique :\n"
        f"• Utilisateur : {user_name} ({user_role})\n"
        f"• Établissement : {university_name}\n"
        f"• Page : {data.url or 'N/A'}\n"
        f"• API appelée : {data.api_url or 'N/A'}\n"
        f"• Code : {data.error_code or 500}\n"
        f"• Message d'erreur : {data.error_message}\n"
        f"• Trace / Contexte : {data.stack_trace or data.component or 'N/A'}"
    )

    inc = Incident(
        title=incident_title[:250],
        description=incident_desc,
        incident_type="system_crash",
        severity="high" if (data.error_code and data.error_code >= 500) else "medium",
        status="open",
        location=data.url or "Web App",
        reported_by=user_id or 1,
        university_id=university_id
    )
    db.add(inc)

    super_admins = db.query(User).filter(User.role.in_(["super_admin", "superadmin"])).all()
    for sa in super_admins:
        notif = Notification(
            title=f"🚨 Bug signalé : {data.error_message[:60]}",
            message=f"{user_name} ({user_role}) sur {university_name} a rencontré un problème sur {data.url}.",
            type="error",
            recipient_id=sa.id,
            university_id=university_id,
            is_read=False
        )
        db.add(notif)

    db.commit()

    return {"status": "recorded", "incident_id": inc.id}


@router.get("/incidents")
def get_superadmin_incidents(
    university_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin"))
):
    from app.models.incident import Incident
    query = db.query(Incident, University.name.label("university_name"))\
        .outerjoin(University, Incident.university_id == University.id)

    if university_id:
        query = query.filter(Incident.university_id == university_id)
    if status:
        query = query.filter(Incident.status == status)

    incidents = query.order_by(Incident.created_at.desc()).limit(100).all()

    all_univs = db.query(University.id, University.name).filter(University.is_active == True).all()

    return {
        "incidents": [
            {
                "id": inc.Incident.id,
                "title": inc.Incident.title,
                "description": inc.Incident.description,
                "incident_type": inc.Incident.incident_type,
                "severity": inc.Incident.severity,
                "status": inc.Incident.status,
                "location": inc.Incident.location,
                "university_id": inc.Incident.university_id,
                "university_name": inc.university_name or "Plateforme Globale",
                "created_at": inc.Incident.created_at.isoformat() if inc.Incident.created_at else None,
                "updated_at": inc.Incident.updated_at.isoformat() if inc.Incident.updated_at else None
            }
            for inc in incidents
        ],
        "universities": [{"id": u.id, "name": u.name} for u in all_univs]
    }


@router.put("/incidents/{incident_id}/status")
def update_incident_status(
    incident_id: int,
    data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin"))
):
    from app.models.incident import Incident
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident non trouvé")
    new_status = data.get("status", "resolved")
    inc.status = new_status
    db.commit()
    return {"message": f"Statut de l'incident mis à jour : {new_status}"}


@router.get("/universities-list")
def get_all_universities_detailed(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin"))
):
    from app.models.student import Student
    from app.models.user import User

    univs = db.query(University).order_by(University.created_at.desc()).all()
    results = []
    for u in univs:
        student_count = db.query(Student).filter(Student.university_id == u.id).count()
        teacher_count = db.query(User).filter(User.university_id == u.id, User.role == "teacher").count()
        admin_user = db.query(User).filter(User.university_id == u.id, User.role == "admin").first()
        results.append({
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "phone": u.phone,
            "country": u.country,
            "custom_domain": u.custom_domain,
            "is_active": u.is_active,
            "status": u.status or ("active" if u.is_active else "suspended"),
            "student_count": student_count,
            "teacher_count": teacher_count,
            "admin_name": admin_user.full_name if admin_user else "Non assigné",
            "admin_email": admin_user.email if admin_user else "N/A",
            "created_at": u.created_at.isoformat() if u.created_at else None
        })
    return results


@router.put("/universities/{university_id}/toggle-status")
def toggle_university_status(
    university_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin"))
):
    univ = db.query(University).filter(University.id == university_id).first()
    if not univ:
        raise HTTPException(status_code=404, detail="Université introuvable")
    
    univ.is_active = not univ.is_active
    univ.status = "active" if univ.is_active else "suspended"
    db.commit()
    
    state = "réactivée" if univ.is_active else "suspendue"
    return {"message": f"Université {univ.name} {state} avec succès", "is_active": univ.is_active, "status": univ.status}


# ==========================================
# BILLING CONFIGURATIONS (SaaS Universités)
# ==========================================
@router.get("/billing-configs")
def get_all_billing_configs(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin"))
):
    univs = db.query(University).order_by(University.name.asc()).all()
    today = date.today()
    results = []

    for u in univs:
        cfg = db.query(UniversityBillingConfig).filter(UniversityBillingConfig.university_id == u.id).first()
        if not cfg:
            # Création automatique de la configuration par défaut si manquante
            cfg = UniversityBillingConfig(
                university_id=u.id,
                billing_model="monthly",
                amount=250000.0,
                maintenance_enabled=True,
                maintenance_interval_months=6,
                maintenance_amount=350000.0,
                last_maintenance_date=today,
                next_maintenance_date=today + timedelta(days=180),
                contract_start_date=today
            )
            db.add(cfg)
            db.commit()
            db.refresh(cfg)

        invoices = db.query(ClientInvoice).filter(ClientInvoice.university_id == u.id, ClientInvoice.status != "cancelled").all()
        total_invoiced = sum(i.amount for i in invoices)
        payments = db.query(ClientPayment).join(ClientInvoice).filter(ClientInvoice.university_id == u.id).all()
        total_paid = sum(p.amount for p in payments)

        results.append({
            "id": cfg.id,
            "university_id": u.id,
            "university_name": u.name,
            "university_email": u.email,
            "is_active": u.is_active,
            "billing_model": cfg.billing_model or "monthly",
            "amount": cfg.amount or 0.0,
            "maintenance_enabled": bool(cfg.maintenance_enabled),
            "maintenance_interval_months": cfg.maintenance_interval_months or 6,
            "maintenance_amount": cfg.maintenance_amount or 0.0,
            "last_maintenance_date": cfg.last_maintenance_date.isoformat() if cfg.last_maintenance_date else None,
            "next_maintenance_date": cfg.next_maintenance_date.isoformat() if cfg.next_maintenance_date else None,
            "contract_start_date": cfg.contract_start_date.isoformat() if cfg.contract_start_date else None,
            "contract_end_date": cfg.contract_end_date.isoformat() if cfg.contract_end_date else None,
            "notes": cfg.notes,
            "total_invoiced": total_invoiced,
            "total_paid": total_paid,
            "balance_due": max(0.0, total_invoiced - total_paid),
            "invoices_count": len(invoices)
        })

    return results


@router.put("/billing-configs/{university_id}")
def update_billing_config(
    university_id: int,
    data: BillingConfigUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin"))
):
    univ = db.query(University).filter(University.id == university_id).first()
    if not univ:
        raise HTTPException(status_code=404, detail="Université introuvable")

    cfg = db.query(UniversityBillingConfig).filter(UniversityBillingConfig.university_id == university_id).first()
    if not cfg:
        cfg = UniversityBillingConfig(university_id=university_id)
        db.add(cfg)

    if data.billing_model is not None:
        cfg.billing_model = data.billing_model
    if data.amount is not None:
        cfg.amount = data.amount
    if data.maintenance_enabled is not None:
        cfg.maintenance_enabled = data.maintenance_enabled
    if data.maintenance_interval_months is not None:
        cfg.maintenance_interval_months = data.maintenance_interval_months
    if data.maintenance_amount is not None:
        cfg.maintenance_amount = data.maintenance_amount
    if data.last_maintenance_date:
        cfg.last_maintenance_date = datetime.strptime(data.last_maintenance_date, "%Y-%m-%d").date()
    if data.next_maintenance_date:
        cfg.next_maintenance_date = datetime.strptime(data.next_maintenance_date, "%Y-%m-%d").date()
    if data.contract_start_date:
        cfg.contract_start_date = datetime.strptime(data.contract_start_date, "%Y-%m-%d").date()
    if data.contract_end_date:
        cfg.contract_end_date = datetime.strptime(data.contract_end_date, "%Y-%m-%d").date()
    if data.notes is not None:
        cfg.notes = data.notes

    db.commit()
    db.refresh(cfg)

    return {"message": f"Configuration de facturation mise à jour pour {univ.name}", "config_id": cfg.id}


@router.post("/billing-configs/{university_id}/generate-invoice")
def generate_config_invoice(
    university_id: int,
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin"))
):
    univ = db.query(University).filter(University.id == university_id).first()
    if not univ:
        raise HTTPException(status_code=404, detail="Université introuvable")

    cfg = db.query(UniversityBillingConfig).filter(UniversityBillingConfig.university_id == university_id).first()
    if not cfg:
        raise HTTPException(status_code=400, detail="Configuration de facturation inexistante")

    category = payload.get("category", "subscription")  # subscription, maintenance, direct_sale
    due_days = int(payload.get("due_days", 30))
    today = date.today()
    due_date = today + timedelta(days=due_days)
    inv_num = generate_invoice_number(db)

    if category == "maintenance":
        amount = cfg.maintenance_amount or 350000.0
        title = f"Maintenance & Suivi Semestriel (6 mois) - {univ.name}"
        desc = f"Forfait de maintenance technique, mises à jour, sauvegardes et support dédié 6 mois pour {univ.name}."
        inv_type = "maintenance"
        # Bumping dates
        cfg.last_maintenance_date = today
        cfg.next_maintenance_date = today + timedelta(days=180)
    elif category == "direct_sale":
        amount = cfg.amount or 15000000.0
        title = f"Acquisition Licence Perpétuelle (Vente Directe) - {univ.name}"
        desc = f"Licence définitive d'utilisation logicielle UniSphere pour {univ.name}."
        inv_type = "direct_sale"
    else:
        # Subscription (monthly or yearly)
        model_label = "Mensuel" if cfg.billing_model == "monthly" else "Annuel"
        amount = cfg.amount or 250000.0
        title = f"Abonnement SaaS ({model_label}) - {univ.name}"
        desc = f"Facturation de la période d'abonnement UniSphere ({model_label}) pour {univ.name}."
        inv_type = "subscription"

    inv = ClientInvoice(
        invoice_number=inv_num,
        university_id=univ.id,
        title=title,
        description=desc,
        amount=amount,
        issue_date=today,
        due_date=due_date,
        status="pending",
        invoice_type=inv_type,
        notes=payload.get("notes") or f"Généré automatiquement depuis la configuration tarifaire."
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)

    return {
        "message": f"Facture {inv_num} générée avec succès pour {univ.name}",
        "invoice_id": inv.id,
        "invoice_number": inv.invoice_number,
        "amount": inv.amount
    }


# ==========================================
# FEATURE REQUESTS (Fonctionnalités sur mesure)
# ==========================================
@router.get("/feature-requests")
def get_feature_requests(
    university_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin"))
):
    query = db.query(FeatureRequest)
    if university_id:
        query = query.filter(FeatureRequest.university_id == university_id)
    if status and status != "all":
        query = query.filter(FeatureRequest.status == status)

    features = query.order_by(FeatureRequest.created_at.desc()).all()
    results = []

    for f in features:
        univ = f.university
        inv = f.invoice
        results.append({
            "id": f.id,
            "university_id": f.university_id,
            "university_name": univ.name if univ else "Inconnu",
            "title": f.title,
            "description": f.description,
            "amount": f.amount,
            "status": f.status,
            "requested_date": f.requested_date.isoformat() if f.requested_date else None,
            "completed_date": f.completed_date.isoformat() if f.completed_date else None,
            "invoice_id": f.invoice_id,
            "invoice_number": inv.invoice_number if inv else None,
            "invoice_status": inv.status if inv else None,
            "notes": f.notes,
            "created_at": f.created_at.isoformat() if f.created_at else None
        })

    return results


@router.post("/feature-requests")
def create_feature_request(
    data: FeatureRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin"))
):
    univ = db.query(University).filter(University.id == data.university_id).first()
    if not univ:
        raise HTTPException(status_code=404, detail="Université introuvable")

    req_date = datetime.strptime(data.requested_date, "%Y-%m-%d").date() if data.requested_date else date.today()

    feat = FeatureRequest(
        university_id=data.university_id,
        title=data.title,
        description=data.description,
        amount=data.amount,
        status=data.status or "pending",
        requested_date=req_date,
        notes=data.notes
    )
    db.add(feat)
    db.commit()
    db.refresh(feat)

    return {"message": "Demande de fonctionnalité créée avec succès", "feature_id": feat.id}


@router.put("/feature-requests/{feature_id}")
def update_feature_request(
    feature_id: int,
    data: FeatureRequestUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin"))
):
    feat = db.query(FeatureRequest).filter(FeatureRequest.id == feature_id).first()
    if not feat:
        raise HTTPException(status_code=404, detail="Fonctionnalité introuvable")

    if data.title is not None:
        feat.title = data.title
    if data.description is not None:
        feat.description = data.description
    if data.amount is not None:
        feat.amount = data.amount
    if data.status is not None:
        feat.status = data.status
    if data.completed_date:
        feat.completed_date = datetime.strptime(data.completed_date, "%Y-%m-%d").date()
    if data.notes is not None:
        feat.notes = data.notes

    db.commit()
    db.refresh(feat)

    return {"message": "Demande de fonctionnalité mise à jour", "feature_id": feat.id}


@router.post("/feature-requests/{feature_id}/generate-invoice")
def generate_feature_invoice(
    feature_id: int,
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin"))
):
    feat = db.query(FeatureRequest).filter(FeatureRequest.id == feature_id).first()
    if not feat:
        raise HTTPException(status_code=404, detail="Fonctionnalité introuvable")

    univ = feat.university
    if not univ:
        raise HTTPException(status_code=404, detail="Université associée introuvable")

    today = date.today()
    due_days = int(payload.get("due_days", 30))
    inv_num = generate_invoice_number(db)

    inv = ClientInvoice(
        invoice_number=inv_num,
        university_id=univ.id,
        title=f"Développement Spécifique : {feat.title}",
        description=feat.description or f"Facturation de la fonctionnalité sur mesure demandée par {univ.name}.",
        amount=feat.amount,
        issue_date=today,
        due_date=today + timedelta(days=due_days),
        status="pending",
        invoice_type="feature_request",
        notes=f"Liée à la demande de fonctionnalité #{feat.id}"
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)

    feat.invoice_id = inv.id
    feat.status = "billed"
    db.commit()

    return {
        "message": f"Facture {inv_num} émise pour la fonctionnalité '{feat.title}'",
        "invoice_id": inv.id,
        "invoice_number": inv.invoice_number,
        "amount": inv.amount
    }


@router.delete("/feature-requests/{feature_id}")
def delete_feature_request(
    feature_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin"))
):
    feat = db.query(FeatureRequest).filter(FeatureRequest.id == feature_id).first()
    if not feat:
        raise HTTPException(status_code=404, detail="Fonctionnalité introuvable")

    db.delete(feat)
    db.commit()
    return {"message": "Demande supprimée avec succès"}


# ==========================================
# SERVER & DATABASE HEALTH / INTERVENTION
# ==========================================
@router.get("/system/health")
def get_system_health(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin"))
):
    # Disk usage
    total, used, free = shutil.disk_usage(".")
    total_gb = round(total / (1024**3), 2)
    used_gb = round(used / (1024**3), 2)
    free_gb = round(free / (1024**3), 2)
    used_percent = round((used / total) * 100, 1)

    # Database file size
    db_file = os.path.join(os.path.dirname(__file__), "..", "..", "unisphere.db")
    db_size_mb = 0.0
    if os.path.exists(db_file):
        db_size_mb = round(os.path.getsize(db_file) / (1024**2), 2)

    # Integrity check
    integrity_result = "OK"
    try:
        check = db.execute(text("PRAGMA integrity_check")).fetchone()
        if check and check[0] != "ok":
            integrity_result = str(check[0])
    except Exception as e:
        integrity_result = f"Erreur: {str(e)}"

    # Table row counts
    tables_to_count = [
        "universities", "users", "students", "teachers", "courses",
        "grades", "attendances", "payments", "client_invoices",
        "client_payments", "feature_requests", "audit_logs", "incidents"
    ]
    table_stats = []
    for tbl in tables_to_count:
        try:
            cnt = db.execute(text(f"SELECT COUNT(*) FROM {tbl}")).scalar() or 0
            table_stats.append({"table": tbl, "count": cnt})
        except Exception:
            pass

    return {
        "disk": {
            "total_gb": total_gb,
            "used_gb": used_gb,
            "free_gb": free_gb,
            "used_percent": used_percent,
            "status": "warning" if used_percent > 85 else ("critical" if used_percent > 95 else "healthy")
        },
        "database": {
            "file_size_mb": db_size_mb,
            "integrity": integrity_result,
            "engine": "SQLite 3",
            "path": os.path.abspath(db_file) if os.path.exists(db_file) else "Inconnu"
        },
        "table_stats": table_stats,
        "server_time": datetime.now().isoformat()
    }


@router.post("/system/vacuum")
def optimize_database(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin"))
):
    db_file = os.path.join(os.path.dirname(__file__), "..", "..", "unisphere.db")
    before_size = os.path.getsize(db_file) if os.path.exists(db_file) else 0

    try:
        # SQLite VACUUM cannot run inside a transaction
        db.commit()
        # Create an isolated connection for VACUUM
        import sqlite3
        con = sqlite3.connect(db_file)
        con.execute("VACUUM")
        con.execute("ANALYZE")
        con.close()

        after_size = os.path.getsize(db_file) if os.path.exists(db_file) else 0
        reclaimed_kb = max(0, round((before_size - after_size) / 1024, 2))

        return {
            "message": "Base de données compactée et index optimisés (VACUUM & ANALYZE) avec succès.",
            "before_size_mb": round(before_size / (1024**2), 2),
            "after_size_mb": round(after_size / (1024**2), 2),
            "reclaimed_kb": reclaimed_kb
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Échec de l'optimisation : {str(e)}")


@router.post("/system/clean-logs")
def clean_system_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin"))
):
    cutoff = datetime.now() - timedelta(days=90)
    try:
        from app.models.incident import Incident
        # Clean older resolved incidents
        deleted_incidents = db.query(Incident).filter(Incident.status == "resolved", Incident.created_at < cutoff).delete()
        
        # Clean older audit logs
        try:
            from app.models.audit_log import AuditLog
            deleted_logs = db.query(AuditLog).filter(AuditLog.created_at < cutoff).delete()
        except Exception:
            deleted_logs = 0

        db.commit()
        return {
            "message": f"Nettoyage effectué : {deleted_logs} journaux d'audit et {deleted_incidents} incidents résolus (>90 jours) supprimés.",
            "deleted_logs": deleted_logs,
            "deleted_incidents": deleted_incidents
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur lors du nettoyage : {str(e)}")

