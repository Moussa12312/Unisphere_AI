from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel

from app.database.connection import SessionLocal
from app.models.user import User
from app.models.university import University
from app.models.student import Student
from app.models.client_billing import ClientInvoice, ClientPayment
from app.core.dependencies import get_current_user, require_role

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
    notes: Optional[str] = None

class InvoiceUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    issue_date: Optional[str] = None
    due_date: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class PaymentCreate(BaseModel):
    invoice_id: int
    amount: float
    payment_date: str
    payment_method: str = "virement"
    reference: Optional[str] = None
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
        notes=data.notes
    )

    db.add(invoice)
    db.commit()
    db.refresh(invoice)

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
