from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.database.connection import SessionLocal
from app.models.payment_tranche import PaymentTranche
from app.models.user import User
from app.schemas.payment_tranche import (
    PaymentTrancheCreate, 
    PaymentTrancheResponse, 
    ConfigureThreeTranchesRequest
)
from app.core.dependencies import require_role

router = APIRouter(prefix="/payment-tranches", tags=["Payment Tranches"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ==========================================
# CONFIGURER STRICTEMENT LES 3 TRANCHES (100%)
# ==========================================
@router.post("/configure-three", response_model=List[PaymentTrancheResponse])
def configure_three_tranches(
    data: ConfigureThreeTranchesRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """
    Configure strictement les 3 tranches (P1, P2, P3) d'un niveau et domaine.
    Vérifie que le total des pourcentages est exactement 100.0%.
    Nettoie toute tranche superflue (> 3).
    """
    university_id = current_user.university_id

    # 1. Validation : strictement 3 tranches
    if len(data.tranches) != 3:
        raise HTTPException(
            status_code=400,
            detail="Le règlement académique impose strictement 3 tranches (P1, P2, P3)."
        )

    # 2. Validation : numéros 1, 2, 3
    numbers = [t.tranche_number for t in data.tranches]
    if sorted(numbers) != [1, 2, 3]:
        raise HTTPException(
            status_code=400,
            detail="Les 3 tranches doivent être numérotées respectivement 1, 2 et 3."
        )

    # 3. Validation : somme des pourcentages = 100%
    total_pct = sum(float(t.percentage) for t in data.tranches)
    if not (99.8 <= total_pct <= 100.2):
        raise HTTPException(
            status_code=400,
            detail=f"La somme des pourcentages doit être exactement égale à 100% (actuel: {round(total_pct, 2)}%)."
        )

    for t in data.tranches:
        if t.percentage <= 0:
            raise HTTPException(
                status_code=400,
                detail=f"Le pourcentage de la tranche {t.tranche_number} doit être supérieur à 0%."
            )

    # 4. Requête des tranches existantes pour ce niveau/domaine
    query_existing = db.query(PaymentTranche).filter(
        PaymentTranche.university_id == university_id,
        PaymentTranche.level == data.level,
        PaymentTranche.payment_type == data.payment_type,
        PaymentTranche.academic_year == data.academic_year
    )
    if data.domain:
        query_existing = query_existing.filter(PaymentTranche.domain == data.domain)
    else:
        query_existing = query_existing.filter((PaymentTranche.domain == None) | (PaymentTranche.domain == ""))

    existing_list = query_existing.all()
    # Garder une seule tranche par numéro (1, 2, 3) et supprimer tout doublon ou tranche superflue (> 3)
    existing_by_num = {}
    for t in existing_list:
        if t.tranche_number in (1, 2, 3) and t.tranche_number not in existing_by_num:
            existing_by_num[t.tranche_number] = t
        else:
            db.delete(t)

    saved_tranches = []
    for item in sorted(data.tranches, key=lambda x: x.tranche_number):
        parsed_due_date = None
        if item.due_date:
            try:
                parsed_due_date = datetime.fromisoformat(item.due_date.replace("Z", ""))
            except Exception:
                try:
                    parsed_due_date = datetime.strptime(item.due_date[:10], "%Y-%m-%d")
                except Exception:
                    pass

        if item.tranche_number in existing_by_num:
            t_obj = existing_by_num[item.tranche_number]
            t_obj.tranche_name = item.tranche_name
            t_obj.percentage = round(item.percentage, 2)
            t_obj.amount = round(item.amount)
            t_obj.due_date = parsed_due_date
        else:
            t_obj = PaymentTranche(
                university_id=university_id,
                level=data.level,
                domain=data.domain,
                payment_type=data.payment_type,
                academic_year=data.academic_year,
                tranche_number=item.tranche_number,
                tranche_name=item.tranche_name,
                percentage=round(item.percentage, 2),
                amount=round(item.amount),
                due_date=parsed_due_date
            )
            db.add(t_obj)

        saved_tranches.append(t_obj)

    # ✅ Synchronisation automatique sur les 3 pôles associés si demandé
    ASSOCIATED_DOMAINS = [
        "Gestion & Economie",
        "Communication & Medias",
        "Informatique & Technologies"
    ]
    if getattr(data, 'sync_associated_domains', False) and data.domain in ASSOCIATED_DOMAINS:
        for other_domain in ASSOCIATED_DOMAINS:
            if other_domain != data.domain:
                q_other = db.query(PaymentTranche).filter(
                    PaymentTranche.university_id == university_id,
                    PaymentTranche.level == data.level,
                    PaymentTranche.domain == other_domain,
                    PaymentTranche.payment_type == data.payment_type,
                    PaymentTranche.academic_year == data.academic_year
                ).all()
                other_by_num = {}
                for t in q_other:
                    if t.tranche_number in (1, 2, 3) and t.tranche_number not in other_by_num:
                        other_by_num[t.tranche_number] = t
                    else:
                        db.delete(t)
                for item in sorted(data.tranches, key=lambda x: x.tranche_number):
                    parsed_due_date = None
                    if item.due_date:
                        try:
                            parsed_due_date = datetime.fromisoformat(item.due_date.replace("Z", ""))
                        except Exception:
                            try:
                                parsed_due_date = datetime.strptime(item.due_date[:10], "%Y-%m-%d")
                            except Exception:
                                pass
                    if item.tranche_number in other_by_num:
                        o_obj = other_by_num[item.tranche_number]
                        o_obj.tranche_name = item.tranche_name
                        o_obj.percentage = round(item.percentage, 2)
                        o_obj.amount = round(item.amount)
                        o_obj.due_date = parsed_due_date
                    else:
                        o_obj = PaymentTranche(
                            university_id=university_id,
                            level=data.level,
                            domain=other_domain,
                            payment_type=data.payment_type,
                            academic_year=data.academic_year,
                            tranche_number=item.tranche_number,
                            tranche_name=item.tranche_name,
                            percentage=round(item.percentage, 2),
                            amount=round(item.amount),
                            due_date=parsed_due_date
                        )
                        db.add(o_obj)

    db.commit()
    for t in saved_tranches:
        db.refresh(t)

    return sorted(saved_tranches, key=lambda x: x.tranche_number)

# ==========================================
# CRÉER UNE TRANCHE (ANCIEN ENDPOINT SÉCURISÉ)
# ==========================================
@router.post("/", response_model=PaymentTrancheResponse)
def create_tranche(
    data: PaymentTrancheCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Créer une nouvelle tranche de paiement configurable par niveau et domaine"""
    university_id = current_user.university_id
    
    if data.tranche_number not in [1, 2, 3]:
        raise HTTPException(
            status_code=400,
            detail="Le système académique accepte strictement 3 tranches (1, 2 ou 3)."
        )

    # Vérifier si cette tranche existe déjà
    query_existing = db.query(PaymentTranche).filter(
        PaymentTranche.university_id == university_id,
        PaymentTranche.level == data.level,
        PaymentTranche.payment_type == data.payment_type,
        PaymentTranche.academic_year == data.academic_year,
        PaymentTranche.tranche_number == data.tranche_number
    )
    if data.domain:
        query_existing = query_existing.filter(PaymentTranche.domain == data.domain)
    else:
        query_existing = query_existing.filter((PaymentTranche.domain == None) | (PaymentTranche.domain == ""))

    existing = query_existing.first()
    
    if existing:
        raise HTTPException(
            status_code=400, 
            detail=f"La tranche {data.tranche_number} existe déjà pour ce niveau, domaine et type"
        )

    # Vérifier que le total des pourcentages ne dépasse pas 100%
    sibling_query = db.query(PaymentTranche).filter(
        PaymentTranche.university_id == university_id,
        PaymentTranche.level == data.level,
        PaymentTranche.payment_type == data.payment_type,
        PaymentTranche.academic_year == data.academic_year
    )
    if data.domain:
        sibling_query = sibling_query.filter(PaymentTranche.domain == data.domain)
    else:
        sibling_query = sibling_query.filter((PaymentTranche.domain == None) | (PaymentTranche.domain == ""))
    existing_sum = sum(t.percentage for t in sibling_query.all())
    if existing_sum + data.percentage > 100.1:
        raise HTTPException(
            status_code=400,
            detail=f"Le cumul des pourcentages ({round(existing_sum + data.percentage, 2)}%) ne peut pas dépasser 100%."
        )
    
    # Créer la tranche
    new_tranche = PaymentTranche(
        university_id=university_id,
        level=data.level,
        domain=data.domain,
        payment_type=data.payment_type,
        academic_year=data.academic_year,
        tranche_number=data.tranche_number,
        tranche_name=data.tranche_name,
        percentage=data.percentage,
        amount=data.amount,
        due_date=datetime.fromisoformat(data.due_date) if data.due_date else None
    )
    
    db.add(new_tranche)
    db.commit()
    db.refresh(new_tranche)
    
    return new_tranche

# ==========================================
# LISTER LES TRANCHES
# ==========================================
@router.get("/", response_model=List[PaymentTrancheResponse])
def get_tranches(
    level: Optional[str] = None,
    domain: Optional[str] = None,
    payment_type: Optional[str] = None,
    academic_year: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "accountant", "secretary"))
):
    """Récupérer toutes les tranches configurées"""
    university_id = current_user.university_id
    
    query = db.query(PaymentTranche).filter(
        PaymentTranche.university_id == university_id
    )
    
    if level:
        query = query.filter(PaymentTranche.level == level)
    if domain:
        query = query.filter(PaymentTranche.domain == domain)
    if payment_type:
        query = query.filter(PaymentTranche.payment_type == payment_type)
    if academic_year:
        if academic_year.lower() != "all":
            query = query.filter(PaymentTranche.academic_year == academic_year)
    else:
        from app.utils.academic_year import get_current_academic_year
        cur_year = get_current_academic_year(db, university_id)
        query = query.filter(PaymentTranche.academic_year == cur_year)
    
    tranches = query.order_by(
        PaymentTranche.level,
        PaymentTranche.domain,
        PaymentTranche.payment_type,
        PaymentTranche.tranche_number
    ).all()
    
    # Dédoublonnage défensif pour garantir qu'aucune université ne reçoive de doublons
    seen_keys = set()
    clean_tranches = []
    for t in tranches:
        dom = t.domain or ""
        key = (t.university_id, t.academic_year, t.level, dom, t.payment_type, t.tranche_number)
        if key not in seen_keys:
            seen_keys.add(key)
            clean_tranches.append(t)

    return clean_tranches

# ==========================================
# SUPPRIMER UNE TRANCHE
# ==========================================
@router.delete("/{tranche_id}")
def delete_tranche(
    tranche_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Supprimer une tranche"""
    tranche = db.query(PaymentTranche).filter(
        PaymentTranche.id == tranche_id,
        PaymentTranche.university_id == current_user.university_id
    ).first()
    
    if not tranche:
        raise HTTPException(status_code=404, detail="Tranche non trouvée")
    
    db.delete(tranche)
    db.commit()
    
    return {"message": "Tranche supprimée avec succès"}