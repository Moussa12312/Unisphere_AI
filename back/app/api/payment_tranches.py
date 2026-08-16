from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.database.connection import SessionLocal
from app.models.payment_tranche import PaymentTranche
from app.models.user import User
from app.schemas.payment_tranche import PaymentTrancheCreate, PaymentTrancheResponse
from app.core.dependencies import require_role

router = APIRouter(prefix="/payment-tranches", tags=["Payment Tranches"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ==========================================
# CRÉER UNE TRANCHE
# ==========================================
@router.post("/", response_model=PaymentTrancheResponse)
def create_tranche(
    data: PaymentTrancheCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Créer une nouvelle tranche de paiement"""
    university_id = current_user.university_id
    
    # Vérifier si cette tranche existe déjà
    existing = db.query(PaymentTranche).filter(
        PaymentTranche.university_id == university_id,
        PaymentTranche.level == data.level,
        PaymentTranche.payment_type == data.payment_type,
        PaymentTranche.academic_year == data.academic_year,
        PaymentTranche.tranche_number == data.tranche_number
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400, 
            detail=f"La tranche {data.tranche_number} existe déjà pour ce niveau et type"
        )
    
    # Créer la tranche
    new_tranche = PaymentTranche(
        university_id=university_id,
        level=data.level,
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
    if payment_type:
        query = query.filter(PaymentTranche.payment_type == payment_type)
    if academic_year:
        query = query.filter(PaymentTranche.academic_year == academic_year)
    
    tranches = query.order_by(
        PaymentTranche.level,
        PaymentTranche.payment_type,
        PaymentTranche.tranche_number
    ).all()
    
    return tranches

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