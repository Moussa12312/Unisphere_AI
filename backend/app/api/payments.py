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


@router.post("")
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

    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Le montant du paiement doit être strictement supérieur à 0 FCFA")

    # 2. ✅ CALCULER LE MONTANT TOTAL DÛ (Isolation stricte Domaine + Remise négociée)
    from app.utils.tuition import (
        resolve_student_tuition_breakdown,
        is_valid_payment_status,
        is_scolarite_payment_type,
    )
    from app.utils.academic_year import get_current_academic_year

    p_type_norm = (data.payment_type or "scolarite").strip().lower()
    is_scol_type = is_scolarite_payment_type(p_type_norm)
    breakdown = resolve_student_tuition_breakdown(
        db, student, current_user.university_id, "scolarite" if is_scol_type else p_type_norm
    )

    if is_scol_type and not breakdown.get("is_configured", False):
        raise HTTPException(
            status_code=400,
            detail=(
                f"Les frais de scolarité ne sont pas encore configurés pour la filière « {student.filiere or 'N/A'} » "
                f"(niveau {student.level or 'N/A'}). Veuillez d'abord configurer le tarif dans Paramètres > Frais académiques."
            ),
        )

    total_amount = float(breakdown["net_amount"] or 0.0)

    # 3. ✅ CALCULER LE TOTAL DÉJÀ PAYÉ (UNIQUEMENT pour la même catégorie comptable !)
    all_student_payments = db.query(Payment).filter(
        Payment.student_id == data.student_id
    ).order_by(Payment.id.asc()).all()

    if is_scol_type:
        relevant_payments = [
            p for p in all_student_payments
            if is_valid_payment_status(p.status) and is_scolarite_payment_type(p.payment_type)
        ]
    else:
        relevant_payments = [
            p for p in all_student_payments
            if is_valid_payment_status(p.status) and (p.payment_type or "").strip().lower() == p_type_norm
        ]

    total_paid = sum(float(p.amount or 0.0) for p in relevant_payments)

    # 4. ✅ VÉRIFIER SI LE MONTANT DÛ EST ATTEINT
    if is_scol_type or breakdown.get("is_configured", False):
        remaining = max(0.0, total_amount - total_paid)
        if remaining <= 0:
            raise HTTPException(
                status_code=400,
                detail=f"Le montant total dû ({total_amount:,.0f} FCFA) pour « {data.payment_type} » est déjà entièrement réglé."
            )
        payment_amount = min(float(data.amount), remaining)
    else:
        # Frais annexe libre non plafonné (ex: autre, duplicata carte, inscription libre)
        payment_amount = float(data.amount)
        total_amount = total_paid + payment_amount
        remaining = payment_amount
    
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

    new_total_paid = total_paid + payment_amount
    new_remaining = max(0.0, total_amount - new_total_paid)
    acad_year = getattr(student, "academic_year", None) or get_current_academic_year(db, current_user.university_id)

    # 7. Créer le paiement
    new_payment = Payment(
        student_id=data.student_id,
        university_id=current_user.university_id,
        amount=payment_amount,
        total_amount=total_amount,
        balance=new_remaining,
        level=student.level,
        academic_year=acad_year,
        currency=data.currency,
        payment_type=data.payment_type,
        payment_method=data.payment_method,
        reference=reference,
        receipt_number=receipt_number,
        status="completed",
        description=data.description,
        payment_date=pay_date,
        paid_by=current_user.id,
        created_by=current_user.id,
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
        "total_amount": round(total_amount),
        "total_paid": round(new_total_paid),
        "remaining": round(new_remaining),
        "balance": round(new_remaining),
        "message": f"Paiement de {payment_amount:,.0f} FCFA enregistré avec succès"
    }


