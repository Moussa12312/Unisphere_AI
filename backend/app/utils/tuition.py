"""
Module de calcul et de résolution de la scolarité et des frais académiques.
Gère :
1. Les tarifs configurés par Niveau ET Domaine/Pôle (ex: Gestion vs Santé vs Informatique)
2. La déduction comptable des remises/bourses négociées (montant fixe ou pourcentage)
3. La transparence comptable (net dû = tarif standard - réduction autorisée)
"""
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from app.models.academic_fee import AcademicFee
from app.models.payment_tranche import PaymentTranche
from app.models.student import Student


def resolve_student_tuition_breakdown(
    db: Session,
    student: Student,
    university_id: int,
    payment_type: str = "scolarite"
) -> Dict[str, Any]:
    """
    Résout le tarif de base, la remise négociée éventuelle et le net dû pour un étudiant.
    Priorise le tarif spécifique au domaine/pôle de l'étudiant, puis le tarif global.
    """
    fee = None

    # 1. Recherche par Domaine + Niveau
    resolved_domain = student.domain
    if not resolved_domain and student.filiere:
        from app.models.filiere import Filiere
        fil = db.query(Filiere).filter(Filiere.name == student.filiere).first()
        if fil and fil.domain:
            resolved_domain = fil.domain

    if resolved_domain:
        fee = db.query(AcademicFee).filter(
            AcademicFee.university_id == university_id,
            AcademicFee.level == student.level,
            AcademicFee.domain == resolved_domain,
            AcademicFee.payment_type == payment_type
        ).first()

    # 2. Fallback sans domaine (ou domaine vide/None)
    if not fee:
        fee = db.query(AcademicFee).filter(
            AcademicFee.university_id == university_id,
            AcademicFee.level == student.level,
            (AcademicFee.domain == None) | (AcademicFee.domain == ""),
            AcademicFee.payment_type == payment_type
        ).first()

    # 3. Fallback générique niveau
    if not fee:
        fee = db.query(AcademicFee).filter(
            AcademicFee.university_id == university_id,
            AcademicFee.level == student.level,
            AcademicFee.payment_type == payment_type
        ).first()

    base_amount = fee.amount if fee else 450000.0

    if payment_type == "scolarite":
        if student.net_tuition_amount is not None and float(student.net_tuition_amount) >= 0:
            net_amount = float(student.net_tuition_amount)
            discount_amount = max(0.0, base_amount - net_amount) if base_amount > 0 else 0.0
        elif (student.discount_amount or 0.0) > 0:
            discount_amount = float(student.discount_amount)
            net_amount = max(0.0, base_amount - discount_amount)
        elif (student.discount_percentage or 0.0) > 0:
            discount_amount = round(base_amount * (float(student.discount_percentage) / 100.0))
            net_amount = max(0.0, base_amount - discount_amount)
        else:
            net_amount = base_amount
            discount_amount = 0.0
    else:
        net_amount = base_amount
        discount_amount = 0.0

    # 4. Résolution de la modalité mensuelle
    payment_plan = getattr(student, "payment_plan", "tranches") or "tranches"
    months_count = getattr(student, "monthly_months_count", None) or (fee.monthly_months_count if fee and fee.monthly_months_count else 5) or 5
    monthly_inst = getattr(student, "monthly_installment", None) or (fee.monthly_installment if fee and fee.monthly_installment else 100000.0) or 100000.0
    
    if getattr(student, "monthly_deposit", None) is not None:
        monthly_dep = float(student.monthly_deposit)
    elif fee and fee.monthly_deposit is not None:
        monthly_dep = float(fee.monthly_deposit)
    else:
        # Formule standard d'échelonnement : acompte = net - (nb_mois * mensualité)
        calc_dep = net_amount - (months_count * monthly_inst)
        monthly_dep = max(0.0, calc_dep) if calc_dep > 0 else round(net_amount * 0.4)

    monthly_plan_info = {
        "has_monthly_option": fee.has_monthly_option if fee and hasattr(fee, "has_monthly_option") else True,
        "deposit": round(monthly_dep),
        "installment": round(monthly_inst),
        "months_count": months_count,
        "formatted_summary": f"{int(monthly_dep):,} F à l'inscription, puis {int(monthly_inst):,} F pendant {months_count} mois".replace(",", " ")
    }

    return {
        "base_amount": base_amount,
        "discount_amount": discount_amount,
        "discount_percentage": float(student.discount_percentage or 0.0),
        "discount_reason": student.discount_reason,
        "discount_approved_by": student.discount_approved_by,
        "net_amount": net_amount,
        "fee_id": fee.id if fee else None,
        "domain": student.domain or (fee.domain if fee else None),
        "level": student.level,
        "payment_plan": payment_plan,
        "monthly_plan": monthly_plan_info
    }


