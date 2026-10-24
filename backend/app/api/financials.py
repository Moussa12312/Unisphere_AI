from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, desc
from datetime import datetime, timedelta, date
from pydantic import BaseModel
from typing import Optional
from app.database.connection import SessionLocal
from app.models.user import User
from app.models.student import Student
from app.models.payment import Payment
from app.core.dependencies import require_role
from app.models.university import University
from app.models.academic_fee import AcademicFee
from app.models.payment_tranche import PaymentTranche
from app.models.academic_config import AcademicConfig
from app.utils.academic_year import get_current_academic_year

router = APIRouter(prefix="/financials", tags=["Financials"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ==========================================
# SCHÉMAS
# ==========================================
class PaymentCreate(BaseModel):
    student_id: int
    amount: float
    payment_type: str
    payment_method: str
    description: Optional[str] = None
    academic_year: Optional[str] = None
    tranche_id: Optional[int] = None

class InstallmentPaymentRequest(BaseModel):
    amount: float
    payment_method: str = "cash"
    description: Optional[str] = None

# ==========================================
# DASHBOARD - Vue d'ensemble
# ==========================================
@router.get("/overview")
def get_financial_overview(
    period: str = "year",
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "accountant"))
):
    from app.models.payment_installment import PaymentInstallment
    
    university_id = current_user.university_id
    now = datetime.now()
    
    if period == "month":
        start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    elif period == "quarter":
        start_date = now - timedelta(days=90)
    else:
        start_date = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)

    total_revenue = db.query(
        func.coalesce(func.sum(Payment.amount), 0)
    ).filter(
        Payment.university_id == university_id,
        Payment.status.in_(["completed", "partial"]),
        Payment.created_at >= start_date
    ).scalar()

    unpaid = db.query(
        func.coalesce(func.sum(Payment.amount), 0)
    ).filter(
        Payment.university_id == university_id,
        Payment.status == "failed"
    ).scalar()

    late = db.query(
        func.coalesce(func.sum(PaymentInstallment.balance), 0)
    ).filter(
        PaymentInstallment.university_id == university_id,
        PaymentInstallment.status.in_(["pending", "partial"])
    ).scalar()

    total_expected = total_revenue + late
    collection_rate = (total_revenue / total_expected * 100) if total_expected > 0 else 100.0

    total_payments = db.query(
        func.count(Payment.id)
    ).filter(
        Payment.university_id == university_id,
        Payment.status.in_(["completed", "partial"]),
        Payment.created_at >= start_date
    ).scalar()

    return {
        "total_revenue": total_revenue,
        "unpaid": unpaid,
        "late": late,
        "collection_rate": round(collection_rate, 1),
        "total_payments": total_payments,
        "period": period
    }

# ==========================================
# LISTE DES PAIEMENTS
# ==========================================
@router.get("/payments")
def get_payments(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    student_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "accountant"))
):
    query = db.query(Payment).filter(
        Payment.university_id == current_user.university_id
    )
    
    if student_id:
        query = query.filter(Payment.student_id == student_id)
    
    total = query.count()
    payments = query.order_by(Payment.created_at.desc()) \
        .offset((page - 1) * limit) \
        .limit(limit) \
        .all()
    
    # ✅ Calculer le total des montants
    total_amount = sum(p.amount for p in payments)
    
    return {
        "payments": payments,
        "total": total,
        "page": page,
        "limit": limit,
        "total_amount": total_amount  # ✅ Calculé, pas une colonne
    }

# ==========================================
# CRÉER UN PAIEMENT
# ==========================================
@router.post("/payments")
def create_payment(
    data: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "accountant"))
):
    from app.models.academic_fee import AcademicFee
    from app.models.payment_deadline import PaymentDeadline
    from app.models.payment_installment import PaymentInstallment
    
    # 1. Vérifier l'étudiant
    student = db.query(Student).filter(
        Student.id == data.student_id,
        Student.university_id == current_user.university_id
    ).first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Étudiant non trouvé")
    
    # ✅ 2. VÉRIFICATION CRITIQUE : Empêcher les doubles paiements
    academic_year = data.academic_year or get_current_academic_year(db, current_user.university_id)
    
    if data.payment_type in ["inscription", "scolarite"]:
        # Vérifier si l'étudiant a déjà payé ce type pour cette année
        existing_payment = db.query(Payment).filter(
            Payment.student_id == data.student_id,
            Payment.payment_type == data.payment_type,
            Payment.academic_year == academic_year,
            Payment.university_id == current_user.university_id,
            Payment.status == "completed"
        ).first()
        
        if existing_payment:
            raise HTTPException(
                status_code=400,
                detail=f"Cet étudiant a déjà payé sa {data.payment_type} pour l'année {academic_year}. "
                       f"Référence : {existing_payment.reference}"
            )
    
    # 3. Récupérer le montant total configuré (en prenant en compte Domaine + Remise négociée)
    from app.utils.tuition import resolve_student_tuition_breakdown
    breakdown = resolve_student_tuition_breakdown(db, student, current_user.university_id, data.payment_type)
    total_amount = breakdown["net_amount"]
    
    # 4. Vérifier que le montant ne dépasse pas le total
    if data.amount > total_amount:
        raise HTTPException(
            status_code=400,
            detail=f"Le montant ({data.amount} FCFA) dépasse le total dû ({total_amount} FCFA)"
        )
    
    # 5. Calculer le reliquat
    balance = total_amount - data.amount
    
    # 6. Générer référence et numéro de reçu
    import secrets
    reference = f"PAY-{datetime.now().strftime('%Y%m%d')}-{secrets.token_hex(4).upper()}"
    receipt_number = f"REC-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    status = "completed" if balance <= 0 else "partial"
    
    # 7. Créer le paiement
    payment = Payment(
        student_id=data.student_id,
        amount=data.amount,
        total_amount=total_amount,
        balance=balance,
        level=student.level,
        payment_type=data.payment_type,
        payment_method=data.payment_method,
        description=data.description,
        academic_year=academic_year,
        reference=reference,
        receipt_number=receipt_number,
        status=status,
        university_id=current_user.university_id,
        created_by=current_user.id,
        payment_plan="single"
    )
    
    db.add(payment)
    db.commit()
    db.refresh(payment)
    
    # 8. Créer un échéancier si reliquat
    if balance > 0:
        exams_deadline = db.query(PaymentDeadline).filter(
            PaymentDeadline.university_id == current_user.university_id,
            PaymentDeadline.deadline_type == "exams_s2",
            PaymentDeadline.academic_year == academic_year
        ).first()
        
        due_date = exams_deadline.deadline_date if exams_deadline else datetime(2026, 5, 15)
        
        installment = PaymentInstallment(
            payment_id=payment.id,
            student_id=data.student_id,
            amount_due=balance,
            amount_paid=0,
            balance=balance,
            installment_number=1,
            total_installments=1,
            due_date=due_date,
            status="pending",
            is_exam_blocked=False,
            description=f"Reliquat {data.payment_type} - {student.level}",
            university_id=current_user.university_id
        )
        
        db.add(installment)
        db.commit()
    
    return {
        "message": "Paiement enregistré avec succès",
        "payment": {
            "id": payment.id,
            "reference": payment.reference,
            "receipt_number": payment.receipt_number,
            "amount": payment.amount,
            "total_amount": payment.total_amount,
            "balance": payment.balance,
            "status": payment.status
        }
    }

