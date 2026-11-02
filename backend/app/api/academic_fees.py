from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.database.connection import SessionLocal
from app.models.user import User
from app.models.student import Student
from app.models.academic_fee import AcademicFee
from app.models.payment_deadline import PaymentDeadline
from app.core.dependencies import require_role
from app.utils.academic_year import get_current_academic_year

router = APIRouter(prefix="/academic-fees", tags=["Academic Fees"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pôles / Domaines associés partageant les mêmes frais
ASSOCIATED_DOMAINS = [
    "Gestion & Economie",
    "Communication & Medias",
    "Informatique & Technologies"
]

# Schémas
class AcademicFeeCreate(BaseModel):
    level: str  # "L1", "L2", "L3", "M1", "M2"
    domain: Optional[str] = None  # "Sciences de Gestion", "Technologies", etc. ou None pour tous
    payment_type: str  # "scolarite", "inscription", "autre"
    amount: float
    academic_year: str  # "2025-2026"
    has_monthly_option: Optional[bool] = True
    monthly_deposit: Optional[float] = None
    monthly_installment: Optional[float] = None
    monthly_months_count: Optional[int] = 5
    sync_associated_domains: Optional[bool] = False

class SyncDomainsRequest(BaseModel):
    source_domain: Optional[str] = "Gestion & Economie"
    target_domains: Optional[List[str]] = None
    academic_year: Optional[str] = None

class PaymentDeadlineCreate(BaseModel):
    deadline_type: str  # "inscription_start", "exams_s2", etc.
    deadline_date: str  # "2026-05-15"
    academic_year: str
    description: Optional[str] = None

# ==========================================
# FRAIS ACADÉMIQUES - LISTE
# ==========================================
@router.get("/")
def get_academic_fees(
    academic_year: Optional[str] = None,
    domain: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "accountant", "secretary"))
):
    """Récupérer tous les frais académiques (filtrable par année et domaine)"""
    university_id = current_user.university_id
    
    query = db.query(AcademicFee).filter(AcademicFee.university_id == university_id)
    
    if academic_year:
        query = query.filter(AcademicFee.academic_year == academic_year)
    if domain:
        query = query.filter(AcademicFee.domain == domain)
    
    fees = query.order_by(AcademicFee.level, AcademicFee.domain, AcademicFee.payment_type).all()
    
    return [
        {
            "id": f.id,
            "level": f.level,
            "domain": f.domain,
            "payment_type": f.payment_type,
            "amount": f.amount,
            "currency": f.currency,
            "has_monthly_option": getattr(f, "has_monthly_option", True),
            "monthly_deposit": getattr(f, "monthly_deposit", None),
            "monthly_installment": getattr(f, "monthly_installment", None),
            "monthly_months_count": getattr(f, "monthly_months_count", 5) or 5,
            "academic_year": f.academic_year,
            "is_locked": f.is_locked,
            "locked_count": f.locked_count,
            "created_at": f.created_at.strftime("%Y-%m-%d %H:%M") if f.created_at else ""
        }
        for f in fees
    ]