def get_monthly_schedule_for_student(
    breakdown: Dict[str, Any],
    total_paid: float,
    payments: List[Any],
    academic_year: Optional[str] = "2025-2026"
) -> List[Dict[str, Any]]:
    """
    Génère la grille détaillée des mensualités (Acompte inscription + mensualités régulières)
    et ventile le montant déjà versé.
    """
    from datetime import date
    m_info = breakdown["monthly_plan"]
    deposit = m_info["deposit"]
    installment = m_info["installment"]
    months_count = m_info["months_count"]
    total_net = breakdown["net_amount"]

    # Année de base
    year = 2025
    if academic_year and "-" in academic_year:
        try:
            year = int(academic_year.split("-")[0])
        except Exception:
            year = date.today().year

    # Dates d'échéances mensuelles types
    # 0: Inscription (31 Octobre)
    # 1: 30 Novembre
    # 2: 31 Décembre
    # 3: 31 Janvier (year + 1)
    # 4: 28 Février (year + 1)
    # 5: 31 Mars (year + 1)
    # 6: 30 Avril (year + 1)
    schedule_dates = [
        date(year, 10, 31),
        date(year, 11, 30),
        date(year, 12, 31),
        date(year + 1, 1, 31),
        date(year + 1, 2, 28),
        date(year + 1, 3, 31),
        date(year + 1, 4, 30),
        date(year + 1, 5, 31),
        date(year + 1, 6, 30)
    ]
    month_names = ["Novembre", "Décembre", "Janvier", "Février", "Mars", "Avril", "Mai", "Juin"]

    items = []
    # 1. Échéance Inscription (Acompte)
    items.append({
        "number": 1,
        "name": "Acompte à l'inscription",
        "amount": round(deposit),
        "due_date": schedule_dates[0].isoformat()
    })

    # 2. Mensualités étalées
    for i in range(months_count):
        m_name = month_names[i] if i < len(month_names) else f"Mois {i+1}"
        m_date = schedule_dates[i+1] if (i+1) < len(schedule_dates) else schedule_dates[-1]
        items.append({
            "number": i + 2,
            "name": f"Mensualité {i+1} ({m_name})",
            "amount": round(installment),
            "due_date": m_date.isoformat()
        })

    # Ajustement si la somme dépasse ou sous-évalue le net dû
    sum_items = sum(it["amount"] for it in items)
    if sum_items != total_net and len(items) > 0:
        diff = total_net - sum_items
        # Ajuster sur la dernière mensualité
        items[-1]["amount"] = max(0, items[-1]["amount"] + diff)

    # Répartition des paiements
    remaining_to_allocate = total_paid
    tranches_result = []

    for idx, it in enumerate(items):
        amt = it["amount"]
        if remaining_to_allocate >= amt:
            p_amt = amt
            st = "paid"
            remaining_to_allocate -= amt
        elif remaining_to_allocate > 0:
            p_amt = remaining_to_allocate
            st = "available"
            remaining_to_allocate = 0
        else:
            p_amt = 0
            if idx == 0 or (tranches_result and tranches_result[-1]["status"] == "paid"):
                st = "available"
            else:
                st = "locked"

        tranches_result.append({
            "id": idx + 1,
            "number": it["number"],
            "name": it["name"],
            "amount": amt,
            "percentage": round((amt / total_net) * 100, 1) if total_net > 0 else 0,
            "status": st,
            "due_date": it["due_date"],
            "paid_amount": round(p_amt),
            "remaining": round(max(0, amt - p_amt)),
            "payment_date": None,
            "payment_method": None,
            "receipt_number": None,
            "is_monthly": True
        })

    return tranches_result