# ==========================================
# DÉTAIL D'UN PAIEMENT
# ==========================================
@router.get("/payments/{payment_id}")
def get_payment_detail(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "accountant"))
):
    payment = db.query(Payment).filter(
        Payment.id == payment_id,
        Payment.university_id == current_user.university_id
    ).first()
    
    if not payment:
        raise HTTPException(status_code=404, detail="Paiement non trouvé")
    
    student = db.query(Student).filter(Student.id == payment.student_id).first()
    
    return {
        "id": payment.id,
        "student": {
            "id": student.id,
            "name": f"{student.first_name} {student.last_name}",
            "matricule": student.matricule
        },
        "amount": payment.amount,
        "currency": payment.currency,
        "payment_type": payment.payment_type,
        "payment_method": payment.payment_method,
        "status": payment.status,
        "reference": payment.reference,
        "receipt_number": payment.receipt_number,
        "description": payment.description,
        "academic_year": payment.academic_year,
        "created_at": payment.created_at.strftime("%Y-%m-%d %H:%M") if payment.created_at else ""
    }

# ==========================================
# IMPAYÉS
# ==========================================
@router.get("/unpaid")
def get_unpaid_students(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "accountant", "secretary", "censeur"))
):
    """Récupère les étudiants avec des échéances en retard"""
    
    from app.models.payment_tranche import PaymentTranche
    from datetime import datetime, date
    
    students = db.query(Student).filter(
        Student.university_id == current_user.university_id
    ).all()
    
    unpaid_students = []
    today = date.today()
    
    for student in students:
        # Récupérer les tranches configurées (dédoublonnées et adaptées à l'année courante et au domaine)
        from app.utils.tuition import get_configured_tranches_for_student
        configured_tranches = get_configured_tranches_for_student(db, student, current_user.university_id, 0)
        
        if not configured_tranches:
            continue
        
        # Récupérer tous les paiements (triés par date)
        payments = db.query(Payment).filter(
            Payment.student_id == student.id
        ).order_by(Payment.created_at.asc()).all()
        
        total_paid = sum(float(p.amount) for p in payments if p.amount)
        
        # ✅✅✅ LOGIQUE CORRIGÉE : Associer les paiements aux tranches
        # Une tranche est "payée" si le cumul des paiements >= cumul des tranches
        paid_tranche_ids = set()
        cumulative_paid = 0.0
        cumulative_tranches = 0.0
        
        for tranche in configured_tranches:
            tranche_amount = float(tranche.amount)
            cumulative_tranches += tranche_amount
            
            # Si le total payé >= cumul des tranches jusqu'ici → tranche payée
            if total_paid >= cumulative_tranches:
                paid_tranche_ids.add(tranche.id)
        
        # ✅ Chercher les tranches EN RETARD
        overdue_tranches = []
        total_overdue = 0
        
        for tranche in configured_tranches:
            # Échéance dépassée ET tranche non payée
            if tranche.due_date and tranche.due_date.date() < today:
                if tranche.id not in paid_tranche_ids:
                    overdue_tranches.append({
                        "tranche_id": tranche.id,
                        "tranche_name": tranche.tranche_name,
                        "amount": float(tranche.amount),
                        "due_date": tranche.due_date.date().isoformat()
                    })
                    total_overdue += float(tranche.amount)
        
        # ✅ Si au moins une tranche en retard → étudiant avec impayé
        if overdue_tranches:
            total_due = sum(float(t.amount) for t in configured_tranches)
            
            # Récupérer la configuration de pénalité de l'établissement
            from app.models.academic_config import AcademicConfig
            ac_config = db.query(AcademicConfig).filter(
                AcademicConfig.university_id == current_user.university_id
            ).first()
            penalty_rate = getattr(ac_config, "penalty_amount", 5000.0) if ac_config else 5000.0
            penalty_auto = getattr(ac_config, "penalty_auto_apply", True) if ac_config else True
            penalty_total = (len(overdue_tranches) * penalty_rate) if penalty_auto else 0.0
            
            unpaid_students.append({
                "student_id": student.id,
                "student_name": f"{student.first_name} {student.last_name}",
                "matricule": student.matricule,
                "level": student.level,
                "filiere": student.filiere,
                "total_due": total_due,
                "total_paid": total_paid,
                "balance": total_due - total_paid,
                "overdue_amount": total_overdue,
                "penalty_amount": penalty_total,
                "total_with_penalties": total_overdue + penalty_total,
                "overdue_count": len(overdue_tranches),
                "overdue_tranches": overdue_tranches,
                "pending_count": len(overdue_tranches)
            })
    
    # Trier par montant en retard décroissant
    unpaid_students.sort(key=lambda x: x["overdue_amount"], reverse=True)
    
    return unpaid_students

