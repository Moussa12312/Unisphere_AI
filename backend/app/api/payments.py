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

    # 2. ✅ CALCULER LE MONTANT TOTAL DÛ (Prise en compte du Domaine + Remise négociée)
    from app.utils.tuition import resolve_student_tuition_breakdown
    breakdown = resolve_student_tuition_breakdown(db, student, current_user.university_id, data.payment_type)
    total_amount = breakdown["net_amount"]
    
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

    # Notification a l etudiant
    if student and getattr(student, 'user_id', None):
        try:
            from app.models.notification import Notification
            notif = Notification(
                title='Paiement valide',
                message=f'Votre versement de {payment_amount:,.0f} {data.currency} ({data.payment_type}) a ete enregistre. Ref: {reference}',
                notification_type='payment',
                type='success',
                recipient_id=student.user_id,
                created_by=current_user.id,
                university_id=current_user.university_id,
                is_read=False,
                extra_data={'payment_id': new_payment.id, 'amount': payment_amount}
            )
            db.add(notif)
            db.commit()
        except Exception as _e:
            print(f'Erreur notif paiement student: {_e}')

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

    student_ids = list({p.student_id for p in payments if p.student_id})
    students_map = {s.id: s for s in db.query(Student).filter(Student.id.in_(student_ids)).all()} if student_ids else {}

    payments_data = []
    for p in payments:
        st = students_map.get(p.student_id)
        st_name = f"{st.first_name} {st.last_name}" if st else "N/A"
        payments_data.append({
            "id": p.id,
            "reference": p.reference,
            "receipt_number": p.receipt_number,
            "amount": p.amount,
            "currency": p.currency or "FCFA",
            "payment_type": p.payment_type,
            "payment_method": p.payment_method,
            "status": p.status,
            "payment_date": str(p.payment_date) if p.payment_date else str(p.created_at),
            "created_at": str(p.created_at),
            "paid_by": p.paid_by,
            "tranche_id": p.tranche_id,
            "student_id": p.student_id,
            "student_name": st_name,
            "matricule": st.matricule if st else "",
            "student": {
                "id": st.id,
                "first_name": st.first_name,
                "last_name": st.last_name,
                "matricule": st.matricule,
                "filiere": st.filiere,
                "level": st.level,
            } if st else None
        })

    return {
        "data": payments_data,
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
    
    from app.utils.tuition import resolve_student_tuition_breakdown
    total_catalog_gross = 0
    total_discounts_granted = 0

    for student in students:
        # Montant net dû pour cet étudiant (domaine + remise déduite)
        breakdown = resolve_student_tuition_breakdown(db, student, current_user.university_id, "scolarite")
        student_amount = breakdown["net_amount"]
        total_catalog_gross += breakdown["base_amount"]
        total_discounts_granted += breakdown["discount_amount"]
        
        # Montant payé
        payments = db.query(Payment).filter(
            Payment.student_id == student.id,
            Payment.status == "completed"
        ).all()
        student_paid = sum(p.amount for p in payments if p.amount)
        
        total_due += student_amount
        total_paid += student_paid
        
        if student_paid >= student_amount and student_amount > 0:
            paid_students += 1
        elif student_paid > 0 and student_paid < student_amount:
            # En retard ou partiel
            late_students += 1
    
    return {
        "total_due": total_due,
        "total_catalog_gross": total_catalog_gross,
        "total_discounts_granted": total_discounts_granted,
        "total_paid": total_paid,
        "total_remaining": max(0, total_due - total_paid),
        "students_count": len(students),
        "paid_students": paid_students,
        "late_students": late_students,
        "payment_rate": round((total_paid / total_due) * 100, 1) if total_due > 0 else 0
    }
    
# ✅ RÉSUMÉ DES PAIEMENTS DE L'ÉTUDIANT CONNECTÉ
@router.get("/me/summary")
def get_my_payment_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student"))
):
    """Récupère l'échéancier et le résumé des paiements de l'étudiant connecté"""
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Profil étudiant non trouvé")
    return get_student_payment_summary(student.id, db=db, current_user=current_user)