@router.get("")
@router.get("/")
def get_payments(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    student_id: Optional[int] = None,
    payment_type: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "accountant", "director", "directeur", "administrateur"))
):
    try:
        query = db.query(Payment)
        if current_user.university_id:
            query = query.filter(Payment.university_id == current_user.university_id)
        
        if student_id:
            query = query.filter(Payment.student_id == student_id)
        if payment_type:
            query = query.filter(Payment.payment_type == payment_type)
        if status:
            query = query.filter(Payment.status == status)

        total = query.count()
        total_pages = max(1, (total + page_size - 1) // page_size) if page_size > 0 else 1
        
        try:
            payments = query.order_by(Payment.created_at.desc()) \
                .offset((page - 1) * page_size) \
                .limit(page_size) \
                .all()
        except Exception:
            payments = query.order_by(Payment.id.desc()) \
                .offset((page - 1) * page_size) \
                .limit(page_size) \
                .all()

        student_ids = list({p.student_id for p in payments if getattr(p, 'student_id', None)})
        students_map = {s.id: s for s in db.query(Student).filter(Student.id.in_(student_ids)).all()} if student_ids else {}

        payments_data = []
        for p in payments:
            st = students_map.get(getattr(p, 'student_id', None))
            st_name = f"{getattr(st, 'first_name', '')} {getattr(st, 'last_name', '')}".strip() or "N/A" if st else "N/A"
            payments_data.append({
                "id": p.id,
                "reference": getattr(p, 'reference', None) or getattr(p, 'receipt_number', None) or f"PAY-{p.id}",
                "receipt_number": getattr(p, 'receipt_number', None) or f"REC-{p.id}",
                "amount": float(getattr(p, 'amount', 0.0) or 0.0),
                "currency": getattr(p, 'currency', "FCFA") or "FCFA",
                "payment_type": getattr(p, 'payment_type', "scolarite") or "scolarite",
                "payment_method": getattr(p, 'payment_method', "virement") or "virement",
                "status": getattr(p, 'status', "completed") or "completed",
                "payment_date": str(p.payment_date) if getattr(p, 'payment_date', None) else (str(p.created_at) if getattr(p, 'created_at', None) else ""),
                "created_at": str(p.created_at) if getattr(p, 'created_at', None) else "",
                "paid_by": getattr(p, 'paid_by', None),
                "tranche_id": getattr(p, 'tranche_id', None),
                "student_id": getattr(p, 'student_id', None),
                "student_name": st_name,
                "matricule": getattr(st, 'matricule', "") if st else "",
                "student": {
                    "id": getattr(st, 'id', None),
                    "first_name": getattr(st, 'first_name', ''),
                    "last_name": getattr(st, 'last_name', ''),
                    "matricule": getattr(st, 'matricule', ''),
                    "filiere": getattr(st, 'filiere', ''),
                    "level": getattr(st, 'level', ''),
                } if st else None
            })

        return {
            "data": payments_data,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages
        }
    except Exception as exc:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erreur chargement paiements: {str(exc)}")


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

# ✅ VUE D'ENSEMBLE BULK PAR ÉTUDIANT (Zéro N+1 pour la page Paiements Comptable)
@router.get("/students-overview")
def get_students_payments_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "accountant", "secretary"))
):
    from app.utils.tuition import (
        resolve_student_tuition_breakdown,
        get_configured_tranches_for_student,
        scale_tranches_to_amount,
        is_valid_payment_status,
        is_scolarite_payment_type,
    )

    univ_id = current_user.university_id
    students = (
        db.query(Student)
        .filter(Student.university_id == univ_id)
        .order_by(Student.last_name.asc(), Student.first_name.asc(), Student.id.asc())
        .all()
    )
    all_payments = (
        db.query(Payment)
        .filter(Payment.university_id == univ_id)
        .order_by(Payment.id.asc())
        .all()
    )

    payments_by_student: dict[int, list[Payment]] = {}
    for p in all_payments:
        if p.student_id and is_valid_payment_status(p.status) and is_scolarite_payment_type(p.payment_type):
            payments_by_student.setdefault(p.student_id, []).append(p)

    today = date.today()
    items = []
    for student in students:
        breakdown = resolve_student_tuition_breakdown(db, student, univ_id, "scolarite")
        is_configured = bool(breakdown.get("is_configured", False))
        net_due = float(breakdown["net_amount"] or 0.0)
        st_payments = payments_by_student.get(student.id, [])
        st_paid = sum(float(p.amount or 0.0) for p in st_payments)
        st_rem = max(0.0, net_due - st_paid) if is_configured else 0.0

        if not is_configured:
            st_status = "unconfigured"
            paid_pct = 0
            has_late = False
        elif net_due <= 0 or st_paid >= net_due:
            st_status = "paid"
            paid_pct = 100
            has_late = False
        else:
            paid_pct = min(99, round((st_paid / net_due) * 100)) if net_due > 0 else 0
            st_status = "partial" if st_paid > 0 else "unpaid"
            has_late = False
            conf_tr = get_configured_tranches_for_student(db, student, univ_id, net_due)
            scaled_tr = scale_tranches_to_amount(conf_tr, net_due)
            rem_alloc = st_paid
            for tr in scaled_tr:
                t_amt = float(tr["amount"] or 0.0)
                cov = min(t_amt, rem_alloc)
                rem_alloc = max(0.0, rem_alloc - cov)
                due_dt = tr["due_date"]
                if due_dt:
                    d_only = due_dt.date() if hasattr(due_dt, "date") else due_dt
                    if (t_amt - cov) > 0 and d_only < today:
                        has_late = True
                        break

        items.append({
            "id": student.id,
            "student_id": student.id,
            "first_name": student.first_name,
            "last_name": student.last_name,
            "student_name": f"{student.first_name} {student.last_name}",
            "matricule": student.matricule,
            "email": student.email,
            "phone": student.phone,
            "level": student.level,
            "filiere": student.filiere,
            "domain": breakdown.get("domain") or student.domain,
            "is_configured": is_configured,
            "base_amount": round(float(breakdown["base_amount"] or 0.0)),
            "discount_amount": round(float(breakdown["discount_amount"] or 0.0)),
            "discount_percentage": float(breakdown["discount_percentage"] or 0.0),
            "total_amount": round(net_due),
            "total_paid": round(st_paid),
            "total_remaining": round(st_rem),
            "paid_percentage": paid_pct,
            "status": st_status,
            "has_late": has_late,
            "payments_count": len(st_payments),
            "payment_plan": breakdown.get("payment_plan", "tranches"),
        })

    return {"students": items, "total": len(items)}