# ==========================================
# ÉVOLUTION MENSUELLE
# ==========================================
@router.get("/monthly")
def get_monthly_financials(
    months: int = 6,
    period: str = "year",
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "accountant"))
):
    university_id = current_user.university_id
    now = datetime.now()
    
    if period == "month":
        cutoff_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    elif period == "quarter":
        cutoff_date = now - timedelta(days=90)
    else:
        cutoff_date = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    
    results = db.query(
        extract('year', Payment.created_at).label('year'),
        extract('month', Payment.created_at).label('month'),
        Payment.status,
        func.sum(Payment.amount).label('total')
    ).filter(
        Payment.university_id == university_id,
        Payment.created_at >= cutoff_date
    ).group_by('year', 'month', Payment.status).order_by('year', 'month').all()

    month_names = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
    
    monthly_data = {}
    for year, month, status, total in results:
        m = int(month)
        key = month_names[m - 1]
        if key not in monthly_data:
            monthly_data[key] = {"revenus": 0, "impayes": 0}
        
        if status in ["completed", "partial"]:
            monthly_data[key]["revenus"] += total
        elif status in ["pending", "failed"]:
            monthly_data[key]["impayes"] += total

    data = [{"month": k, **v} for k, v in monthly_data.items()]
    
    if not data:
        if period == "month":
            data.append({"month": month_names[now.month - 1], "revenus": 0, "impayes": 0})
        elif period == "quarter":
            for i in range(3):
                idx = (now.month - 3 + i) % 12
                data.append({"month": month_names[idx], "revenus": 0, "impayes": 0})
        else:
            for i in range(min(months, 12)):
                idx = (now.month - months + i) % 12
                data.append({"month": month_names[idx], "revenus": 0, "impayes": 0})
            
    return data

# ==========================================
# RÉPARTITION PAR TYPE
# ==========================================
@router.get("/types")
def get_payment_types(
    period: str = "year",
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "accountant"))
):
    university_id = current_user.university_id
    now = datetime.now()
    
    if period == "month":
        start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    elif period == "quarter":
        start_date = now - timedelta(days=90)
    else:
        start_date = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    
    results = db.query(
        Payment.payment_type,
        func.sum(Payment.amount).label('total')
    ).filter(
        Payment.university_id == university_id,
        Payment.status.in_(["completed", "partial"]),
        Payment.created_at >= start_date
    ).group_by(Payment.payment_type).all()

    colors = ['#FF6B00', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899']
    
    data = []
    total_amount = sum([r[1] for r in results]) if results else 1
    
    labels = {
        'scolarite': 'Scolarité',
        'inscription': 'Inscription',
        'reliquat': 'Reliquat',
        'autre': 'Autre'
    }
    
    for idx, (ptype, total) in enumerate(results):
        percentage = round((total / total_amount) * 100, 1)
        data.append({
            "name": labels.get(ptype, ptype or "Autre"),
            "value": percentage,
            "color": colors[idx % len(colors)]
        })
        
    if not data:
        data = [{"name": "Aucun paiement", "value": 100, "color": "#94a3b8"}]
        
    return data

# ==========================================
# TRANSACTIONS RÉCENTES
# ==========================================
@router.get("/transactions")
def get_recent_transactions(
    limit: int = 5,
    period: str = "year",
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "accountant"))
):
    university_id = current_user.university_id
    now = datetime.now()
    
    if period == "month":
        start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    elif period == "quarter":
        start_date = now - timedelta(days=90)
    else:
        start_date = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    
    results = db.query(
        Payment.id,
        Payment.amount,
        Payment.payment_type,
        Payment.status,
        Payment.created_at,
        Student.first_name,
        Student.last_name
    ).join(Student, Student.id == Payment.student_id).filter(
        Payment.university_id == university_id,
        Payment.created_at >= start_date
    ).order_by(desc(Payment.created_at)).limit(limit).all()

    return [
        {
            "id": r.id,
            "student": f"{r.first_name} {r.last_name}",
            "amount": r.amount,
            "type": r.payment_type or "Autre",
            "status": r.status,
            "date": r.created_at.strftime("%Y-%m-%d") if r.created_at else ""
        }
        for r in results
    ]

# ==========================================
# ÉTAT DES PAIEMENTS PAR MOIS
# ==========================================
@router.get("/status")
def get_payment_status(
    months: int = 6,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "accountant"))
):
    university_id = current_user.university_id
    cutoff_date = datetime.now() - timedelta(days=months * 30)
    
    results = db.query(
        extract('month', Payment.created_at).label('month'),
        Payment.status,
        func.count(Payment.id).label('count')
    ).filter(
        Payment.university_id == university_id,
        Payment.created_at >= cutoff_date
    ).group_by('month', Payment.status).order_by('month').all()

    month_names = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
    
    monthly_data = {}
    for month, status, count in results:
        m = int(month)
        key = month_names[m - 1]
        if key not in monthly_data:
            monthly_data[key] = {"payes": 0, "retard": 0, "impayes": 0}
            
        if status == "completed":
            monthly_data[key]["payes"] += count
        elif status == "pending":
            monthly_data[key]["retard"] += count
        elif status == "failed":
            monthly_data[key]["impayes"] += count

    data = [{"month": k, **v} for k, v in monthly_data.items()]
    
    if not data:
        for i in range(months):
            idx = (datetime.now().month - months + i) % 12
            data.append({"month": month_names[idx], "payes": 0, "retard": 0, "impayes": 0})
            
    return data

