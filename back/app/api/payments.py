from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import Optional
from datetime import datetime, date
from pydantic import BaseModel
import random
import string

from app.database.connection import SessionLocal
from app.models.payment import Payment
from app.models.payment_tranche import PaymentTranche  
from app.models.student import Student
from app.models.user import User
from dateutil.relativedelta import relativedelta


from app.core.dependencies import require_role

router = APIRouter(prefix="/payments", tags=["Payments"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class PaymentCreate(BaseModel):
    student_id: int
    amount: float
    payment_type: str = "scolarite"
    payment_method: str = "cash"
    currency: str = "FCFA"
    description: Optional[str] = None
    payment_date: Optional[str] = None
    tranche_id: Optional[int] = None


def generate_reference(prefix: str = "PAY") -> str:
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"{prefix}-{timestamp}-{random_str}"


@router.post("/")
def create_payment(
    data: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "accountant"))
):
    # 1. Vérifier l'étudiant
    student = db.query(Student).filter(
        Student.id == data.student_id,
        Student.university_id == current_user.university_id
    ).first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Étudiant non trouvé")

    # 2. ✅ CALCULER LE MONTANT TOTAL DÛ
    total_amount = 0
    try:
        from app.models.academic_fee import AcademicFee
        fee = db.query(AcademicFee).filter(
            AcademicFee.level == student.level,
            AcademicFee.payment_type == data.payment_type,
            AcademicFee.university_id == current_user.university_id
        ).first()
        if fee:
            total_amount = fee.amount
    except Exception:
        total_amount = 450000  # Fallback
    
    # 3. ✅ CALCULER LE TOTAL DÉJÀ PAYÉ
    existing_payments = db.query(Payment).filter(
        Payment.student_id == data.student_id,
        Payment.status == "completed"
    ).all()
    total_paid = sum(p.amount for p in existing_payments if p.amount)
    
    # 4. ✅ VÉRIFIER SI LE MONTANT DÛ EST ATTEINT
    remaining = max(0, total_amount - total_paid)
    
    if remaining <= 0:
        raise HTTPException(
            status_code=400,
            detail=f"Le montant total dû ({total_amount:,.0f} FCFA) est déjà entièrement payé. Aucun paiement supplémentaire n'est possible."
        )
    
    # 5. ✅ AJUSTER LE MONTANT SI NÉCESSAIRE
    payment_amount = data.amount
    if payment_amount > remaining:
        # Ajuster automatiquement au reste à payer
        payment_amount = remaining
    
    # 6. Générer les références
    reference = generate_reference("PAY")
    receipt_number = f"REC-{datetime.now().strftime('%Y%m%d')}-{datetime.now().microsecond:04d}"

    pay_date = datetime.now().date()
    if data.payment_date:
        try:
            pay_date = datetime.strptime(data.payment_date, "%Y-%m-%d").date()
        except ValueError:
            # ✅ CORRIGÉ : avant, une date invalide était silencieusement remplacée par
            # la date du jour → un paiement pouvait être enregistré avec une mauvaise date
            # sans que le comptable s'en rende compte. Maintenant on prévient clairement.
            raise HTTPException(
                status_code=400,
                detail="Format de date de paiement invalide (attendu: AAAA-MM-JJ)"
            )

    # 7. Créer le paiement
    new_payment = Payment(
        student_id=data.student_id,
        university_id=current_user.university_id,
        amount=payment_amount,
        currency=data.currency,
        payment_type=data.payment_type,
        payment_method=data.payment_method,
        reference=reference,
        receipt_number=receipt_number,
        status="completed",
        description=data.description,
        payment_date=pay_date,
        paid_by=current_user.id,
        tranche_id=data.tranche_id
    )
    
    db.add(new_payment)
    db.commit()
    db.refresh(new_payment)

    # ✅ AJOUTÉ : génère automatiquement l'écriture comptable correspondante
    # (jamais bloquant : si ça échoue, le paiement reste bien enregistré)
    try:
        from app.api.ledger import create_journal_entry_for_payment
        create_journal_entry_for_payment(db, current_user.university_id, new_payment)
    except Exception as _e:
        print(f"⚠️ Génération d'écriture comptable échouée pour le paiement {new_payment.id}: {str(_e)}")

    # 8. Calculer le nouveau solde
    new_total_paid = total_paid + payment_amount
    new_remaining = max(0, total_amount - new_total_paid)

    return {
        "id": new_payment.id,
        "reference": new_payment.reference,
        "receipt_number": receipt_number,
        "amount": new_payment.amount,
        "payment_type": new_payment.payment_type,
        "payment_method": new_payment.payment_method,
        "status": new_payment.status,
        "payment_date": str(new_payment.payment_date),
        "paid_by": new_payment.paid_by,
        "tranche_id": new_payment.tranche_id,
        "student_id": new_payment.student_id,
        "total_amount": total_amount,
        "total_paid": new_total_paid,
        "remaining": new_remaining,
        "message": f"Paiement de {payment_amount:,.0f} FCFA enregistré avec succès"
    }


