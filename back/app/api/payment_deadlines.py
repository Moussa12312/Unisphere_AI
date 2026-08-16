from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import date
from pydantic import BaseModel

from app.database.connection import SessionLocal
from app.models.payment_deadline import PaymentDeadline
from app.models.user import User
from app.core.dependencies import require_role

router = APIRouter(prefix="/payment-deadlines", tags=["Payment Deadlines"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class DeadlineCreate(BaseModel):
    academic_year: str
    deadline_type: str
    deadline_date: str
    amount: Optional[float] = None
    description: Optional[str] = None


class DeadlineUpdate(BaseModel):
    academic_year: Optional[str] = None
    deadline_type: Optional[str] = None
    deadline_date: Optional[str] = None
    amount: Optional[float] = None
    description: Optional[str] = None


@router.get("/")
def get_deadlines(
    academic_year: Optional[str] = Query(None),
    deadline_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "accountant"))
):
    """Liste des échéances de paiement"""
    query = db.query(PaymentDeadline).filter(
        PaymentDeadline.university_id == current_user.university_id
    )
    
    if academic_year:
        query = query.filter(PaymentDeadline.academic_year == academic_year)
    if deadline_type:
        query = query.filter(PaymentDeadline.deadline_type == deadline_type)
    
    deadlines = query.order_by(PaymentDeadline.deadline_date).all()
    return deadlines


@router.get("/{deadline_id}")
def get_deadline(
    deadline_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "accountant"))
):
    """Détail d'une échéance"""
    deadline = db.query(PaymentDeadline).filter(
        PaymentDeadline.id == deadline_id,
        PaymentDeadline.university_id == current_user.university_id
    ).first()
    
    if not deadline:
        raise HTTPException(status_code=404, detail="Échéance non trouvée")
    
    return deadline


@router.post("/")
def create_deadline(
    data: DeadlineCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "accountant"))
):
    """Créer une nouvelle échéance"""
    try:
        deadline_date = date.fromisoformat(data.deadline_date)
    except:
        raise HTTPException(status_code=400, detail="Format de date invalide")
    
    deadline = PaymentDeadline(
        university_id=current_user.university_id,
        academic_year=data.academic_year,
        deadline_type=data.deadline_type,
        deadline_date=deadline_date,
        amount=data.amount,
        description=data.description
    )
    
    db.add(deadline)
    db.commit()
    db.refresh(deadline)
    
    return deadline


@router.put("/{deadline_id}")
def update_deadline(
    deadline_id: int,
    data: DeadlineUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "accountant"))
):
    """Modifier une échéance"""
    deadline = db.query(PaymentDeadline).filter(
        PaymentDeadline.id == deadline_id,
        PaymentDeadline.university_id == current_user.university_id
    ).first()
    
    if not deadline:
        raise HTTPException(status_code=404, detail="Échéance non trouvée")
    
    if data.academic_year:
        deadline.academic_year = data.academic_year
    if data.deadline_type:
        deadline.deadline_type = data.deadline_type
    if data.deadline_date:
        try:
            deadline.deadline_date = date.fromisoformat(data.deadline_date)
        except:
            raise HTTPException(status_code=400, detail="Format de date invalide")
    if data.amount is not None:
        deadline.amount = data.amount
    if data.description is not None:
        deadline.description = data.description
    
    db.commit()
    db.refresh(deadline)
    
    return deadline


@router.delete("/{deadline_id}")
def delete_deadline(
    deadline_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Supprimer une échéance"""
    deadline = db.query(PaymentDeadline).filter(
        PaymentDeadline.id == deadline_id,
        PaymentDeadline.university_id == current_user.university_id
    ).first()
    
    if not deadline:
        raise HTTPException(status_code=404, detail="Échéance non trouvée")
    
    db.delete(deadline)
    db.commit()
    
    return {"message": "Échéance supprimée"}