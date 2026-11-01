from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from pathlib import Path
from typing import Optional
from app.database.connection import get_db
from app.models.user import User
from app.core.dependencies import get_current_user # Adapte si le nom est différent
from app.core.security import hash_password, verify_password, pwd_context

router = APIRouter(prefix="/users", tags=["Users"])

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
    
    # 1. Mettre à jour le nom complet
    if data.full_name is not None and data.full_name.strip():
        user.full_name = data.full_name.strip()
        
    # 2. Mettre à jour l'email avec sécurité et renouvellement de session
    new_token = None
    if data.email is not None and data.email.strip():
        cleaned_email = data.email.strip().lower()
        if cleaned_email != user.email:
            existing = db.query(User).filter(User.email == cleaned_email, User.id != user.id).first()
            if existing:
                raise HTTPException(status_code=400, detail="Cet email est déjà utilisé par un autre compte.")
            user.email = cleaned_email
            # Renouveler le token JWT pour ne pas invalider la session courante
            try:
                from app.core.security import create_access_token
                from datetime import timedelta
                new_token = create_access_token(
                    data={"sub": user.email, "role": user.role, "id": user.id},
                    expires_delta=timedelta(days=15)
                )
            except Exception as e:
                print(f"⚠️ Erreur génération token profil: {e}")

    # 3. Mettre à jour le téléphone avec gestion stricte d'unicité et de None
    if data.phone is not None:
        cleaned_phone = data.phone.strip() if data.phone.strip() else None
        if cleaned_phone:
            existing_phone = db.query(User).filter(User.phone == cleaned_phone, User.id != user.id).first()
            if existing_phone:
                raise HTTPException(status_code=400, detail="Ce numéro de téléphone est déjà associé à un autre compte.")
            user.phone = cleaned_phone
        else:
            user.phone = None
    
    db.commit()
    db.refresh(user)
    
    res = {
        "message": "Profil mis à jour avec succès",
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "phone": user.phone or "",
            "role": user.role,
            "photo": user.photo or ""
        }
    }
    if new_token:
        res["access_token"] = new_token
    return res


@router.post("/profile/photo")
def upload_profile_photo(
    photo: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    import time
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
        
    file_extension = photo.filename.split(".")[-1].lower() if "." in photo.filename else "jpg"
    filename = f"user_{user.id}_{int(time.time())}.{file_extension}"
    content = photo.file.read()
    
    # Écrire dans uploads/profiles et uploads/
    file_path = UPLOAD_DIR / filename
    with open(file_path, "wb") as buffer:
        buffer.write(content)
        
    main_upload_path = BASE_DIR / "uploads" / filename
    with open(main_upload_path, "wb") as buffer:
        buffer.write(content)
    
    user.photo = filename
    
    # Synchroniser la photo avec la table spécifique du rôle (étudiant, enseignant)
    try:
        from app.models.student import Student
        student = db.query(Student).filter(Student.user_id == user.id).first()
        if student:
            student.photo = filename
    except Exception:
        pass

    try:
        from app.models.teacher import Teacher
        teacher = db.query(Teacher).filter(Teacher.user_id == user.id).first()
        if teacher:
            teacher.photo = filename
    except Exception:
        pass

    db.commit()
    db.refresh(user)
    return {"message": "Photo mise à jour", "photo_url": filename, "photo": filename}

@router.put("/password")
def change_password(
    data: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    # Vérifier l'ancien mot de passe
    if not verify_password(data.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Mot de passe actuel incorrect")
    
    if len(data.new_password.strip()) < 6:
        raise HTTPException(status_code=400, detail="Le nouveau mot de passe doit comporter au moins 6 caractères")
        
    # Mettre à jour le mot de passe
    user.hashed_password = hash_password(data.new_password)
    db.commit()
    
    return {"message": "Mot de passe modifié avec succès"}

@router.get("/preferences")
def get_user_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    import json
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    prefs = {}
    if user.preferences:
        try:
            prefs = json.loads(user.preferences)
        except Exception:
            prefs = {}
    return prefs

@router.put("/preferences")
def update_user_preferences(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    import json
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    current_prefs = {}
    if user.preferences:
        try:
            current_prefs = json.loads(user.preferences)
        except Exception:
            current_prefs = {}
            
    current_prefs.update(data)
    user.preferences = json.dumps(current_prefs)
    db.commit()
    return {"message": "Préférences enregistrées avec succès", "preferences": current_prefs}

@router.get("/sessions")
def get_user_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.models.audit_log import AuditLog
    logs = db.query(AuditLog).filter(
        AuditLog.user_id == current_user.id
    ).order_by(AuditLog.created_at.desc()).limit(10).all()
    
    return [
        {
            "id": l.id,
            "action": l.action,
            "ip_address": l.ip_address or "127.0.0.1",
            "user_agent": l.user_agent or "Navigateur Web",
            "status": l.status or "success",
            "date": l.created_at.strftime("%d/%m/%Y %H:%M") if l.created_at else ""
        }
        for l in logs
    ]

@router.get("/")
def get_all_users(
    all_roles: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    query = db.query(User).filter(User.university_id == current_user.university_id)
    if not all_roles:
        excluded_roles = ["student", "teacher", "super_admin", "superadmin", "parent"]
        query = query.filter(~User.role.in_(excluded_roles))
    
    users = query.all()
    
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


class UserStatusUpdate(BaseModel):
    is_active: bool

class AdminPasswordReset(BaseModel):
    new_password: str

@router.patch("/{user_id}/status")
def update_user_status(
    user_id: int,
    data: UserStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas modifier votre propre statut")
    user.is_active = data.is_active
    db.commit()
    db.refresh(user)
    return {"message": f"Statut mis à jour ({'Actif' if user.is_active else 'Inactif'})", "is_active": user.is_active}

@router.post("/{user_id}/reset-password")
def admin_reset_password(
    user_id: int,
    data: AdminPasswordReset,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    user.hashed_password = hash_password(data.new_password)
    db.commit()
    return {"message": "Mot de passe réinitialisé avec succès"}

@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Impossible de supprimer son propre compte")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    db.delete(user)
    db.commit()
    return {"message": "Compte supprimé avec succès"}