@router.get("/")
def get_payments(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    student_id: Optional[int] = None,
    payment_type: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "accountant"))
):
    query = db.query(Payment).filter(
        Payment.university_id == current_user.university_id
    )
    
    if student_id:
        query = query.filter(Payment.student_id == student_id)
    if payment_type:
        query = query.filter(Payment.payment_type == payment_type)
    if status:
        query = query.filter(Payment.status == status)

    total = query.count()
    total_pages = (total + page_size - 1) // page_size
    
    payments = query.order_by(Payment.created_at.desc()) \
        .offset((page - 1) * page_size) \
        .limit(page_size) \
        .all()

    return {
        "data": payments,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }


@router.get("/stats")
def get_payment_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "accountant"))
):
    university_id = current_user.university_id

    total_revenue = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
        Payment.university_id == university_id,
        Payment.status == "completed"
    ).scalar() or 0
    
    total_pending = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
        Payment.university_id == university_id,
        Payment.status == "pending"
    ).scalar() or 0
    
    total_payments = db.query(func.count(Payment.id)).filter(
        Payment.university_id == university_id,
        Payment.status == "completed"
    ).scalar() or 0

    by_type = dict(
        db.query(Payment.payment_type, func.sum(Payment.amount))
        .filter(Payment.university_id == university_id, Payment.status == "completed")
        .group_by(Payment.payment_type)
        .all()
    )
    
    by_month = dict(
        db.query(extract('month', Payment.payment_date), func.sum(Payment.amount))
        .filter(
            Payment.university_id == university_id,
            Payment.status == "completed",
            Payment.payment_date != None
        )
        .group_by(extract('month', Payment.payment_date))
        .all()
    )

    recent = db.query(Payment).filter(
        Payment.university_id == university_id,
        Payment.status == "completed"
    ).order_by(Payment.created_at.desc()).limit(5).all()

    return {
        "total_revenue": total_revenue,
        "total_pending": total_pending,
        "total_payments": total_payments,
        "by_type": by_type,
        "by_month": by_month,
        "recent_payments": recent
    }

# ✅ STATISTIQUES GLOBALES DES PAIEMENTS
@router.get("/summary")
def get_payments_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "accountant"))
):
    """Récupère les statistiques globales des paiements"""
    
    # Récupérer tous les étudiants de l'université
    students = db.query(Student).filter(
        Student.university_id == current_user.university_id
    ).all()
    
    total_due = 0
    total_paid = 0
    paid_students = 0
    late_students = 0
    
    try:
        from app.models.academic_fee import AcademicFee
    except ImportError:
        AcademicFee = None
    
    for student in students:
        # Montant dû pour cet étudiant
        student_amount = 450000  # Valeur par défaut
        if AcademicFee:
            fee = db.query(AcademicFee).filter(
                AcademicFee.level == student.level,
                AcademicFee.payment_type == 'scolarite',
                AcademicFee.university_id == current_user.university_id
            ).first()
            if fee:
                student_amount = fee.amount
        
        # Montant payé
        payments = db.query(Payment).filter(
            Payment.student_id == student.id
        ).all()
        student_paid = sum(p.amount for p in payments if p.amount)
        
        total_due += student_amount
        total_paid += student_paid
        
        if student_paid >= student_amount:
            paid_students += 1
        elif student_paid > 0 and student_paid < student_amount:
            # Vérifier si en retard
            late_students += 1
    
    return {
        "total_due": total_due,
        "total_paid": total_paid,
        "total_remaining": max(0, total_due - total_paid),
        "students_count": len(students),
        "paid_students": paid_students,
        "late_students": late_students,
        "payment_rate": round((total_paid / total_due) * 100, 1) if total_due > 0 else 0
    }
    
