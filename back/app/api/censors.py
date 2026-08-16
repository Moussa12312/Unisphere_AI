from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
import secrets

from app.database.connection import SessionLocal
from app.models.censor import Censor
from app.models.user import User, UserRole
from app.schemas.censor import CensorCreate, CensorUpdate, CensorResponse
from app.core.dependencies import require_role
from app.core.security import hash_password
from app.utils.matricule_generator import generate_employee_id
from app.utils.helpers import paginate_query, apply_search_filter
from app.utils.email_service import send_credentials_email, send_password_reset_email
from app.utils.email_validator import validate_email_exists

router = APIRouter(prefix="/censors", tags=["Censors"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=CensorResponse)
def create_censor(censor_data: CensorCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin"))):
    """Create a new censor."""
    existing = db.query(User).filter(User.email == censor_data.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already exists")

    is_valid, error_msg = validate_email_exists(censor_data.email)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)

    employee_id = generate_employee_id(db, "CENS", current_user.university_id, Censor)

    temp_password = secrets.token_urlsafe(8)  # ✅ Mot de passe aléatoire sécurisé (au lieu de "123456")

    new_user = User(
        full_name=f"{censor_data.first_name} {censor_data.last_name}",
        email=censor_data.email,
        hashed_password=hash_password(temp_password),
        role=UserRole.CENSEUR,
        university_id=current_user.university_id,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    new_censor = Censor(
        first_name=censor_data.first_name,
        last_name=censor_data.last_name,
        email=censor_data.email,
        phone=censor_data.phone,
        department=censor_data.department,
        employee_id=employee_id,
        user_id=new_user.id,
        university_id=current_user.university_id
    )
    db.add(new_censor)
    db.commit()
    db.refresh(new_censor)

    # ✅ AJOUTÉ : envoi des identifiants directement par email au censeur
    send_credentials_email(
        to_email=censor_data.email,
        full_name=f"{censor_data.first_name} {censor_data.last_name}",
        password=temp_password,
        role="censeur",
        university_name=current_user.university.name if current_user.university else ""
    )

    return new_censor


@router.get("/", response_model=dict)
def get_censors(page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100), search: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin"))):
    """Get paginated censors list."""
    query = db.query(Censor).filter(Censor.university_id == current_user.university_id)
    query = apply_search_filter(query, Censor, search, ["first_name", "last_name", "email"])
    censors, total, current_page, total_pages = paginate_query(query, page, page_size)
    return {"data": censors, "total": total, "page": current_page, "page_size": page_size, "total_pages": total_pages}


@router.get("/{censor_id}", response_model=CensorResponse)
def get_censor(censor_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin"))):
    """Get censor by ID."""
    censor = db.query(Censor).filter(Censor.id == censor_id, Censor.university_id == current_user.university_id).first()
    if not censor:
        raise HTTPException(status_code=404, detail="Censor not found")
    return censor


@router.put("/{censor_id}", response_model=CensorResponse)
def update_censor(censor_id: int, censor_data: CensorUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin"))):
    """Update censor."""
    censor = db.query(Censor).filter(Censor.id == censor_id, Censor.university_id == current_user.university_id).first()
    if not censor:
        raise HTTPException(status_code=404, detail="Censor not found")

    for field, value in censor_data.dict(exclude_unset=True).items():
        setattr(censor, field, value)

    db.commit()
    db.refresh(censor)
    return censor


@router.delete("/{censor_id}")
def delete_censor(censor_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin"))):
    """Delete censor."""
    censor = db.query(Censor).filter(Censor.id == censor_id, Censor.university_id == current_user.university_id).first()
    if not censor:
        raise HTTPException(status_code=404, detail="Censor not found")

    if censor.user_id:
        db.query(User).filter(User.id == censor.user_id).delete()

    db.delete(censor)
    db.commit()
    return {"message": "Censor deleted"}


# ==========================================
# RÉINITIALISER LE MOT DE PASSE
# ==========================================
@router.post("/{censor_id}/reset-password")
def reset_censor_password(
    censor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Réinitialiser le mot de passe d'un censeur (génère un mot de passe temporaire sécurisé)."""
    censor = db.query(Censor).filter(
        Censor.id == censor_id,
        Censor.university_id == current_user.university_id
    ).first()

    if not censor:
        raise HTTPException(status_code=404, detail="Censeur non trouvé")

    temp_password = secrets.token_urlsafe(8)

    user = db.query(User).filter(User.id == censor.user_id).first()
    if user:
        user.hashed_password = hash_password(temp_password)
        db.commit()

        # ✅ AJOUTÉ : le nouveau mot de passe est envoyé directement par email au censeur
        send_password_reset_email(
            to_email=user.email,
            full_name=user.full_name,
            new_password=temp_password
        )

        return {
            "temp_password": temp_password,
            "message": "Mot de passe réinitialisé avec succès"
        }

    raise HTTPException(status_code=404, detail="Utilisateur associé non trouvé")