# ==========================================
# LISTE DES ÉCHÉANCES
# ==========================================
@router.get("/installments")
def get_installments(
    status: Optional[str] = None,
    student_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "accountant"))
):
    from app.models.payment_installment import PaymentInstallment
    
    university_id = current_user.university_id
    
    query = db.query(
        PaymentInstallment.id,
        PaymentInstallment.amount_due,
        PaymentInstallment.amount_paid,
        PaymentInstallment.balance,
        PaymentInstallment.due_date,
        PaymentInstallment.status,
        PaymentInstallment.is_exam_blocked,
        PaymentInstallment.description,
        Student.first_name,
        Student.last_name,
        Student.matricule,
        Student.level
    ).join(Student, Student.id == PaymentInstallment.student_id).filter(
        PaymentInstallment.university_id == university_id
    )
    
    if status:
        query = query.filter(PaymentInstallment.status == status)
    if student_id:
        query = query.filter(PaymentInstallment.student_id == student_id)
    
    installments = query.order_by(PaymentInstallment.due_date).all()
    
    return [
        {
            "id": i.id,
            "student_name": f"{i.first_name} {i.last_name}",
            "matricule": i.matricule,
            "level": i.level,
            "amount_due": i.amount_due,
            "amount_paid": i.amount_paid,
            "balance": i.balance,
            "due_date": i.due_date.strftime("%Y-%m-%d") if i.due_date else "",
            "status": i.status,
            "is_exam_blocked": i.is_exam_blocked,
            "description": i.description
        }
        for i in installments
    ]

# ==========================================
# PAYER UNE ÉCHÉANCE (CORRIGÉ - SANS DOUBLE COMPTAGE)
# ==========================================
@router.post("/installments/{installment_id}/pay")
def pay_installment(
    installment_id: int,
    data: InstallmentPaymentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "accountant"))
):
    """Payer un reliquat - SANS MODIFIER LE PAIEMENT INITIAL"""
    from app.models.payment_installment import PaymentInstallment
    
    university_id = current_user.university_id
    
    installment = db.query(PaymentInstallment).filter(
        PaymentInstallment.id == installment_id,
        PaymentInstallment.university_id == university_id
    ).first()
    
    if not installment:
        raise HTTPException(status_code=404, detail="Échéance non trouvée")
    
    if installment.status == "completed":
        raise HTTPException(status_code=400, detail="Cette échéance est déjà payée")
    
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Le montant doit être supérieur à 0")
    
    if data.amount > installment.balance:
        raise HTTPException(
            status_code=400, 
            detail=f"Le montant ({data.amount}) dépasse le reliquat ({installment.balance})"
        )
    
    # ✅ ÉTAPE 1 : Mettre à jour l'échéance
    installment.amount_paid += data.amount
    installment.balance -= data.amount
    installment.paid_at = datetime.now()
    
    if installment.balance <= 0.01:
        installment.balance = 0
        installment.status = "completed"
    else:
        installment.status = "partial"
    
    # ✅ ÉTAPE 2 : Mettre à jour le paiement principal
    # ⚠️ IMPORTANT : NE PAS TOUCHER À payment.amount !
    payment = db.query(Payment).filter(Payment.id == installment.payment_id).first()
    if payment:
        # ❌ NE JAMAIS FAIRE : payment.amount += data.amount (ça crée le double comptage)
        # ✅ SEULEMENT : réduire balance et mettre à jour status
        payment.balance -= data.amount
        if payment.balance <= 0.01:
            payment.balance = 0
            payment.status = "completed"
        else:
            payment.status = "partial"
    
    # ✅ ÉTAPE 3 : Créer un NOUVEAU paiement pour tracer la transaction
    import secrets
    reference = f"PAY-{datetime.now().strftime('%Y%m%d')}-{secrets.token_hex(4).upper()}"
    receipt_number = f"REC-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    student = db.query(Student).filter(Student.id == installment.student_id).first()
    
    new_payment = Payment(
        student_id=installment.student_id,
        amount=data.amount,  # ✅ Seulement le montant du reliquat payé
        total_amount=data.amount,
        balance=0,
        level=student.level if student else None,
        payment_type="reliquat",  # ✅ Type spécial pour distinguer
        payment_method=data.payment_method,
        description=data.description or f"Reliquat - {student.level if student else ''}",
        academic_year=payment.academic_year if payment else get_current_academic_year(db, university_id),
        reference=reference,
        receipt_number=receipt_number,
        status="completed",
        university_id=university_id,
        created_by=current_user.id,
        payment_plan="single"
    )
    db.add(new_payment)
    db.commit()
    
    return {
        "message": "Paiement du reliquat enregistré avec succès",
        "installment": {
            "id": installment.id,
            "amount_paid": installment.amount_paid,
            "balance": installment.balance,
            "status": installment.status
        },
        "payment": {
            "id": new_payment.id,
            "reference": new_payment.reference,
            "receipt_number": new_payment.receipt_number,
            "amount": new_payment.amount
        }
    }

