from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.database.connection import SessionLocal
from app.models.user import User
from app.models.university import University
from app.models.audit_log import AuditLog
from app.models.notification import Notification

from app.schemas.auth_schema import LoginRequest
from app.core.security import hash_password, verify_password, create_access_token
from app.core.dependencies import get_current_user
from app.utils.email_validator import validate_email_exists
from app.utils.email_service import send_verification_email, is_email_configured
import os
import time
import secrets

router = APIRouter(prefix="/auth", tags=["Auth"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()



# ==========================================
# LOGIN avec audit log + statut abonnement
# ==========================================
@router.post("/login")
def login(
    data: LoginRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == data.email).first()

    if not user or not verify_password(data.password, user.hashed_password):
        try:
            failed_log = AuditLog(
                action="Tentative de connexion échouée",
                user_email=data.email,
                ip_address=request.client.host if request.client else None,
                user_agent=request.headers.get("user-agent"),
                status="failure",
                university_id=1
            )
            db.add(failed_log)
            db.commit()
        except Exception as e:
            print(f"⚠️ Erreur log échec: {e}")
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

    if not user.is_email_verified and user.role == "admin":
        raise HTTPException(
            status_code=403,
            detail="Veuillez confirmer votre adresse email avant de vous connecter. Verifiez votre boite mail."
        )

    # ✅ NOUVEAU : statut d'abonnement (jamais bloquant au login,
    # pour que l'admin puisse se connecter et renouveler.
    # Le blocage réel est fait par le frontend + ensure_active)
    subscription = None
    if user.role not in ("super_admin", "parent") and user.university_id:
        try:
            from app.core.subscription_service import get_status
            subscription = get_status(db, user.university_id)
        except Exception as e:
            print(f"⚠️ Erreur statut abonnement: {e}")

    token = create_access_token(
        data={"sub": user.email, "role": user.role},
        remember_me=data.remember_me
    )

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
        },
        "subscription": subscription   # ✅ NOUVEAU
    }


# ==========================================
# VÉRIFICATION D'EMAIL
# ==========================================
@router.get("/verify-email")
def verify_email(token: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email_verification_token == token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Lien de vérification invalide ou déjà utilisé")

    if user.is_email_verified:
        return {"message": "Cet email a déjà été confirmé."}

    user.is_email_verified = True
    user.email_verification_token = None
    db.commit()
    return {"message": "Email confirmé avec succès ! Vous pouvez maintenant vous connecter."}


@router.get("/me")
def get_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
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
# REGISTER ÉTAPE 1 : Validation de l'Email Administrateur
# ==========================================
@router.post("/register-step1")
def register_step1(
    data: dict,
    db: Session = Depends(get_db)
):
    admin_full_name = data.get("admin_full_name", "").strip()
    admin_email = data.get("admin_email", "").strip()
    admin_phone = data.get("admin_phone", "").strip()
    admin_password = data.get("admin_password", "").strip()

    if not admin_full_name or not admin_email or not admin_password:
        raise HTTPException(status_code=400, detail="Tous les champs administrateur requis doivent être remplis")

    existing_user = db.query(User).filter(User.email == admin_email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Cet email administrateur est déjà utilisé")

    is_valid, error_msg = validate_email_exists(admin_email)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)

    verification_token = secrets.token_urlsafe(32)
    smtp_configured = is_email_configured()

    if smtp_configured:
        try:
            send_verification_email(admin_email, admin_full_name, verification_token)
        except Exception as e:
            print(f"⚠️ Email de confirmation non envoyé ({e})")


    return {
        "message": "Adresse email de l'administrateur validée avec succès !",
        "admin_email": admin_email,
        "verification_token": verification_token,
        "email_verification_required": smtp_configured
    }


# ==========================================
# REGISTER + essai gratuit automatique
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

    is_valid, error_msg = validate_email_exists(admin_email)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)

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

        verification_token = secrets.token_urlsafe(32)
        smtp_configured = is_email_configured()

        # Si SMTP n'est pas configuré, valider directement l'email pour éviter d'être bloqué (403) en dev local
        auto_verified = not smtp_configured

        new_admin = User(
            full_name=admin_full_name,
            email=admin_email,
            hashed_password=hash_password(admin_password),
            role="admin",
            university_id=new_university.id,
            phone=admin_phone,
            is_email_verified=auto_verified,
            email_verification_token=None if auto_verified else verification_token
        )
        db.add(new_admin)
        db.commit()

        # ✅ Crée automatiquement l'essai gratuit 30 jours
        try:
            from app.core.subscription_service import ensure_subscription_exists
            ensure_subscription_exists(db, new_university.id)
        except Exception as e:
            print(f"⚠️ Erreur création essai: {e}")

        if smtp_configured:
            send_verification_email(admin_email, admin_full_name, verification_token)
            msg = "Inscription réussie ! Vérifiez votre boite mail pour confirmer votre compte avant de vous connecter."
        else:
            print(f"ℹ️ SMTP non configuré : Compte admin '{admin_email}' activé automatiquement pour le développement local.")
            msg = "Inscription réussie ! Votre compte administrateur est prêt. Vous pouvez vous connecter immédiatement."

        return {
            "message": msg,
            "university_id": new_university.id,
            "logo": logo_filename,
            "email_verification_required": not auto_verified
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


# ==========================================
# REINITIALISATION DE MOT DE PASSE (LIBRE-SERVICE TOUS RÔLES)
# ==========================================
@router.post("/forgot-password")
def forgot_password(
    data: dict,
    db: Session = Depends(get_db)
):
    """
    Permet à n'importe quel rôle de réinitialiser son mot de passe avec son email,
    et notifie l'administrateur de l'université.
    """
    email = data.get("email", "").strip()
    new_password = data.get("new_password")

    if not email:
        raise HTTPException(status_code=400, detail="L'adresse email est requise")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Aucun compte trouvé avec cet email")

    temp_password = new_password if new_password and len(str(new_password).strip()) >= 6 else secrets.token_urlsafe(8)
    user.hashed_password = hash_password(temp_password)
    user.is_email_verified = True
    db.commit()

    # Notifier l'administrateur de l'université
    if user.university_id:
        try:
            admins = db.query(User).filter(
                User.university_id == user.university_id,
                User.role == "admin"
            ).all()
            for admin in admins:
                notif = Notification(
                    title="Réinitialisation de mot de passe",
                    content=f"L'utilisateur {user.full_name} (Rôle : {user.role}, Email : {user.email}) a réinitialisé son mot de passe.",
                    user_id=admin.id,
                    university_id=user.university_id,
                    type="security"
                )
                db.add(notif)
            db.commit()
        except Exception as e:
            print(f"⚠️ Notification admin échec: {e}")

    # Tenter l'envoi d'email
    try:
        from app.utils.email_service import send_password_reset_email
        send_password_reset_email(to_email=user.email, full_name=user.full_name, new_password=temp_password)
    except Exception:
        pass

    return {
        "message": "Mot de passe mis à jour avec succès ! Vous pouvez maintenant vous connecter.",
        "temp_password": temp_password if not new_password else None
    }