# ✅ STATISTIQUES GLOBALES DES PAIEMENTS
@router.get("/summary")
def get_payments_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "accountant", "secretary"))
):
    """Récupère les statistiques globales exactes des paiements de scolarité"""
    overview = get_students_payments_overview(db=db, current_user=current_user)
    rows = overview["students"]

    total_due = 0
    total_catalog_gross = 0
    total_discounts_granted = 0
    total_paid = 0
    paid_students = 0
    late_students = 0
    unconfigured_students = 0

    for r in rows:
        if not r["is_configured"]:
            unconfigured_students += 1
            continue
        total_due += r["total_amount"]
        total_catalog_gross += r["base_amount"]
        total_discounts_granted += r["discount_amount"]
        total_paid += min(r["total_amount"], r["total_paid"])
        if r["status"] == "paid":
            paid_students += 1
        elif r["has_late"] or r["total_remaining"] > 0:
            late_students += 1

    return {
        "total_due": total_due,
        "total_catalog_gross": total_catalog_gross,
        "total_discounts_granted": total_discounts_granted,
        "total_paid": total_paid,
        "total_remaining": max(0, total_due - total_paid),
        "students_count": len(rows),
        "configured_students": len(rows) - unconfigured_students,
        "unconfigured_students": unconfigured_students,
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
    
    from app.utils.tuition import (
        resolve_student_tuition_breakdown,
        get_configured_tranches_for_student,
        get_monthly_schedule_for_student,
        scale_tranches_to_amount,
        is_valid_payment_status,
        is_scolarite_payment_type,
    )

    # 2. Récupérer tous les paiements valides de l'étudiant et isoler la scolarité des autres frais
    all_valid_payments = [
        p for p in db.query(Payment)
        .filter(Payment.student_id == student_id)
        .order_by(Payment.created_at.asc(), Payment.id.asc())
        .all()
        if is_valid_payment_status(p.status)
    ]
    payments = [p for p in all_valid_payments if is_scolarite_payment_type(p.payment_type)]
    other_payments = [p for p in all_valid_payments if not is_scolarite_payment_type(p.payment_type)]

    # 3. Calculer le montant net dû et la décomposition financière (strictement isolée par filière)
    breakdown = resolve_student_tuition_breakdown(db, student, student.university_id, "scolarite")
    is_configured = bool(breakdown.get("is_configured", False))
    total_amount = float(breakdown["net_amount"] or 0.0)
    base_amount = float(breakdown["base_amount"] or 0.0)

    # 4. Calculer le total payé au titre de la scolarité
    total_paid = sum(float(p.amount or 0.0) for p in payments)
    total_remaining = max(0.0, total_amount - total_paid) if is_configured else 0.0

    if not is_configured:
        paid_percentage = 0
        status = "unconfigured"
    elif total_amount <= 0 or total_paid >= total_amount:
        paid_percentage = 100
        status = "paid"
    elif total_paid > 0:
        paid_percentage = min(99, round((total_paid / total_amount) * 100))
        status = "partial"
    else:
        paid_percentage = 0
        status = "unpaid"

    # 5. ✅ GESTION SELON LE PLAN : MENSUEL VS TRANCHES (uniquement si la scolarité de la filière est configurée !)
    tranches = []
    plan_raw = (getattr(student, "payment_plan", "tranches") or "tranches").strip().lower()
    is_monthly = plan_raw in ("mensuel", "monthly")
    configured_tranches = []

    if is_configured:
        if is_monthly:
            tranches = get_monthly_schedule_for_student(breakdown, total_paid, payments, getattr(student, "academic_year", None))
        else:
            configured_tranches = get_configured_tranches_for_student(db, student, student.university_id, total_amount)
            scaled_tranches = scale_tranches_to_amount(configured_tranches, total_amount)

            if scaled_tranches:
                payment_pool = [{"payment": p, "remaining_amount": float(p.amount or 0.0)} for p in payments]
                for ct in scaled_tranches:
                    tranche_amount = float(ct["amount"])
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

                    if tranche_amount == 0 and total_amount == 0:
                        tranche_status = "paid"
                    elif tranche_paid >= tranche_amount and tranche_amount > 0:
                        tranche_status = "paid"
                    elif tranche_paid > 0:
                        tranche_status = "available"
                    else:
                        if len(tranches) == 0 or tranches[-1]["status"] == "paid":
                            tranche_status = "available"
                        else:
                            tranche_status = "locked"

                    last_contrib = contributing_payments[-1][0] if contributing_payments else None
                    due_dt = ct["due_date"]

                    tranches.append({
                        "id": ct["id"],
                        "number": ct["tranche_number"],
                        "name": ct["tranche_name"],
                        "amount": round(tranche_amount),
                        "percentage": ct["percentage"],
                        "status": tranche_status,
                        "due_date": due_dt.isoformat() if due_dt else None,
                        "paid_amount": round(tranche_paid),
                        "remaining": round(max(0.0, tranche_amount - tranche_paid)),
                        "is_partially_paid": 0 < tranche_paid < tranche_amount,
                        "payment_id": last_contrib.id if last_contrib else None,
                        "payment_date": (
                            last_contrib.payment_date.isoformat()
                            if last_contrib and last_contrib.payment_date
                            else (last_contrib.created_at.isoformat() if last_contrib and last_contrib.created_at else None)
                        ),
                        "payment_method": last_contrib.payment_method if last_contrib else None,
                        "receipt_number": (last_contrib.receipt_number or last_contrib.reference) if last_contrib else None,
                    })
            else:
                # Scolarité configurée mais pas encore de tranches personnalisées : répartition standard 40% / 30% / 30% exacte au franc près
                target_int = max(0, int(round(total_amount)))
                p1 = int(round(target_int * 0.40))
                p2 = int(round(target_int * 0.30))
                p3 = max(0, target_int - p1 - p2)
                default_specs = [(1, "1ère tranche (40%)", 40.0, p1), (2, "2ème tranche (30%)", 30.0, p2), (3, "3ème tranche (30%)", 30.0, p3)]
                today = date.today()
                year = today.year
                base_dates = [date(year, 10, 31), date(year + 1, 1, 31), date(year + 1, 4, 30)]
                payment_pool = [{"payment": p, "remaining_amount": float(p.amount or 0.0)} for p in payments]

                for idx_d, (num, t_label, pct, t_amt_int) in enumerate(default_specs):
                    t_amt = float(t_amt_int)
                    tranche_needed = t_amt
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

                    if t_amt == 0 and target_int == 0:
                        tranche_status = "paid"
                    elif tranche_paid >= t_amt and t_amt > 0:
                        tranche_status = "paid"
                    elif tranche_paid > 0:
                        tranche_status = "available"
                    else:
                        tranche_status = "available" if (idx_d == 0 or (tranches and tranches[-1]["status"] == "paid")) else "locked"

                    last_contrib = contributing_payments[-1][0] if contributing_payments else None
                    tranches.append({
                        "id": num,
                        "number": num,
                        "name": t_label,
                        "amount": t_amt_int,
                        "percentage": pct,
                        "status": tranche_status,
                        "due_date": base_dates[idx_d].isoformat(),
                        "paid_amount": round(tranche_paid),
                        "remaining": round(max(0.0, t_amt - tranche_paid)),
                        "is_partially_paid": 0 < tranche_paid < t_amt,
                        "payment_id": last_contrib.id if last_contrib else None,
                        "payment_date": (
                            last_contrib.payment_date.isoformat()
                            if last_contrib and last_contrib.payment_date
                            else None
                        ),
                        "payment_method": last_contrib.payment_method if last_contrib else None,
                        "receipt_number": (last_contrib.receipt_number or last_contrib.reference) if last_contrib else None,
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
    
    serialized_payments = [
        {
            "id": p.id,
            "reference": p.reference or f"PAY-{p.id}",
            "receipt_number": p.receipt_number or f"REC-{p.id}",
            "amount": round(float(p.amount or 0.0)),
            "payment_type": p.payment_type or "scolarite",
            "payment_method": p.payment_method or "cash",
            "status": p.status or "completed",
            "description": p.description,
            "payment_date": p.payment_date.isoformat() if p.payment_date else (p.created_at.isoformat() if p.created_at else None),
        }
        for p in reversed(all_valid_payments)
    ]

    return {
        "student_id": student_id,
        "student_name": f"{student.first_name} {student.last_name}",
        "matricule": student.matricule,
        "level": student.level,
        "domain": breakdown.get("domain") or student.domain,
        "filiere": student.filiere,
        "is_configured": is_configured,
        "base_amount": round(base_amount),
        "discount_amount": round(float(breakdown["discount_amount"] or 0.0)),
        "discount_percentage": breakdown["discount_percentage"],
        "discount_reason": breakdown["discount_reason"],
        "discount_approved_by": breakdown["discount_approved_by"],
        "total_amount": round(total_amount),
        "total_paid": round(total_paid),
        "other_fees_paid": round(sum(float(p.amount or 0.0) for p in other_payments)),
        "total_remaining": round(total_remaining),
        "paid_percentage": paid_percentage,
        "status": status,
        "payments_count": len(payments),
        "payments": serialized_payments,
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

    receipt_num = payment.receipt_number or payment.reference
    amount = float(payment.amount or 0.0)

    # Supprimer proprement les échéances et écritures comptables liées à ce paiement
    try:
        from app.models.payment_installment import PaymentInstallment
        from app.models.ledger import JournalEntry, JournalEntryLine

        db.query(PaymentInstallment).filter(PaymentInstallment.payment_id == payment.id).delete(synchronize_session=False)
        je_ids = [
            r[0] for r in db.query(JournalEntry.id).filter(
                JournalEntry.university_id == current_user.university_id,
                JournalEntry.source == "payment",
                JournalEntry.source_id == payment.id,
            ).all()
        ]
        if je_ids:
            db.query(JournalEntryLine).filter(JournalEntryLine.journal_entry_id.in_(je_ids)).delete(synchronize_session=False)
            db.query(JournalEntry).filter(JournalEntry.id.in_(je_ids)).delete(synchronize_session=False)
    except Exception as _cleanup_err:
        print(f"[WARN] Nettoyage écritures/échéances paiement {payment.id}: {_cleanup_err}")

    db.delete(payment)
    db.commit()

    return {
        "message": f"Paiement {receipt_num} de {amount:,.0f} FCFA supprimé avec succès.",
        "deleted_id": payment_id
    }