# ==========================================
# STATS RELIQUATS
# ==========================================
@router.get("/installments/stats")
def get_installments_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "accountant"))
):
    from app.models.payment_installment import PaymentInstallment
    
    university_id = current_user.university_id
    
    total_balance = db.query(
        func.coalesce(func.sum(PaymentInstallment.balance), 0)
    ).filter(
        PaymentInstallment.university_id == university_id,
        PaymentInstallment.status.in_(["pending", "partial"])
    ).scalar()
    
    students_with_balance = db.query(
        func.count(func.distinct(PaymentInstallment.student_id))
    ).filter(
        PaymentInstallment.university_id == university_id,
        PaymentInstallment.status.in_(["pending", "partial"])
    ).scalar()
    
    blocked_count = db.query(
        func.count(PaymentInstallment.id)
    ).filter(
        PaymentInstallment.university_id == university_id,
        PaymentInstallment.is_exam_blocked == True
    ).scalar()
    
    return {
        "total_balance": total_balance,
        "students_with_balance": students_with_balance,
        "blocked_count": blocked_count
    }

# ==========================================
# HISTORIQUE D'UN ÉTUDIANT
# ==========================================
@router.get("/student/{student_id}/history")
def get_student_payment_history(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "accountant"))
):
    from app.models.payment_installment import PaymentInstallment
    
    university_id = current_user.university_id
    
    student = db.query(Student).filter(
        Student.id == student_id,
        Student.university_id == university_id
    ).first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Étudiant non trouvé")
    
    payments = db.query(Payment).filter(
        Payment.student_id == student_id,
        Payment.university_id == university_id
    ).order_by(desc(Payment.created_at)).all()
    
    installments = db.query(PaymentInstallment).filter(
        PaymentInstallment.student_id == student_id,
        PaymentInstallment.university_id == university_id
    ).order_by(PaymentInstallment.due_date).all()
    
    # ✅ CORRECTION : Calculer total_paid SANS double comptage
    # On additionne seulement les paiements "initiaux" (pas les reliquats)
    total_paid = sum(
        p.amount for p in payments 
        if p.status in ["completed", "partial"] and p.payment_type != "reliquat"
    )
    
    # Ajouter les paiements de reliquats séparément pour info
    reliquats_paid = sum(
        p.amount for p in payments 
        if p.status == "completed" and p.payment_type == "reliquat"
    )
    
    total_balance = sum(i.balance for i in installments if i.status in ["pending", "partial"])
    
    return {
        "student": {
            "id": student.id,
            "name": f"{student.first_name} {student.last_name}",
            "matricule": student.matricule,
            "level": student.level,
            "filiere": student.filiere
        },
        "summary": {
            "total_paid": total_paid + reliquats_paid,  
            "initial_paid": total_paid,  
            "reliquats_paid": reliquats_paid,  
            "total_balance": total_balance,
            "payments_count": len(payments),
            "installments_count": len(installments)
        },
        "payments": [
            {
                "id": p.id,
                "amount": p.amount,
                "total_amount": p.amount,
                "balance": 0,
                "payment_type": p.payment_type,
                "payment_method": p.payment_method,
                "status": p.status,
                "reference": p.reference,
                "receipt_number": p.receipt_number,
                "created_at": p.created_at.strftime("%Y-%m-%d %H:%M") if p.created_at else ""
            }
            for p in payments
        ],
        "installments": [
            {
                "id": i.id,
                "amount_due": i.amount_due,
                "amount_paid": i.amount_paid,
                "balance": i.balance,
                "due_date": i.due_date.strftime("%Y-%m-%d") if i.due_date else "",
                "status": i.status,
                "is_exam_blocked": i.is_exam_blocked,
                "description": i.description
            }
            for i in installments
        ]
    }

# ==========================================
# BLOQUER/DÉBLOQUER EXAMENS
# ==========================================
@router.put("/student/{student_id}/exam-block")
def toggle_exam_block(
    student_id: int,
    block: bool,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "accountant"))
):
    from app.models.payment_installment import PaymentInstallment
    
    university_id = current_user.university_id
    
    installments = db.query(PaymentInstallment).filter(
        PaymentInstallment.student_id == student_id,
        PaymentInstallment.university_id == university_id,
        PaymentInstallment.status.in_(["pending", "partial"])
    ).all()
    
    for installment in installments:
        installment.is_exam_blocked = block
    
    db.commit()
    
    action = "bloqué" if block else "débloqué"
    return {"message": f"Étudiant {action} pour les examens", "installments_updated": len(installments)}

