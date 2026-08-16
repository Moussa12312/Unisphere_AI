from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
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

# Schémas
class AcademicFeeCreate(BaseModel):
    level: str  # "L1", "L2", "L3", "M1", "M2"
    payment_type: str  # "scolarite", "inscription", "autre"
    amount: float
    academic_year: str  # "2025-2026"

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
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "accountant", "secretary"))
):
    """Récupérer tous les frais académiques"""
    university_id = current_user.university_id
    
    query = db.query(AcademicFee).filter(AcademicFee.university_id == university_id)
    
    if academic_year:
        query = query.filter(AcademicFee.academic_year == academic_year)
    
    fees = query.order_by(AcademicFee.level, AcademicFee.payment_type).all()
    
    return [
        {
            "id": f.id,
            "level": f.level,
            "payment_type": f.payment_type,
            "amount": f.amount,
            "currency": f.currency,
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
    """Créer ou modifier un frais académique"""
    university_id = current_user.university_id
    
    # Vérifier si ce frais existe déjà pour ce niveau/type/année
    existing = db.query(AcademicFee).filter(
        AcademicFee.university_id == university_id,
        AcademicFee.level == data.level,
        AcademicFee.payment_type == data.payment_type,
        AcademicFee.academic_year == data.academic_year
    ).first()
    
    if existing:
        # Si verrouillé, créer une nouvelle version
        if existing.is_locked:
            new_fee = AcademicFee(
                university_id=university_id,
                level=data.level,
                payment_type=data.payment_type,
                amount=data.amount,
                academic_year=data.academic_year,
                is_locked=False,
                locked_count=0,
                created_by=current_user.id
            )
            db.add(new_fee)
            db.commit()
            db.refresh(new_fee)
            
            return {
                "message": "Nouveau frais créé (l'ancien est verrouillé)",
                "fee_id": new_fee.id,
                "is_new_version": True
            }
        else:
            # Modifier directement
            existing.amount = data.amount
            db.commit()
            
            return {
                "message": "Frais mis à jour",
                "fee_id": existing.id,
                "is_new_version": False
            }
    else:
        # Créer un nouveau frais
        new_fee = AcademicFee(
            university_id=university_id,
            level=data.level,
            payment_type=data.payment_type,
            amount=data.amount,
            academic_year=data.academic_year,
            is_locked=False,
            locked_count=0,
            created_by=current_user.id
        )
        db.add(new_fee)
        db.commit()
        db.refresh(new_fee)
        
        return {
            "message": "Frais créé avec succès",
            "fee_id": new_fee.id,
            "is_new_version": False
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
    """Récupérer les frais configurés pour un étudiant (verrouillés ou actifs)"""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Étudiant non trouvé")
    
    # Si l'étudiant a des frais verrouillés
    if student.locked_fee_id:
        locked_fee = db.query(AcademicFee).filter(AcademicFee.id == student.locked_fee_id).first()
        if locked_fee:
            return {
                "locked": True,
                "fee": {
                    "id": locked_fee.id,
                    "level": locked_fee.level,
                    "payment_type": locked_fee.payment_type,
                    "amount": locked_fee.amount,
                    "academic_year": locked_fee.academic_year
                }
            }
    
    # Sinon, récupérer les frais actifs pour son niveau
    active_fees = db.query(AcademicFee).filter(
        AcademicFee.university_id == student.university_id,
        AcademicFee.level == student.level,
        AcademicFee.academic_year == "2025-2026",  # TODO: Rendre dynamique
        AcademicFee.is_locked == False
    ).all()
    
    return {
        "locked": False,
        "fees": [
            {
                "id": f.id,
                "level": f.level,
                "payment_type": f.payment_type,
                "amount": f.amount,
                "academic_year": f.academic_year
            }
            for f in active_fees
        ]
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