# ✅ RÉSUMÉ DES PAIEMENTS D'UN ÉTUDIANT
@router.get("/student/{student_id}/summary")
def get_student_payment_summary(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "accountant", "secretary", "student"))
):
    """Récupère le résumé des paiements d'un étudiant avec tranches configurées ou modalité mensuelle"""
    
    # 1. Vérifier l'étudiant
    if current_user.role == "student":
        student = db.query(Student).filter(
            Student.id == student_id,
            Student.user_id == current_user.id
        ).first()
    else:
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
    
    # 3. Calculer le montant net dû et la décomposition financière
    from app.utils.tuition import resolve_student_tuition_breakdown, get_configured_tranches_for_student, get_monthly_schedule_for_student
    breakdown = resolve_student_tuition_breakdown(db, student, current_user.university_id, "scolarite")
    total_amount = breakdown["net_amount"]
    base_amount = breakdown["base_amount"]
    
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
    
    # 5. ✅ GESTION SELON LE PLAN : MENSUEL VS TRANCHES
    tranches = []
    is_monthly = getattr(student, "payment_plan", "tranches") == "mensuel"
    configured_tranches = []

    if is_monthly:
        # ✅ MODE MENSUEL : Génération de l'échéancier mensuel (Acompte + Mensualités)
        tranches = get_monthly_schedule_for_student(breakdown, total_paid, payments)
    else:
        # ✅ MODE TRANCHES : Tranches configurées (priorité au domaine de l'étudiant)
        configured_tranches = get_configured_tranches_for_student(db, student, current_user.university_id, total_amount)
    
        if configured_tranches:
            # ✅ CAS 1 : Tranches configurées existent
            # Répartition FIFO chronologique rigoureuse des versements réels
            payment_pool = [{"payment": p, "remaining_amount": float(p.amount)} for p in payments]
            
            for idx, ct in enumerate(configured_tranches):
                tranche_amount = float(ct.amount or (total_amount * ct.percentage / 100) if total_amount > 0 else 0)
                tranche_needed = tranche_amount
                tranche_paid = 0.0
                contributing_payments = []

                for pool_item in payment_pool:
                    if tranche_needed <= 0:
                        break
                    if pool_item["remaining_amount"] > 0:
                        allocated = min(tranche_needed, pool_item["remaining_amount"])
                        tranche_paid += allocated
                        tranche_needed -= allocated
                        pool_item["remaining_amount"] -= allocated
                        contributing_payments.append((pool_item["payment"], allocated))

                # Statut de la tranche
                if tranche_paid >= tranche_amount and tranche_amount > 0:
                    tranche_status = "paid"
                elif tranche_paid > 0:
                    tranche_status = "available"  # Partiellement payée et immédiatement exigible
                else:
                    if len(tranches) == 0 or tranches[-1]["status"] == "paid":
                        tranche_status = "available"
                    else:
                        tranche_status = "locked"

                first_payment = contributing_payments[0][0] if contributing_payments else None
                
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
                    "is_partially_paid": 0 < tranche_paid < tranche_amount,
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

    # Dédoublonnage défensif par numéro de tranche
    deduped_tranches = []
    seen_numbers = set()
    for tr in tranches:
        t_num = tr.get("number")
        if t_num not in seen_numbers:
            seen_numbers.add(t_num)
            deduped_tranches.append(tr)
    tranches = deduped_tranches
    
    return {
        "student_id": student_id,
        "student_name": f"{student.first_name} {student.last_name}",
        "matricule": student.matricule,
        "level": student.level,
        "domain": student.domain,
        "filiere": student.filiere,
        "base_amount": breakdown["base_amount"],
        "discount_amount": breakdown["discount_amount"],
        "discount_percentage": breakdown["discount_percentage"],
        "discount_reason": breakdown["discount_reason"],
        "discount_approved_by": breakdown["discount_approved_by"],
        "total_amount": round(total_amount),
        "total_paid": round(total_paid),
        "total_remaining": round(total_remaining),
        "paid_percentage": paid_percentage,
        "status": status,
        "payments_count": len(payments),
        "payment_plan": getattr(student, "payment_plan", "tranches") or "tranches",
        "is_monthly": is_monthly,
        "monthly_plan": breakdown.get("monthly_plan"),
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


@router.get("/{payment_id}/receipt")
def get_payment_receipt_endpoint(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "accountant", "censeur", "student"))
):
    """Récupère les détails et reçu du paiement"""
    from app.api.financials import get_payment_receipt
    return get_payment_receipt(payment_id=payment_id, db=db, current_user=current_user)


@router.get("/{payment_id}/receipt/pdf")
def get_payment_receipt_pdf(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "accountant", "censeur", "student"))
):
    from app.api.documents import generate_receipt_pdf
    return generate_receipt_pdf(payment_id=payment_id, db=db, current_user=current_user)


@router.get("/student/{student_id}/statement/pdf")
def get_student_statement_pdf(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "accountant", "censeur", "student"))
):
    from app.api.documents import generate_financial_statement_pdf
    return generate_financial_statement_pdf(student_id=student_id, db=db, current_user=current_user)


@router.get("/student/{student_id}/certificate/pdf")
def get_student_certificate_pdf(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "accountant", "censeur", "student"))
):
    from app.api.documents import generate_payment_certificate_pdf
    return generate_payment_certificate_pdf(student_id=student_id, db=db, current_user=current_user)


@router.delete("/{payment_id}")
def delete_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "accountant"))
):
    """
    Supprime ou annule un paiement erroné ou en doublon (réservé admin et comptable).
    """
    payment = db.query(Payment).filter(
        Payment.id == payment_id,
        Payment.university_id == current_user.university_id
    ).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Paiement non trouvé")

    receipt_num = payment.receipt_number
    amount = payment.amount
    db.delete(payment)
    db.commit()

    return {
        "message": f"Paiement {receipt_num} de {amount:,.0f} FCFA supprimé avec succès.",
        "deleted_id": payment_id
    }