# ==========================================
# GÉNÉRATION DE REÇU
# ==========================================
@router.get("/receipt/{payment_id}")
def get_payment_receipt(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "accountant", "secretary", "censeur", "student"))
):
    """Récupère les détails complets d'un paiement - logique par tranches"""
    
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Paiement non trouvé")
    
    student = db.query(Student).filter(Student.id == payment.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Étudiant non trouvé")
    
    university = db.query(University).filter(University.id == current_user.university_id).first()
    
    # ✅ Récupérer le créateur
    creator = None
    created_by_id = getattr(payment, 'created_by', None)
    if created_by_id:
        creator = db.query(User).filter(User.id == created_by_id).first()
    if not creator:
        creator = current_user
    
    # ✅ RÉCUPÉRER LES TRANCHES CONFIGURÉES DÉDOUBLONNÉES
    from app.utils.tuition import get_configured_tranches_for_student
    configured_tranches = get_configured_tranches_for_student(db, student, current_user.university_id, 0)
    
    # ✅ Total dû = somme des tranches
    total_amount = sum(float(t.amount) for t in configured_tranches) if configured_tranches else 0
    
    # ✅ RÉCUPÉRER TOUS LES PAIEMENTS
    all_payments = db.query(Payment).filter(
        Payment.student_id == payment.student_id
    ).order_by(Payment.created_at.asc()).all()
    
    total_paid_real = sum(float(p.amount) for p in all_payments if p.amount)
    
    # ✅✅✅ LOGIQUE : Déterminer la ventilation exacte des paiements sur les tranches
    paid_tranches = []
    remaining_tranches = []
    rem_alloc = float(total_paid_real)

    for tranche in configured_tranches:
        tranche_amount = float(tranche.amount)
        if rem_alloc >= tranche_amount and tranche_amount > 0:
            tranche_paid = tranche_amount
            st = "paid"
            rem_alloc -= tranche_amount
        elif rem_alloc > 0:
            tranche_paid = rem_alloc
            st = "partial"
            rem_alloc = 0
        else:
            tranche_paid = 0.0
            st = "pending"

        tr_data = {
            "tranche_number": tranche.tranche_number,
            "tranche_name": tranche.tranche_name,
            "amount": round(tranche_amount),
            "paid_amount": round(tranche_paid),
            "remaining": round(max(0, tranche_amount - tranche_paid)),
            "due_date": tranche.due_date.isoformat() if tranche.due_date else None,
            "status": st
        }
        if st == "paid":
            paid_tranches.append(tr_data)
        else:
            remaining_tranches.append(tr_data)

    # ✅ Le total payé réel et le reste à payer réel sans perdre aucun centime
    total_paid = round(total_paid_real)
    balance = round(max(0, total_amount - total_paid_real))
    paid_percentage = round((total_paid / total_amount) * 100) if total_amount > 0 else 0

    # Statut
    if paid_percentage >= 100:
        status = "paid"
    elif paid_percentage > 0:
        status = "partial"
    else:
        status = "unpaid"
    
    return {
        "receipt": {
            "payment": {
                "id": payment.id,
                "reference": getattr(payment, 'reference', None) or f"PAY-{payment.id:06d}",
                "receipt_number": getattr(payment, 'receipt_number', None) or f"REC-{datetime.now().year}-{payment.id:06d}",
                "amount": payment.amount,
                "total_amount": total_amount,
                "total_paid": total_paid,  # ✅ Somme des tranches payées
                "balance": balance,  # ✅ Somme des tranches restantes
                "paid_percentage": paid_percentage,
                "payment_type": payment.payment_type,
                "payment_method": payment.payment_method,
                "description": payment.description,
                "status": status,
                "created_at": payment.created_at.isoformat() if payment.created_at else None,
                "payment_date": getattr(payment, 'payment_date', None).isoformat() if getattr(payment, 'payment_date', None) else None
            },
            "student": {
                "id": student.id,
                "name": f"{student.first_name} {student.last_name}",
                "matricule": student.matricule,
                "level": student.level,
                "filiere": student.filiere
            },
            "university": {
                "name": university.name if university else "Université",
                "address": getattr(university, 'address', '') if university else '',
                "phone": getattr(university, 'phone', '') if university else '',
                "email": getattr(university, 'email', '') if university else '',
                "logo": getattr(university, 'logo', None) if university else None
            },
            "creator": {
                "name": creator.full_name if creator else "Comptable",
                "role": creator.role if creator else "accountant"
            },
            "tranches": {
                "paid": paid_tranches,
                "remaining": remaining_tranches,
                "total_paid": total_paid,
                "total_remaining": balance,
                "paid_percentage": paid_percentage,
                "payments_count": len(all_payments),
                "configured_count": len(configured_tranches)
            }
        }
    }


# ==========================================
# 📄 QUITUS FINANCIER & CERTIFICAT DE SOLDE PDF
# ==========================================
@router.get("/me/quitus-pdf")
def get_my_quitus_pdf(
    academic_year: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student"))
):
    """Télécharge le Quitus Financier officiel de l'étudiant connecté"""
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Profil étudiant introuvable")

    university = db.query(University).filter(University.id == student.university_id).first()
    year = academic_year or get_current_academic_year(db, student.university_id)

    payments = db.query(Payment).filter(
        Payment.student_id == student.id,
        Payment.university_id == student.university_id,
        Payment.status.in_(["completed", "partial"])
    ).order_by(Payment.created_at.asc()).all()

    from app.services.pdf_generator import generate_financial_clearance_pdf
    pdf_bytes = generate_financial_clearance_pdf(
        student=student,
        university=university,
        payments=payments,
        academic_year=year
    )

    filename = f"quitus_financier_{student.matricule or student.id}_{year.replace('/', '-')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/students/{student_id}/quitus-pdf")
def get_student_quitus_pdf(
    student_id: int,
    academic_year: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "accountant", "secretary", "censeur", "student"))
):
    """Génère le Quitus Financier officiel et certificat de solde en PDF sécurisé"""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Étudiant introuvable")

    if current_user.role == "student" and student.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    university = db.query(University).filter(University.id == student.university_id).first()
    year = academic_year or get_current_academic_year(db, student.university_id)

    payments = db.query(Payment).filter(
        Payment.student_id == student_id,
        Payment.university_id == student.university_id,
        Payment.status.in_(["completed", "partial"])
    ).order_by(Payment.created_at.asc()).all()

    from app.services.pdf_generator import generate_financial_clearance_pdf
    pdf_bytes = generate_financial_clearance_pdf(
        student=student,
        university=university,
        payments=payments,
        academic_year=year
    )

    filename = f"quitus_financier_{student.matricule or student.id}_{year.replace('/', '-')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ==========================================