# ✅ RÉSUMÉ DES PAIEMENTS D'UN ÉTUDIANT
@router.get("/student/{student_id}/summary")
def get_student_payment_summary(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "accountant", "secretary"))
):
    """Récupère le résumé des paiements d'un étudiant avec tranches configurées"""
    
    # 1. Vérifier l'étudiant
    student = db.query(Student).filter(
        Student.id == student_id,
        Student.university_id == current_user.university_id
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Étudiant non trouvé")
    
    # 2. Récupérer tous les paiements de l'étudiant
    payments = db.query(Payment).filter(
        Payment.student_id == student_id,
        Payment.status == "completed"
    ).order_by(Payment.created_at.asc()).all()
    
    # 3. Calculer le montant total dû
    total_amount = 0
    try:
        from app.models.academic_fee import AcademicFee
        fee = db.query(AcademicFee).filter(
            AcademicFee.level == student.level,
            AcademicFee.payment_type == 'scolarite',
            AcademicFee.university_id == current_user.university_id
        ).first()
        if fee:
            total_amount = fee.amount
    except Exception:
        total_amount = 450000
    
    # 4. Calculer le total payé
    total_paid = sum(p.amount for p in payments if p.amount)
    total_remaining = max(0, total_amount - total_paid)
    paid_percentage = round((total_paid / total_amount) * 100) if total_amount > 0 else 0
    
    # Statut global
    if paid_percentage >= 100:
        status = 'paid'
    elif paid_percentage > 0:
        status = 'partial'
    else:
        status = 'unpaid'
    
    # 5. ✅ RÉCUPÉRER LES TRANCHES CONFIGURÉES
    configured_tranches = db.query(PaymentTranche).filter(
        PaymentTranche.university_id == current_user.university_id,
        PaymentTranche.level == student.level,
        PaymentTranche.payment_type == 'scolarite'
    ).order_by(PaymentTranche.tranche_number).all()
    
    # 6. ✅ GÉNÉRER LES TRANCHES AVEC LA BONNE LOGIQUE
    tranches = []
    
    if configured_tranches:
        # ✅ CAS 1 : Tranches configurées existent
        
        # ✅ CAS 1a : Paiement total atteint → TOUTES les tranches payées
        if total_paid >= total_amount and total_amount > 0:
            cumulative = 0
            for ct in configured_tranches:
                tranche_amount = ct.amount or (total_amount * ct.percentage / 100) if total_amount > 0 else 0
                
                # Trouver les paiements associés à cette tranche
                tranche_payments = [p for p in payments if p.tranche_id == ct.id]
                first_payment = tranche_payments[0] if tranche_payments else None
                
                tranches.append({
                    "id": ct.id,
                    "number": ct.tranche_number,
                    "name": ct.tranche_name or f"Tranche {ct.tranche_number}",
                    "amount": round(tranche_amount),
                    "percentage": ct.percentage,
                    "status": "paid",  # ✅ TOUJOURS PAYÉ si total atteint
                    "due_date": ct.due_date.isoformat() if ct.due_date else None,
                    "paid_amount": round(tranche_amount),
                    "remaining": 0,
                    "payment_date": first_payment.payment_date.isoformat() if first_payment and first_payment.payment_date else None,
                    "payment_method": first_payment.payment_method if first_payment else None,
                    "receipt_number": first_payment.receipt_number if first_payment else None
                })
        
        # ✅ CAS 1b : Paiement partiel → Répartir proportionnellement
        else:
            cumulative_paid = 0
            remaining_to_allocate = total_paid
            
            for ct in configured_tranches:
                tranche_amount = ct.amount or (total_amount * ct.percentage / 100) if total_amount > 0 else 0
                
                # Calculer combien de cette tranche est payée
                if remaining_to_allocate >= tranche_amount:
                    # Tranche entièrement payée
                    tranche_paid = tranche_amount
                    tranche_status = "paid"
                    remaining_to_allocate -= tranche_amount
                elif remaining_to_allocate > 0:
                    # Tranche partiellement payée
                    tranche_paid = remaining_to_allocate
                    tranche_status = "available"
                    remaining_to_allocate = 0
                else:
                    # Tranche non payée
                    tranche_paid = 0
                    # ✅ NE PAS VERROUILLER si c'est la première tranche ou si la précédente est payée
                    if len(tranches) == 0 or tranches[-1]['status'] == 'paid':
                        tranche_status = "available"
                    else:
                        tranche_status = "locked"
                
                # Trouver les paiements associés
                tranche_payments = [p for p in payments if p.tranche_id == ct.id]
                first_payment = tranche_payments[0] if tranche_payments else None
                
                tranches.append({
                    "id": ct.id,
                    "number": ct.tranche_number,
                    "name": ct.tranche_name or f"Tranche {ct.tranche_number}",
                    "amount": round(tranche_amount),
                    "percentage": ct.percentage,
                    "status": tranche_status,
                    "due_date": ct.due_date.isoformat() if ct.due_date else None,
                    "paid_amount": round(tranche_paid),
                    "remaining": round(max(0, tranche_amount - tranche_paid)),
                    "payment_date": first_payment.payment_date.isoformat() if first_payment and first_payment.payment_date else None,
                    "payment_method": first_payment.payment_method if first_payment else None,
                    "receipt_number": first_payment.receipt_number if first_payment else None
                })
    else:
        # ✅ CAS 2 : Pas de tranches configurées → Créer 3 tranches par défaut
        tranche_amount = total_amount / 3 if total_amount > 0 else 0
        today = date.today()
        year = today.year
        base_dates = [
            date(year, 10, 31),
            date(year + 1, 1, 31),
            date(year + 1, 4, 30)
        ]
        
        remaining_to_allocate = total_paid
        
        for i in range(3):
            tranche_end = (i + 1) * tranche_amount
            
            # Calculer le statut basé sur le montant payé
            if remaining_to_allocate >= tranche_amount:
                tranche_paid = tranche_amount
                tranche_status = "paid"
                remaining_to_allocate -= tranche_amount
            elif remaining_to_allocate > 0:
                tranche_paid = remaining_to_allocate
                tranche_status = "available"
                remaining_to_allocate = 0
            else:
                tranche_paid = 0
                if i == 0 or (tranches and tranches[-1]['status'] == 'paid'):
                    tranche_status = "available"
                else:
                    tranche_status = "locked"
            
            tranches.append({
                "id": i + 1,
                "number": i + 1,
                "name": f"Tranche {i + 1}",
                "amount": round(tranche_amount),
                "percentage": 33.33,
                "status": tranche_status,
                "due_date": base_dates[i].isoformat(),
                "paid_amount": round(tranche_paid),
                "remaining": round(max(0, tranche_amount - tranche_paid)),
                "payment_date": None,
                "payment_method": None,
                "receipt_number": None
            })
    
    return {
        "student_id": student_id,
        "student_name": f"{student.first_name} {student.last_name}",
        "level": student.level,
        "total_amount": total_amount,
        "total_paid": total_paid,
        "total_remaining": total_remaining,
        "paid_percentage": paid_percentage,
        "status": status,
        "payments_count": len(payments),
        "tranches": tranches,
        "using_configured_tranches": len(configured_tranches) > 0
    }

@router.get("/{payment_id}")
def get_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "accountant"))
):
    payment = db.query(Payment).filter(
        Payment.id == payment_id,
        Payment.university_id == current_user.university_id
    ).first()
    
    if not payment:
        raise HTTPException(status_code=404, detail="Paiement non trouvé")
    
    return payment


