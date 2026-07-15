from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.database.connection import SessionLocal
from app.models.user import User
from app.models.university import University
from app.models.audit_log import AuditLog  # ✅ AJOUTER CET IMPORT
from app.schemas.auth_schema import LoginRequest
from app.core.security import hash_password, verify_password, create_access_token
from app.core.dependencies import get_current_user
import os
import time

router = APIRouter(prefix="/auth", tags=["Auth"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ==========================================
# LOGIN avec audit log
# ==========================================
@router.post("/login")
def login(
    data: LoginRequest,
    request: Request,  # ✅ AJOUTER CE PARAMÈTRE
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == data.email).first()
    
    if not user or not verify_password(data.password, user.hashed_password):
        # ✅ Logger la tentative échouée
        try:
            failed_log = AuditLog(
                action="Tentative de connexion échouée",
                user_email=data.email,
                ip_address=request.client.host if request.client else None,
                user_agent=request.headers.get("user-agent"),
                status="failure",
                university_id=1  # Valeur par défaut
            )
            db.add(failed_log)
            db.commit()
        except Exception as e:
            print(f"⚠️ Erreur log échec: {e}")
        
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    
    token = create_access_token(
        data={"sub": user.email, "role": user.role},
        remember_me=data.remember_me
    )

    # ✅ Logger la connexion réussie
    try:
        log = AuditLog(
            action="Connexion réussie",
            user_id=user.id,
            user_email=user.email,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            status="success",
            university_id=user.university_id
        )
        db.add(log)
        db.commit()
    except Exception as e:
        print(f"⚠️ Erreur log succès: {e}")
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role,
            "university_id": user.university_id
        }
    }


# ==========================================
# ME - UN SEUL ENDPOINT (suppression du doublon)
# ==========================================
@router.get("/me")
def get_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Récupère les infos de l'utilisateur connecté"""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "phone": current_user.phone,
        "photo": current_user.photo,
        "university_id": current_user.university_id
    }


# ==========================================
# REGISTER
# ==========================================
@router.post("/register")
async def register_university(
    university_name: str = Form(...),
    country: str = Form(...),
    university_email: str = Form(...),
    admin_full_name: str = Form(...),
    admin_email: str = Form(...),
    admin_phone: str = Form(...),
    admin_password: str = Form(...),
    logo: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    existing_user = db.query(User).filter(User.email == admin_email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")
    
    existing_univ = db.query(University).filter(University.email == university_email).first()
    if existing_univ:
        raise HTTPException(status_code=400, detail="Cette université est déjà enregistrée")
    
    if not logo or not logo.filename:
        raise HTTPException(status_code=400, detail="Le logo est obligatoire")
    
    try:
        new_university = University(
            name=university_name,
            email=university_email,
            country=country,
            address="",
            phone=""
        )
        db.add(new_university)
        db.flush()
        db.refresh(new_university)
        
        logo_filename = None
        if logo and logo.filename:
            os.makedirs("uploads/logos", exist_ok=True)
            ext = logo.filename.split('.')[-1] if '.' in logo.filename else 'png'
            logo_filename = f"university_{new_university.id}_{int(time.time())}.{ext}"
            logo_path = os.path.join("uploads/logos", logo_filename)
            
            content = await logo.read()
            with open(logo_path, "wb") as buffer:
                buffer.write(content)
            
            new_university.logo = logo_filename
        
        new_admin = User(
            full_name=admin_full_name,
            email=admin_email,
            hashed_password=hash_password(admin_password),
            role="admin",
            university_id=new_university.id,
            phone=admin_phone
        )
        db.add(new_admin)
        
        db.commit()
        
        return {
            "message": "Inscription réussie !",
            "university_id": new_university.id,
            "logo": logo_filename
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")


# ==========================================
# UPDATE PROFILE
# ==========================================
@router.put("/me")
def update_profile(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user = db.query(User).filter(User.id == current_user.id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    if "full_name" in data and data["full_name"]:
        user.full_name = data["full_name"]
    if "email" in data and data["email"]:
        existing = db.query(User).filter(
            User.email == data["email"], 
            User.id != user.id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")
        user.email = data["email"]
    if "phone" in data and data["phone"]:
        user.phone = data["phone"]
    
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


# ==========================================
# CHANGE PASSWORD
# ==========================================
@router.put("/change-password")
def change_password(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not verify_password(data.get("old_password", ""), current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Ancien mot de passe incorrect")
    
    current_user.hashed_password = hash_password(data.get("new_password", ""))
    db.commit()
    return {"message": "Mot de passe modifié avec succès"}


# ==========================================
# HEARTBEAT
# ==========================================
@router.post("/heartbeat")
def update_heartbeat(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Met à jour la dernière activité"""
    current_user.last_seen = datetime.utcnow()
    current_user.is_online = True
    db.commit()
    return {"status": "ok"}


# ==========================================
# ONLINE USERS
# ==========================================
@router.get("/online-users")
def get_online_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Utilisateurs en ligne"""
    threshold = datetime.utcnow() - timedelta(minutes=5)
    
    online_users = db.query(User).filter(
        User.last_seen >= threshold,
        User.is_online == True,
        User.university_id == current_user.university_id
    ).all()
    
    return {
        "online_users": [
            {"id": u.id, "name": u.full_name, "role": u.role}
            for u in online_users
        ]
    }