# 📄 CENTRE DE TOUS LES REÇUS DE L'ÉTABLISSEMENT
# ==========================================
@router.get("/all-receipts")
def get_all_receipts(
    type_filter: Optional[str] = Query("all", description="all, tuition, expense, payroll, cash"),
    period: Optional[str] = Query("all", description="all, today, week, month, year"),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "accountant", "secretary"))
):
    """
    Récupère TOUS les reçus et justificatifs officiels émis par l'établissement :
    - Reçus de paiement de scolarité (étudiants)
    - Bons de décaissement (dépenses / fournisseurs)
    - Bulletins / Reçus de paiement de salaire (personnel)
    - Bons d'opération de trésorerie / caisse
    """
    from app.models.accounting import Expense, PayrollEntry, CashTransaction, BankAccount
    university_id = current_user.university_id
    today = date.today()

    start_date = None
    if period == "today":
        start_date = today
    elif period == "week":
        start_date = today - timedelta(days=7)
    elif period == "month":
        start_date = today.replace(day=1)
    elif period == "year":
        start_date = today.replace(month=1, day=1)

    all_receipts = []

    # 1. Reçus de scolarité (Payment)
    if type_filter in ["all", "tuition"]:
        q_pay = db.query(Payment).filter(
            Payment.university_id == university_id,
            Payment.status.in_(["completed", "partial"])
        )
        if start_date:
            q_pay = q_pay.filter(Payment.payment_date >= start_date)
        payments = q_pay.order_by(Payment.payment_date.desc(), Payment.id.desc()).all()

        for p in payments:
            st = p.student
            st_name = f"{st.first_name} {st.last_name}" if st else "Étudiant inconnu"
            matricule = st.matricule if st else "—"
            filiere = st.filiere if st else "—"
            level = st.level if st else "—"
            
            p_date_str = p.payment_date.isoformat() if p.payment_date else (p.created_at.date().isoformat() if p.created_at else str(today))
            rec_num = p.receipt_number or f"REC-{p.id:06d}"
            
            all_receipts.append({
                "id": f"tuition-{p.id}",
                "original_id": p.id,
                "type": "tuition",
                "type_label": "Scolarité",
                "receipt_number": rec_num,
                "reference": p.reference or f"REF-{p.id}",
                "party_name": st_name,
                "party_detail": f"{matricule} • {level} {filiere}".strip(),
                "party_matricule": matricule,
                "amount": float(p.amount),
                "direction": "credit",
                "payment_method": p.payment_method or "especes",
                "date": p_date_str,
                "status": "completed",
                "description": p.description or f"Paiement scolarité ({p.payment_type})",
                "student_id": p.student_id,
                "print_url": f"/accountant/payments/receipt/{p.id}"
            })

    # 2. Bons de décaissement (Expense)
    if type_filter in ["all", "expense"]:
        q_exp = db.query(Expense).filter(
            Expense.university_id == university_id,
            Expense.status.in_(["paid", "completed"])
        )
        if start_date:
            q_exp = q_exp.filter(Expense.expense_date >= start_date)
        expenses = q_exp.order_by(Expense.expense_date.desc(), Expense.id.desc()).all()

        for exp in expenses:
            sup_name = exp.supplier.name if exp.supplier else "Bénéficiaire divers"
            cat_name = exp.category.name if exp.category else "Charge générale"
            rec_num = exp.reference or f"BD-{exp.expense_date.strftime('%Y%m%d') if exp.expense_date else 'EXP'}-{exp.id:04d}"
            exp_date_str = exp.expense_date.isoformat() if exp.expense_date else str(today)

            all_receipts.append({
                "id": f"expense-{exp.id}",
                "original_id": exp.id,
                "type": "expense",
                "type_label": "Bon de Décaissement",
                "receipt_number": rec_num,
                "reference": exp.reference or f"EXP-{exp.id}",
                "party_name": sup_name,
                "party_detail": cat_name,
                "party_matricule": "Fournisseur",
                "amount": float(exp.amount),
                "direction": "debit",
                "payment_method": exp.payment_method or "virement",
                "date": exp_date_str,
                "status": "completed",
                "description": exp.title or "Dépense de fonctionnement",
                "expense_id": exp.id,
                "print_url": f"/accountant/receipts?view=expense&id={exp.id}"
            })

    # 3. Bulletins / Reçus de Salaire (PayrollEntry)
    if type_filter in ["all", "payroll"]:
        q_payr = db.query(PayrollEntry).filter(
            PayrollEntry.university_id == university_id,
            PayrollEntry.status == "paid"
        )
        if start_date:
            q_payr = q_payr.filter(PayrollEntry.paid_date >= start_date)
        payrolls = q_payr.order_by(PayrollEntry.paid_date.desc(), PayrollEntry.id.desc()).all()

        for pr in payrolls:
            staff_user = pr.user
            staff_name = f"{staff_user.first_name} {staff_user.last_name}" if staff_user else "Personnel"
            role_label = getattr(staff_user, "role", "Personnel") if staff_user else "Personnel"
            pr_date = pr.paid_date or (pr.created_at.date() if pr.created_at else today)
            rec_num = f"BS-{pr.period.replace('-', '')}-{pr.id:04d}"

            all_receipts.append({
                "id": f"payroll-{pr.id}",
                "original_id": pr.id,
                "type": "payroll",
                "type_label": "Bulletin de Salaire",
                "receipt_number": rec_num,
                "reference": f"PAY-{pr.period}-{pr.id}",
                "party_name": staff_name,
                "party_detail": f"Poste : {role_label} • Période : {pr.period}",
                "party_matricule": "Personnel",
                "amount": float(pr.net_salary),
                "direction": "debit",
                "payment_method": "virement",
                "date": pr_date.isoformat(),
                "status": "completed",
                "description": f"Rémunération période {pr.period}",
                "payroll_id": pr.id,
                "print_url": f"/accountant/receipts?view=payroll&id={pr.id}"
            })

    # 4. Bons de Caisse / Trésorerie (CashTransaction)
    if type_filter in ["all", "cash"]:
        q_cash = db.query(CashTransaction).filter(
            CashTransaction.university_id == university_id
        )
        if start_date:
            q_cash = q_cash.filter(CashTransaction.transaction_date >= start_date)
        cash_txs = q_cash.order_by(CashTransaction.transaction_date.desc(), CashTransaction.id.desc()).all()

        for ct in cash_txs:
            b_acc = db.query(BankAccount).filter(BankAccount.id == ct.bank_account_id).first()
            acc_name = b_acc.name if b_acc else "Caisse / Banque"
            tx_type_str = "Entrée de caisse" if ct.transaction_type == "in" else ("Sortie de caisse" if ct.transaction_type == "out" else "Virement interne")
            rec_num = f"BC-{ct.transaction_date.strftime('%Y%m%d') if ct.transaction_date else 'TX'}-{ct.id:04d}"

            all_receipts.append({
                "id": f"cash-{ct.id}",
                "original_id": ct.id,
                "type": "cash",
                "type_label": "Bon de Caisse",
                "receipt_number": rec_num,
                "reference": f"TX-{ct.id}",
                "party_name": acc_name,
                "party_detail": tx_type_str,
                "party_matricule": "Trésorerie",
                "amount": float(ct.amount),
                "direction": "credit" if ct.transaction_type == "in" else "debit",
                "payment_method": "especes",
                "date": ct.transaction_date.isoformat() if ct.transaction_date else str(today),
                "status": "completed",
                "description": ct.description or tx_type_str,
                "cash_id": ct.id,
                "print_url": f"/accountant/receipts?view=cash&id={ct.id}"
            })

    if search:
        s_low = search.lower()
        all_receipts = [
            r for r in all_receipts
            if s_low in r["party_name"].lower()
            or s_low in r["receipt_number"].lower()
            or s_low in r["reference"].lower()
            or s_low in r["description"].lower()
            or s_low in r["party_detail"].lower()
        ]

    all_receipts.sort(key=lambda x: (x["date"], x["id"]), reverse=True)

    total_count = len(all_receipts)
    total_credit = sum(r["amount"] for r in all_receipts if r["direction"] == "credit")
    total_debit = sum(r["amount"] for r in all_receipts if r["direction"] == "debit")

    return {
        "receipts": all_receipts,
        "total_count": total_count,
        "total_credit": total_credit,
        "total_debit": total_debit,
        "tuition_count": sum(1 for r in all_receipts if r["type"] == "tuition"),
        "expense_count": sum(1 for r in all_receipts if r["type"] == "expense"),
        "payroll_count": sum(1 for r in all_receipts if r["type"] == "payroll"),
        "cash_count": sum(1 for r in all_receipts if r["type"] == "cash"),
    }