# ==========================================
# FRAIS ACADÉMIQUES - CRÉER/MODIFIER
# ==========================================
@router.post("/")
def create_or_update_fee(
    data: AcademicFeeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Créer ou modifier un frais académique configurable par niveau et domaine"""
    university_id = current_user.university_id
    
    # Vérifier si ce frais existe déjà pour ce niveau/domaine/type/année
    query_existing = db.query(AcademicFee).filter(
        AcademicFee.university_id == university_id,
        AcademicFee.level == data.level,
        AcademicFee.payment_type == data.payment_type,
        AcademicFee.academic_year == data.academic_year
    )
    if data.domain:
        query_existing = query_existing.filter(AcademicFee.domain == data.domain)
    else:
        query_existing = query_existing.filter((AcademicFee.domain == None) | (AcademicFee.domain == ""))

    existing = query_existing.order_by(AcademicFee.is_locked.asc(), AcademicFee.id.desc()).first()

    def _sync_level_domain_tranches(lvl: str, dom: Optional[str], yr: str, total_amt: float):
        if data.payment_type != "scolarite":
            return
        from app.models.payment_tranche import PaymentTranche
        tq = db.query(PaymentTranche).filter(
            PaymentTranche.university_id == university_id,
            PaymentTranche.level == lvl,
            PaymentTranche.payment_type == "scolarite",
            PaymentTranche.academic_year == yr,
        )
        if dom:
            tq = tq.filter(PaymentTranche.domain == dom)
        else:
            tq = tq.filter((PaymentTranche.domain == None) | (PaymentTranche.domain == ""))
        t_rows = tq.order_by(PaymentTranche.tranche_number.asc(), PaymentTranche.id.asc()).all()
        if not t_rows:
            return
        target_int = max(0, int(round(float(total_amt or 0.0))))
        allocated = 0
        for idx_t, tr in enumerate(t_rows):
            if idx_t == len(t_rows) - 1:
                tr.amount = float(max(0, target_int - allocated))
            else:
                part = int(round((target_int * float(tr.percentage or 0.0)) / 100.0))
                part = min(part, max(0, target_int - allocated))
                tr.amount = float(part)
                allocated += part
    
    # Calcul des modalités mensuelles
    has_monthly = data.has_monthly_option if data.has_monthly_option is not None else True
    m_months = data.monthly_months_count or 5
    m_inst = data.monthly_installment if data.monthly_installment is not None else (100000.0 if data.payment_type == "scolarite" else None)
    if data.monthly_deposit is not None:
        m_dep = data.monthly_deposit
    elif m_inst and data.payment_type == "scolarite":
        m_dep = max(0.0, data.amount - (m_months * m_inst))
    else:
        m_dep = None

    if existing:
        # Si verrouillé, créer une nouvelle version
        if existing.is_locked:
            new_fee = AcademicFee(
                university_id=university_id,
                level=data.level,
                domain=data.domain,
                payment_type=data.payment_type,
                amount=data.amount,
                has_monthly_option=has_monthly,
                monthly_deposit=m_dep,
                monthly_installment=m_inst,
                monthly_months_count=m_months,
                academic_year=data.academic_year,
                is_locked=False,
                locked_count=0,
                created_by=current_user.id
            )
            db.add(new_fee)
            _sync_level_domain_tranches(data.level, data.domain, data.academic_year, data.amount)
            db.commit()
            db.refresh(new_fee)
            
            return {
                "message": "Nouveau frais créé (l'ancien est verrouillé)",
                "fee_id": new_fee.id,
                "is_new_version": True
            }
        else:
            existing.amount = data.amount
            if data.domain is not None:
                existing.domain = data.domain
            existing.has_monthly_option = has_monthly
            existing.monthly_deposit = m_dep
            existing.monthly_installment = m_inst
            existing.monthly_months_count = m_months
            _sync_level_domain_tranches(data.level, data.domain, data.academic_year, data.amount)
            db.commit()

            if data.sync_associated_domains and data.domain in ASSOCIATED_DOMAINS:
                for other_dom in ASSOCIATED_DOMAINS:
                    if other_dom != data.domain:
                        q_other = db.query(AcademicFee).filter(
                            AcademicFee.university_id == university_id,
                            AcademicFee.level == data.level,
                            AcademicFee.domain == other_dom,
                            AcademicFee.payment_type == data.payment_type,
                            AcademicFee.academic_year == data.academic_year
                        ).order_by(AcademicFee.is_locked.asc(), AcademicFee.id.desc()).first()
                        if q_other and not q_other.is_locked:
                            q_other.amount = data.amount
                            q_other.has_monthly_option = has_monthly
                            q_other.monthly_deposit = m_dep
                            q_other.monthly_installment = m_inst
                            q_other.monthly_months_count = m_months
                        else:
                            new_other = AcademicFee(
                                university_id=university_id,
                                level=data.level,
                                domain=other_dom,
                                payment_type=data.payment_type,
                                amount=data.amount,
                                currency="FCFA",
                                academic_year=data.academic_year,
                                has_monthly_option=has_monthly,
                                monthly_deposit=m_dep,
                                monthly_installment=m_inst,
                                monthly_months_count=m_months,
                                is_locked=False,
                                locked_count=0,
                                created_by=current_user.id
                            )
                            db.add(new_other)
                        _sync_level_domain_tranches(data.level, other_dom, data.academic_year, data.amount)
                db.commit()
            
            return {
                "message": "Frais mis à jour",
                "fee_id": existing.id,
                "is_new_version": False
            }
    else:
        new_fee = AcademicFee(
            university_id=university_id,
            level=data.level,
            domain=data.domain,
            payment_type=data.payment_type,
            amount=data.amount,
            has_monthly_option=has_monthly,
            monthly_deposit=m_dep,
            monthly_installment=m_inst,
            monthly_months_count=m_months,
            academic_year=data.academic_year,
            is_locked=False,
            locked_count=0,
            created_by=current_user.id
        )
        db.add(new_fee)
        _sync_level_domain_tranches(data.level, data.domain, data.academic_year, data.amount)
        db.commit()
        db.refresh(new_fee)

        if data.sync_associated_domains and data.domain in ASSOCIATED_DOMAINS:
            for other_dom in ASSOCIATED_DOMAINS:
                if other_dom != data.domain:
                    q_other = db.query(AcademicFee).filter(
                        AcademicFee.university_id == university_id,
                        AcademicFee.level == data.level,
                        AcademicFee.domain == other_dom,
                        AcademicFee.payment_type == data.payment_type,
                        AcademicFee.academic_year == data.academic_year
                    ).order_by(AcademicFee.is_locked.asc(), AcademicFee.id.desc()).first()
                    if q_other and not q_other.is_locked:
                        q_other.amount = data.amount
                        q_other.has_monthly_option = has_monthly
                        q_other.monthly_deposit = m_dep
                        q_other.monthly_installment = m_inst
                        q_other.monthly_months_count = m_months
                    else:
                        new_other = AcademicFee(
                            university_id=university_id,
                            level=data.level,
                            domain=other_dom,
                            payment_type=data.payment_type,
                            amount=data.amount,
                            currency="FCFA",
                            academic_year=data.academic_year,
                            has_monthly_option=has_monthly,
                            monthly_deposit=m_dep,
                            monthly_installment=m_inst,
                            monthly_months_count=m_months,
                            is_locked=False,
                            locked_count=0,
                            created_by=current_user.id
                        )
                        db.add(new_other)
                    _sync_level_domain_tranches(data.level, other_dom, data.academic_year, data.amount)
            db.commit()
        
        return {
            "message": "Frais créé avec succès",
            "fee_id": new_fee.id,
            "is_new_version": False
        }


# ==========================================
# SYNCHRONISATION DE PÔLES / DOMAINES GROUPÉS
# ==========================================
@router.post("/sync-domains")
def sync_academic_domains(
    payload: SyncDomainsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """
    Synchronise entièrement les tarifs, les tranches (40/30/30) et les mensualités
    entre les pôles/domaines associés (Gestion & Economie, Communication & Medias, Informatique & Technologies).
    """
    from app.models.payment_tranche import PaymentTranche
    university_id = current_user.university_id
    year = payload.academic_year or get_current_academic_year(db, university_id)
    
    group = payload.target_domains or ASSOCIATED_DOMAINS
    source = payload.source_domain or group[0]

    # 1. Récupérer les frais du domaine source
    source_fees = db.query(AcademicFee).filter(
        AcademicFee.university_id == university_id,
        AcademicFee.domain == source,
        AcademicFee.academic_year == year
    ).all()

    # Si le domaine source n'a pas encore de frais, chercher un autre domaine du groupe qui en a
    if not source_fees:
        for d in group:
            found = db.query(AcademicFee).filter(
                AcademicFee.university_id == university_id,
                AcademicFee.domain == d,
                AcademicFee.academic_year == year
            ).all()
            if found:
                source = d
                source_fees = found
                break

    # 2. Récupérer les tranches du domaine source en dédoublonnant strictement par numéro
    raw_source_tranches = db.query(PaymentTranche).filter(
        PaymentTranche.university_id == university_id,
        PaymentTranche.domain == source,
        PaymentTranche.academic_year == year
    ).order_by(PaymentTranche.level, PaymentTranche.tranche_number).all()

    # Dédoublonnage strict des tranches sources
    unique_sources = {}
    for st in raw_source_tranches:
        key = (st.level, st.payment_type, st.tranche_number)
        if key not in unique_sources:
            unique_sources[key] = st
    source_tranches = list(unique_sources.values())

    targets = [d for d in group if d != source]
    fees_count = 0
    tranches_count = 0

    for target in targets:
        # Synchro des frais avec nettoyage défensif des doublons
        for sf in source_fees:
            tf_list = db.query(AcademicFee).filter(
                AcademicFee.university_id == university_id,
                AcademicFee.domain == target,
                AcademicFee.level == sf.level,
                AcademicFee.payment_type == sf.payment_type,
                AcademicFee.academic_year == year
            ).all()

            if tf_list:
                tf = tf_list[0]
                tf.amount = sf.amount
                tf.has_monthly_option = sf.has_monthly_option
                tf.monthly_deposit = sf.monthly_deposit
                tf.monthly_installment = sf.monthly_installment
                tf.monthly_months_count = sf.monthly_months_count
                for extra in tf_list[1:]:
                    db.delete(extra)
            else:
                tf = AcademicFee(
                    university_id=university_id,
                    level=sf.level,
                    domain=target,
                    payment_type=sf.payment_type,
                    amount=sf.amount,
                    currency=sf.currency or "FCFA",
                    academic_year=year,
                    has_monthly_option=sf.has_monthly_option,
                    monthly_deposit=sf.monthly_deposit,
                    monthly_installment=sf.monthly_installment,
                    monthly_months_count=sf.monthly_months_count,
                    is_locked=False,
                    locked_count=0,
                    created_by=current_user.id
                )
                db.add(tf)
            fees_count += 1

        # Synchro des tranches avec nettoyage défensif des doublons
        valid_slots = set()
        for st in source_tranches:
            valid_slots.add((st.level, st.payment_type, st.tranche_number))
            existing_tts = db.query(PaymentTranche).filter(
                PaymentTranche.university_id == university_id,
                PaymentTranche.domain == target,
                PaymentTranche.level == st.level,
                PaymentTranche.payment_type == st.payment_type,
                PaymentTranche.tranche_number == st.tranche_number,
                PaymentTranche.academic_year == year
            ).all()

            if existing_tts:
                tt = existing_tts[0]
                tt.tranche_name = st.tranche_name
                tt.percentage = st.percentage
                tt.amount = st.amount
                tt.due_date = st.due_date
                for extra in existing_tts[1:]:
                    db.delete(extra)
            else:
                tt = PaymentTranche(
                    university_id=university_id,
                    level=st.level,
                    domain=target,
                    payment_type=st.payment_type,
                    academic_year=year,
                    tranche_number=st.tranche_number,
                    tranche_name=st.tranche_name,
                    percentage=st.percentage,
                    amount=st.amount,
                    due_date=st.due_date
                )
                db.add(tt)
            tranches_count += 1

        # Purger toute tranche orpheline (> 3 ou non présente dans la source) dans le domaine cible
        existing_target_tranches = db.query(PaymentTranche).filter(
            PaymentTranche.university_id == university_id,
            PaymentTranche.domain == target,
            PaymentTranche.academic_year == year
        ).all()
        for ett in existing_target_tranches:
            if (ett.level, ett.payment_type, ett.tranche_number) not in valid_slots or ett.tranche_number not in (1, 2, 3):
                db.delete(ett)

    db.commit()
    return {
        "message": f"Synchronisation réussie des {len(group)} pôles associés",
        "source_domain": source,
        "synced_domains": group,
        "fees_synchronized": fees_count,
        "tranches_synchronized": tranches_count
    }

# ==========================================
# FRAIS ACADÉMIQUES - RÉCUPÉRER POUR UN ÉTUDIANT
# ==========================================
@router.get("/student/{student_id}")
def get_student_fees(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "accountant", "secretary", "student"))
):
    """Récupérer les frais configurés pour un étudiant (strictement isolés par filière/domaine)"""
    student = db.query(Student).filter(
        Student.id == student_id,
        Student.university_id == current_user.university_id,
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Étudiant non trouvé")
    if current_user.role == "student" and student.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    from app.utils.tuition import find_matching_academic_fee, resolve_student_tuition_breakdown

    scol_breakdown = resolve_student_tuition_breakdown(db, student, student.university_id, "scolarite")

    if student.locked_fee_id:
        locked_fee = db.query(AcademicFee).filter(
            AcademicFee.id == student.locked_fee_id,
            AcademicFee.university_id == student.university_id,
        ).first()
        if locked_fee:
            return {
                "locked": True,
                "is_configured": True,
                "fee": {
                    "id": locked_fee.id,
                    "level": locked_fee.level,
                    "domain": locked_fee.domain,
                    "payment_type": locked_fee.payment_type,
                    "amount": scol_breakdown["base_amount"],
                    "discount_amount": scol_breakdown["discount_amount"],
                    "discount_percentage": scol_breakdown["discount_percentage"],
                    "discount_reason": student.discount_reason,
                    "discount_approved_by": student.discount_approved_by,
                    "net_tuition_amount": scol_breakdown["net_amount"],
                    "academic_year": locked_fee.academic_year,
                },
            }

    active_fees = []
    for p_type in ("scolarite", "inscription", "autre"):
        matched = find_matching_academic_fee(db, student, student.university_id, p_type)
        if matched:
            active_fees.append(matched)

    return {
        "locked": False,
        "is_configured": scol_breakdown["is_configured"],
        "discount_info": {
            "discount_amount": scol_breakdown["discount_amount"],
            "discount_percentage": scol_breakdown["discount_percentage"],
            "discount_reason": student.discount_reason,
            "discount_approved_by": student.discount_approved_by,
            "net_tuition_amount": scol_breakdown["net_amount"] if scol_breakdown["is_configured"] else None,
        },
        "fees": [
            {
                "id": f.id,
                "level": f.level,
                "domain": f.domain,
                "payment_type": f.payment_type,
                "amount": f.amount,
                "net_amount": (
                    scol_breakdown["net_amount"]
                    if f.payment_type == "scolarite"
                    else f.amount
                ),
                "academic_year": f.academic_year,
            }
            for f in active_fees
        ],
    }

# ==========================================
# DATES LIMITES - LISTE
# ==========================================
@router.get("/deadlines")
def get_payment_deadlines(
    academic_year: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "accountant", "secretary"))
):
    """Récupérer toutes les dates limites"""
    university_id = current_user.university_id
    
    query = db.query(PaymentDeadline).filter(PaymentDeadline.university_id == university_id)
    
    if academic_year:
        query = query.filter(PaymentDeadline.academic_year == academic_year)
    
    deadlines = query.order_by(PaymentDeadline.deadline_date).all()
    
    return [
        {
            "id": d.id,
            "deadline_type": d.deadline_type,
            "deadline_date": d.deadline_date.strftime("%Y-%m-%d") if d.deadline_date else "",
            "academic_year": d.academic_year,
            "description": d.description
        }
        for d in deadlines
    ]

# ==========================================
# DATES LIMITES - CRÉER/MODIFIER
# ==========================================
@router.post("/deadlines")
def create_or_update_deadline(
    data: PaymentDeadlineCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Créer ou modifier une date limite"""
    university_id = current_user.university_id
    
    # Vérifier si cette date limite existe déjà
    existing = db.query(PaymentDeadline).filter(
        PaymentDeadline.university_id == university_id,
        PaymentDeadline.deadline_type == data.deadline_type,
        PaymentDeadline.academic_year == data.academic_year
    ).first()
    
    deadline_date = datetime.fromisoformat(data.deadline_date)
    
    if existing:
        existing.deadline_date = deadline_date
        existing.description = data.description
        db.commit()
        
        return {"message": "Date limite mise à jour", "deadline_id": existing.id}
    else:
        new_deadline = PaymentDeadline(
            university_id=university_id,
            deadline_type=data.deadline_type,
            deadline_date=deadline_date,
            academic_year=data.academic_year,
            description=data.description
        )
        db.add(new_deadline)
        db.commit()
        db.refresh(new_deadline)
        
        return {"message": "Date limite créée", "deadline_id": new_deadline.id}

# ==========================================
# DATES LIMITES - RÉCUPÉRER UNE DATE SPÉCIFIQUE
# ==========================================
@router.get("/deadlines/{deadline_type}")
def get_deadline_by_type(
    deadline_type: str,
    academic_year: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "accountant", "secretary"))
):
    """Récupérer une date limite spécifique (ex: exams_s2)"""
    university_id = current_user.university_id
    
    query = db.query(PaymentDeadline).filter(
        PaymentDeadline.university_id == university_id,
        PaymentDeadline.deadline_type == deadline_type
    )
    
    if academic_year:
        query = query.filter(PaymentDeadline.academic_year == academic_year)
    
    deadline = query.first()
    
    if not deadline:
        raise HTTPException(status_code=404, detail="Date limite non trouvée")
    
    return {
        "id": deadline.id,
        "deadline_type": deadline.deadline_type,
        "deadline_date": deadline.deadline_date.strftime("%Y-%m-%d") if deadline.deadline_date else "",
        "academic_year": deadline.academic_year,
        "description": deadline.description
    }

# ==========================================
# FRAIS ACADÉMIQUE PAR ID
# ==========================================
@router.get("/{fee_id}")
def get_academic_fee_by_id(
    fee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "accountant", "secretary"))
):
    fee = db.query(AcademicFee).filter(
        AcademicFee.id == fee_id,
        AcademicFee.university_id == current_user.university_id
    ).first()
    if not fee:
        raise HTTPException(status_code=404, detail="Frais non trouvé")
    return {
        "id": fee.id,
        "level": fee.level,
        "domain": fee.domain,
        "payment_type": fee.payment_type,
        "amount": fee.amount,
        "currency": fee.currency,
        "has_monthly_option": getattr(fee, "has_monthly_option", True),
        "monthly_deposit": getattr(fee, "monthly_deposit", None),
        "monthly_installment": getattr(fee, "monthly_installment", None),
        "monthly_months_count": getattr(fee, "monthly_months_count", 5) or 5,
        "academic_year": fee.academic_year,
        "is_locked": fee.is_locked,
        "locked_count": fee.locked_count,
        "created_at": fee.created_at.strftime("%Y-%m-%d %H:%M") if fee.created_at else ""
    }