def get_configured_tranches_for_student(
    db: Session,
    student: Student,
    university_id: int,
    net_tuition_amount: float
) -> List[PaymentTranche]:
    """
    Récupère les tranches de paiement configurées, en priorisant celles du domaine de l'étudiant
    et de l'année académique courante, avec dédoublonnage strict par numéro de tranche (P1, P2, P3...).
    """
    from app.utils.academic_year import get_current_academic_year
    from app.models.payment import Payment

    target_year = getattr(student, "academic_year", None) or get_current_academic_year(db, university_id)

    # Récupérer les IDs des tranches déjà payées par cet étudiant pour préserver la cohérence
    existing_payments = db.query(Payment).filter(
        Payment.student_id == student.id,
        Payment.status == "completed"
    ).all()
    paid_tranche_ids = {p.tranche_id for p in existing_payments if p.tranche_id}

    base_query = db.query(PaymentTranche).filter(
        PaymentTranche.university_id == university_id,
        PaymentTranche.level == student.level,
        PaymentTranche.payment_type == "scolarite"
    )

    resolved_domain = student.domain
    if not resolved_domain and student.filiere:
        from app.models.filiere import Filiere
        fil = db.query(Filiere).filter(Filiere.name == student.filiere).first()
        if fil and fil.domain:
            resolved_domain = fil.domain

    def _select_and_deduplicate(tranches_candidates: List[PaymentTranche]) -> List[PaymentTranche]:
        """Garantit l'unicité stricte de chaque numéro de tranche (P1, P2, P3)."""
        by_number = {}
        for t in tranches_candidates:
            num = t.tranche_number
            if num not in by_number:
                by_number[num] = t
            else:
                existing = by_number[num]
                # Privilégier une tranche déjà liée à un paiement de cet étudiant
                if t.id in paid_tranche_ids and existing.id not in paid_tranche_ids:
                    by_number[num] = t
                # Sinon privilégier l'année cible
                elif existing.academic_year != target_year and t.academic_year == target_year:
                    by_number[num] = t

        return [by_number[n] for n in sorted(by_number.keys())]

    # 1. Domaine spécifique + Année académique cible
    if resolved_domain:
        candidates = base_query.filter(
            PaymentTranche.domain == resolved_domain,
            PaymentTranche.academic_year == target_year
        ).order_by(PaymentTranche.tranche_number).all()
        if candidates:
            return _select_and_deduplicate(candidates)

        # Secours domaine spécifique sans filtre d'année
        candidates_all = base_query.filter(
            PaymentTranche.domain == resolved_domain
        ).order_by(PaymentTranche.tranche_number).all()
        if candidates_all:
            return _select_and_deduplicate(candidates_all)

    # 2. Tranches générales (sans domaine) + Année académique cible
    global_candidates = base_query.filter(
        (PaymentTranche.domain == None) | (PaymentTranche.domain == ""),
        PaymentTranche.academic_year == target_year
    ).order_by(PaymentTranche.tranche_number).all()
    if global_candidates:
        return _select_and_deduplicate(global_candidates)

    # Secours global sans filtre d'année
    all_global = base_query.filter(
        (PaymentTranche.domain == None) | (PaymentTranche.domain == "")
    ).order_by(PaymentTranche.tranche_number).all()
    if all_global:
        return _select_and_deduplicate(all_global)

    # 3. Dernier secours : toutes tranches du niveau dédoublonnées
    fallback = base_query.order_by(PaymentTranche.tranche_number).all()
    return _select_and_deduplicate(fallback)