@router.get("/expense-receipt/{expense_id}")
def get_expense_receipt(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "accountant"))
):
    """Génère les données officielles pour imprimer le Bon de Décaissement"""
    from app.models.accounting import Expense
    expense = db.query(Expense).filter(Expense.id == expense_id, Expense.university_id == current_user.university_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Dépense non trouvée")
    university = db.query(University).filter(University.id == current_user.university_id).first()
    creator = db.query(User).filter(User.id == expense.created_by).first() if expense.created_by else current_user

    return {
        "voucher": {
            "id": expense.id,
            "voucher_number": expense.reference or f"BD-{expense.expense_date.strftime('%Y%m%d') if expense.expense_date else 'EXP'}-{expense.id:04d}",
            "reference": expense.reference,
            "title": expense.title,
            "description": expense.description,
            "amount": float(expense.amount),
            "date": expense.expense_date.isoformat() if expense.expense_date else str(date.today()),
            "payment_method": expense.payment_method,
            "status": expense.status,
            "category_name": expense.category.name if expense.category else "Général",
            "supplier_name": expense.supplier.name if expense.supplier else "Bénéficiaire divers",
            "supplier_phone": expense.supplier.phone if expense.supplier else None,
            "supplier_address": expense.supplier.address if expense.supplier else None
        },
        "university": {
            "name": university.name if university else "Université",
            "address": university.address if university else "",
            "phone": university.phone if university else "",
            "email": university.email if university else "",
            "logo": university.logo if university else None
        },
        "creator": {
            "name": f"{creator.first_name} {creator.last_name}" if creator else "Service Comptabilité",
            "role": getattr(creator, "role", "Comptable") if creator else "Comptable"
        }
    }


@router.get("/payroll-receipt/{payroll_id}")
def get_payroll_receipt(
    payroll_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "accountant"))
):
    """Génère les données officielles pour imprimer le Bulletin de Salaire"""
    from app.models.accounting import PayrollEntry
    entry = db.query(PayrollEntry).filter(PayrollEntry.id == payroll_id, PayrollEntry.university_id == current_user.university_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Bulletin non trouvé")
    university = db.query(University).filter(University.id == current_user.university_id).first()
    staff = entry.user

    return {
        "payslip": {
            "id": entry.id,
            "slip_number": f"BS-{entry.period.replace('-', '')}-{entry.id:04d}",
            "period": entry.period,
            "gross_salary": float(entry.gross_salary),
            "deductions": float(entry.deductions or 0),
            "net_salary": float(entry.net_salary),
            "paid_date": entry.paid_date.isoformat() if entry.paid_date else str(date.today()),
            "status": entry.status
        },
        "staff": {
            "id": staff.id if staff else None,
            "name": f"{staff.first_name} {staff.last_name}" if staff else "Employé",
            "email": staff.email if staff else "",
            "role": staff.role if staff else "Personnel"
        },
        "university": {
            "name": university.name if university else "Université",
            "address": university.address if university else "",
            "phone": university.phone if university else "",
            "logo": university.logo if university else None
        }
    }