from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from pathlib import Path
from typing import Optional
from app.database.connection import get_db
from app.models.user import User
from app.core.dependencies import get_current_user # Adapte si le nom est différent
from passlib.context import CryptContext
from app.core.security import hash_password, verify_password

router = APIRouter(prefix="/users", tags=["Users"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

BASE_DIR = Path(__file__).resolve().parent.parent.parent
UPLOAD_DIR = BASE_DIR / "uploads" / "profiles"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

class UserProfileUpdate(BaseModel):
    full_name: str
    email: str
    phone: str

class PasswordUpdate(BaseModel):
    current_password: str
    new_password: str

class UserCreate(BaseModel):
    full_name: str
    email: str
    phone: str
    role: str
    password: str

class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.get("/profile")
def get_user_profile(current_user: User = Depends(get_current_user)):
    return {
        "full_name": current_user.full_name,
        "email": current_user.email,
        "phone": current_user.phone or "",
        "role": current_user.role,
        "photo": current_user.photo or ""
    }

@router.put("/profile")
def update_profile(
    data: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # ✅ RÉCUPÉRER l'utilisateur depuis la session du endpoint
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    # Mettre à jour les champs
    if data.full_name:
        user.full_name = data.full_name
    if data.email:
        # Vérifier si l'email n'est pas déjà utilisé
        existing = db.query(User).filter(User.email == data.email, User.id != user.id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")
        user.email = data.email
    if data.phone:
        user.phone = data.phone
    
    db.commit()
    db.refresh(user)
    
    return {
        "message": "Profil mis à jour avec succès",
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "phone": user.phone,
            "role": user.role
        }
    }


@router.post("/profile/photo")
def upload_profile_photo(
    photo: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    file_extension = photo.filename.split(".")[-1].lower()
    filename = f"user_{current_user.id}.{file_extension}"
    file_path = UPLOAD_DIR / filename
    
    with open(file_path, "wb") as buffer:
        buffer.write(photo.file.read())
    
    current_user.photo = filename
    db.commit()
    return {"message": "Photo mise à jour", "photo_url": filename}

@router.put("/password")
def change_password(
    data: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # ✅ RÉCUPÉRER l'utilisateur depuis la session du endpoint
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    # Vérifier l'ancien mot de passe
    if not verify_password(data.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Mot de passe actuel incorrect")
    
    # Mettre à jour le mot de passe
    user.hashed_password = hash_password(data.new_password)
    db.commit()
    
    return {"message": "Mot de passe modifié avec succès"}

@router.get("/")
def get_all_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    # ✅ FILTRAGE : Seulement le personnel administratif de notre université
    # Exclusion des rôles "student" et "teacher" qui ont leurs propres pages
    excluded_roles = ["student", "teacher"]
    
    users = db.query(User).filter(
        User.university_id == current_user.university_id,
        ~User.role.in_(excluded_roles)  # ✅ Exclusion des rôles
    ).all()
    
    result = []
    for u in users:
        last_login_str = u.last_login.strftime("%Y-%m-%d %H:%M") if u.last_login else "Jamais"
        result.append({
            "id": u.id,
            "full_name": u.full_name,
            "email": u.email,
            "role": u.role,
            "is_active": u.is_active,
            "last_login": last_login_str,
            "photo": u.photo or ""
        })
    return result

@router.post("/")
def create_user(
    data: UserCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Seul un administrateur peut créer des comptes")
    
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")
    
    # Vérification que le rôle est valide selon ton Enum
    valid_roles = ["admin", "teacher", "censeur", "secretary", "accountant", "guard", "student"]
    if data.role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Rôle invalide. Choisir parmi: {', '.join(valid_roles)}")
    
    new_user = User(
        full_name=data.full_name,
        email=data.email,
        phone=data.phone,
        role=data.role,
        hashed_password=pwd_context.hash(data.password),
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "Compte créé avec succès"}