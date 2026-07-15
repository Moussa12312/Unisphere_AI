from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database.connection import SessionLocal
from app.models.user import User
from app.core.dependencies import require_role
from pydantic import BaseModel, EmailStr
from typing import Optional
from app.core.security import hash_password

router = APIRouter(prefix="/staff", tags=["Staff"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Schémas
class StaffCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: str

class StaffUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    role: Optional[str] = None

# ✅ LISTER TOUT LE PERSONNEL
@router.get("/")
def get_all_staff(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    # ✅ CORRECTION : "censeur" au lieu de "censor", et ajout de "admin"
    staff_members = db.query(User).filter(
        User.university_id == current_user.university_id,
        User.role.in_(["admin", "secretary", "censeur", "accountant", "guard"])
    ).all()
    
    return [
        {
            "id": s.id,
            "full_name": s.full_name,
            "email": s.email,
            "role": s.role,
            "is_active": s.is_active if hasattr(s, 'is_active') else True,
            "created_at": s.created_at.isoformat() if hasattr(s, 'created_at') and s.created_at else None
        }
        for s in staff_members
    ]

# ✅ CRÉER UN MEMBRE
@router.post("/")
def create_staff_member(
    staff_data: StaffCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    existing_user = db.query(User).filter(User.email == staff_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")
    
    # ✅ CORRECTION : "censeur" au lieu de "censor", et ajout de "admin"
    valid_roles = ["admin", "secretary", "censeur", "accountant", "guard"]
    if staff_data.role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Rôle invalide. Rôles acceptés: {', '.join(valid_roles)}")
    
    new_staff = User(
        full_name=staff_data.full_name,
        email=staff_data.email,
        hashed_password=hash_password(staff_data.password),
        role=staff_data.role,
        university_id=current_user.university_id,
        is_active=True
    )
    
    db.add(new_staff)
    db.commit()
    db.refresh(new_staff)
    
    return {
        "id": new_staff.id,
        "full_name": new_staff.full_name,
        "email": new_staff.email,
        "role": new_staff.role,
        "message": f"Membre du personnel ({new_staff.role}) créé avec succès"
    }

# ✅ MODIFIER UN MEMBRE
@router.put("/{staff_id}")
def update_staff_member(
    staff_id: int,
    staff_data: StaffUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    staff = db.query(User).filter(
        User.id == staff_id,
        User.university_id == current_user.university_id
    ).first()
    
    if not staff:
        raise HTTPException(status_code=404, detail="Membre du personnel non trouvé")
    
    if staff_data.full_name:
        staff.full_name = staff_data.full_name
        
    if staff_data.email:
        existing = db.query(User).filter(User.email == staff_data.email, User.id != staff_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")
        staff.email = staff_data.email
        
    if staff_data.password:
        staff.hashed_password = hash_password(staff_data.password)
        
    if staff_data.role:
        # ✅ CORRECTION : "censeur" au lieu de "censor"
        valid_roles = ["admin", "secretary", "censeur", "accountant", "guard"]
        if staff_data.role not in valid_roles:
            raise HTTPException(status_code=400, detail="Rôle invalide")
        staff.role = staff_data.role
    
    db.commit()
    db.refresh(staff)
    
    return {"message": "Membre du personnel mis à jour avec succès"}

# ✅ STATISTIQUES
@router.get("/stats/summary")
def get_staff_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    university_id = current_user.university_id
    
    summary = db.query(
        User.role,
        func.count(User.id).label("count")
    ).filter(
        User.university_id == university_id,
        User.role.in_(["admin", "secretary", "censeur", "accountant", "guard"])
    ).group_by(User.role).all()
    
    result = {
        "admin": 0,
        "secretary": 0,
        "censeur": 0,      # ✅ CORRECTION : "censeur"
        "accountant": 0,
        "guard": 0,
        "total": 0
    }
    
    for role, count in summary:
        if role in result:
            result[role] = count
            result["total"] += count
    
    return result

# ✅ SUPPRIMER UN MEMBRE
@router.delete("/{staff_id}")
def delete_staff_member(
    staff_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    staff = db.query(User).filter(
        User.id == staff_id,
        User.university_id == current_user.university_id
    ).first()
    
    if not staff:
        raise HTTPException(status_code=404, detail="Membre du personnel non trouvé")
    
    if staff.id == current_user.id:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas supprimer votre propre compte")
    
    db.delete(staff)
    db.commit()
    
    return {"message": f"{staff.full_name} supprimé avec succès"}

# ✅ DÉSACTIVER/RÉACTIVER UN MEMBRE
@router.patch("/{staff_id}/toggle-status")
def toggle_staff_status(
    staff_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    staff = db.query(User).filter(
        User.id == staff_id,
        User.university_id == current_user.university_id
    ).first()
    
    if not staff:
        raise HTTPException(status_code=404, detail="Membre du personnel non trouvé")
    
    if staff.id == current_user.id:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas désactiver votre propre compte")
    
    staff.is_active = not staff.is_active
    db.commit()
    db.refresh(staff)
    
    status = "activé" if staff.is_active else "désactivé"
    return {
        "id": staff.id,
        "is_active": staff.is_active,
        "message": f"Membre {status}"
    }