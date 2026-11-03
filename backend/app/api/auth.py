from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
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
# CONTEXTE D'AUTHENTIFICATION & COMPTES RAPIDES
# ==========================================
@router.get("/context")
def get_auth_context(db: Session = Depends(get_db)):
    """Retourne le contexte d'authentification de l'université pour la page login"""
    univ = db.query(University).filter(University.id == 1).first() or db.query(University).first()
    return {
        "university": {
            "name": univ.name if univ else "UniSphere AI",
            "slogan": getattr(univ, 'slogan', None) or "Excellence, Innovation & Technologie",
            "address": getattr(univ, 'address', None) or "Hamdallaye ACI 2000, Bamako, Mali",
            "academic_year": "2026-2027",
            "logo": univ.logo if univ else None
        },
        "quick_accounts": [
            { "role": "super_admin", "label": "Super Admin", "email": "chakirunisphereai@gmail.com", "name": "Chakir's Entreprise", "department": "SaaS Platform" },
            { "role": "admin", "label": "Direction", "email": "admin@unisphere.ai", "name": "Direction Université", "department": "Administration" },
            { "role": "teacher", "label": "Professeur", "email": "enseignant@unisphere.ai", "name": "Corps Professoral", "department": "Pédagogie" },
            { "role": "student", "label": "Étudiant", "email": "etudiant@unisphere.ai", "name": "Espace Étudiant", "matricule": "EC-2026-0001", "department": "LMD" },
            { "role": "secretary", "label": "Secrétaire", "email": "secretaire@unisphere.ai", "name": "Secrétariat Général", "department": "Scolarité" },
            { "role": "censeur", "label": "Censeur", "email": "censeur@unisphere.ai", "name": "Direction des Études", "department": "Études" },
            { "role": "accountant", "label": "Comptable", "email": "comptable@unisphere.ai", "name": "Service Financier", "department": "Finances" },
            { "role": "guard", "label": "Poste Garde", "email": "gardien@unisphere.ai", "name": "Sécurité & Portique", "department": "Contrôle" },
            { "role": "alumni", "label": "Alumni", "email": "alumni@unisphere.ai", "name": "Moussa Fofana", "department": "Réseau Diplômés" }
        ],
        "default_password": "unisphere2026"
    }


# ==========================================
# LOGIN avec audit log + statut abonnement
# ==========================================
@router.post("/login")
def login(
    data: LoginRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    identifier = (data.email or "").strip()
    user = db.query(User).filter(User.email.ilike(identifier)).first()

    if not user:
        # Recherche par matricule étudiant
        try:
            from app.models.student import Student
            stu = db.query(Student).filter(Student.matricule.ilike(identifier)).first()
            if stu and stu.user_id:
                user = db.query(User).filter(User.id == stu.user_id).first()
        except Exception:
            pass

    if not user:
        # Recherche par numéro de téléphone
        user = db.query(User).filter(User.phone == identifier).first()

    if not user or not verify_password(data.password, user.hashed_password):
        try:
            failed_log = AuditLog(
                action="Tentative de connexion échouée",
                user_email=data.email,
                ip_address=request.client.host if request.client else None,
                user_agent=request.headers.get("user-agent"),
                status="failure",
                university_id=user.university_id if user else None
            )
            db.add(failed_log)
            db.commit()
        except Exception as e:
            db.rollback()
            print(f"⚠️ Erreur log échec: {e}")
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

    if not user.is_email_verified and user.role == "admin":
        raise HTTPException(
            status_code=403,
            detail="Veuillez confirmer votre adresse email avant de vous connecter. Verifiez votre boite mail."
        )

    # ✅ Vérification si l'université est suspendue / bloquée par le Super-Admin
    if user.role != "super_admin" and user.university_id:
        univ = db.query(University).filter(University.id == user.university_id).first()
        if univ and (univ.is_active == False or univ.status == "suspended"):
            raise HTTPException(
                status_code=403,
                detail="Accès suspendu. Votre université a été bloquée par l'administrateur de la plateforme pour défaut de paiement ou motif administratif."
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
        db.rollback()
        print(f"⚠️ Erreur log succès: {e}")

    # ✅ MULTI-UNIVERSITÉS (Option B Enseignants)
    if user.role == "teacher":
        from app.models.teacher import Teacher
        # Chercher par user_id ET par email pour couvrir tous les cas d'inscription multi-établissements
        all_affiliations = db.query(Teacher).filter(
            or_(Teacher.user_id == user.id, func.lower(Teacher.email) == user.email.lower())
        ).all()
        
        # Dédupliquer par university_id
        seen_univs = set()
        affiliations = []
        for a in all_affiliations:
            if a.university_id not in seen_univs:
                seen_univs.add(a.university_id)
                affiliations.append(a)

        if len(affiliations) > 1:
            univ_list = []
            for aff in affiliations:
                u_obj = db.query(University).filter(University.id == aff.university_id).first()
                univ_list.append({
                    "teacher_id": aff.id,
                    "university_id": aff.university_id,
                    "university_name": u_obj.name if u_obj else (aff.university_name or "Université"),
                    "department": aff.department,
                    "speciality": aff.speciality,
                    "slogan": u_obj.slogan if u_obj else "",
                    "city": u_obj.address if u_obj else ""
                })
            
            token = create_access_token(
                data={"sub": user.email, "role": user.role, "requires_select": True},
                remember_me=data.remember_me
            )
            return {
                "access_token": token,
                "token_type": "bearer",
                "requires_university_selection": True,
                "affiliations": univ_list,
                "user": {
                    "id": user.id,
                    "full_name": user.full_name,
                    "email": user.email,
                    "role": user.role,
                    "phone": user.phone
                }
            }

    user_photo = user.photo or ""
    if not user_photo:
        if user.role == "student":
            try:
                from app.models.student import Student
                student = db.query(Student).filter(Student.user_id == user.id).first()
                if student and student.photo:
                    user_photo = student.photo
            except Exception:
                pass
        elif user.role == "teacher":
            try:
                from app.models.teacher import Teacher
                teacher = db.query(Teacher).filter(Teacher.user_id == user.id).first()
                if teacher and teacher.photo:
                    user_photo = teacher.photo
            except Exception:
                pass
        elif user.role == "censeur":
            try:
                from app.models.censor import Censor
                censor = db.query(Censor).filter(Censor.user_id == user.id).first()
                if censor and censor.photo:
                    user_photo = censor.photo
            except Exception:
                pass
        elif user.role == "alumni":
            try:
                from app.models.alumni import AlumniProfile
                alumni = db.query(AlumniProfile).filter(AlumniProfile.user_id == user.id).first()
                if alumni and alumni.photo:
                    user_photo = alumni.photo
            except Exception:
                pass

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role,
            "photo": user_photo,
            "university_id": user.university_id
        },
        "subscription": subscription   # ✅ NOUVEAU
    }


@router.get("/me")
def get_current_user_info(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user_photo = current_user.photo or ""
    if not user_photo:
        if current_user.role == "student":
            try:
                from app.models.student import Student
                student = db.query(Student).filter(Student.user_id == current_user.id).first()
                if student and student.photo:
                    user_photo = student.photo
            except Exception:
                pass
        elif current_user.role == "teacher":
            try:
                from app.models.teacher import Teacher
                teacher = db.query(Teacher).filter(Teacher.user_id == current_user.id).first()
                if teacher and teacher.photo:
                    user_photo = teacher.photo
            except Exception:
                pass
        elif current_user.role == "censeur":
            try:
                from app.models.censor import Censor
                censor = db.query(Censor).filter(Censor.user_id == current_user.id).first()
                if censor and censor.photo:
                    user_photo = censor.photo
            except Exception:
                pass
        elif current_user.role == "alumni":
            try:
                from app.models.alumni import AlumniProfile
                alumni = db.query(AlumniProfile).filter(AlumniProfile.user_id == current_user.id).first()
                if alumni and alumni.photo:
                    user_photo = alumni.photo
            except Exception:
                pass

    return {
        "id": current_user.id,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "role": current_user.role,
        "phone": current_user.phone or "",
        "photo": user_photo,
        "university_id": current_user.university_id
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
    import json
    threshold = datetime.utcnow() - timedelta(minutes=5)

    online_users = db.query(User).filter(
        User.last_seen >= threshold,
        User.is_online == True,
        User.university_id == current_user.university_id
    ).all()

    filtered = []
    for u in online_users:
        if u.preferences:
            try:
                p = json.loads(u.preferences)
                if p.get("show_online_status") is False:
                    continue
            except Exception:
                pass
        filtered.append({"id": u.id, "name": u.full_name, "role": u.role})

    return {
        "online_users": filtered
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
                    message=f"L'utilisateur {user.full_name} (Rôle : {user.role}, Email : {user.email}) a réinitialisé son mot de passe.",
                    recipient_id=admin.id,
                    university_id=user.university_id,
                    type="security",
                    notification_type="security"
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

# ==========================================
# CONTACT PLATEFORME (public, pour page suspendu)
# ==========================================
@router.get("/platform-contact")
def platform_contact(db: Session = Depends(get_db)):
    sa = db.query(User).filter(User.role == "super_admin").first()
    return {
        "contact_email": sa.email if sa else "support@unisphere-ai.com",
        "platform_name": "UniSphere AI",
    }


# ==========================================
# DEMANDE DE CONTACT / ESSAI GRATUIT (Public)
# ==========================================
@router.post("/contact-request")
def submit_contact_request(
    data: dict,
    db: Session = Depends(get_db)
):
    """
    Formulaire public de demande d'ouverture de compte, d'essai gratuit ou de devis
    transmis directement au Super Administrateur (Chakir's Entreprise).
    """
    university_name = (data.get("university_name") or "").strip()
    contact_name = (data.get("contact_name") or "").strip()
    phone = (data.get("phone") or "").strip()
    email = (data.get("email") or "").strip()
    plan = (data.get("plan") or "Non spécifié").strip()
    message_text = (data.get("message") or "").strip()

    if not university_name or not contact_name or not phone:
        raise HTTPException(
            status_code=400,
            detail="Veuillez renseigner le nom de l'université, votre nom complet et votre numéro de téléphone."
        )

    # 1. Trouver le Super Admin
    super_admin = db.query(User).filter(User.role == "super_admin").first()
    recipient_id = super_admin.id if super_admin else 1
    target_univ_id = super_admin.university_id if (super_admin and super_admin.university_id) else None
    if not target_univ_id:
        from app.models.university import University
        first_univ = db.query(University).first()
        target_univ_id = first_univ.id if first_univ else 1

    subject = f"🚀 Nouvelle demande d'essai / compte : {university_name}"
    content = (
        f"📋 DEMANDE D'OUVERTURE DE COMPTE / ESSAI GRATUIT\n\n"
        f"• Établissement : {university_name}\n"
        f"• Responsable / Contact : {contact_name}\n"
        f"• Téléphone : {phone}\n"
        f"• Email : {email if email else 'Non renseigné'}\n"
        f"• Formule choisie : {plan}\n"
        f"• Message / Précisions : {message_text if message_text else 'Demande de rappel et mise en service de la plateforme'}\n\n"
        f"Date : {datetime.now().strftime('%d/%m/%Y à %H:%M')}"
    )

    # 2. Créer le Message interne pour le Super Admin
    try:
        from app.models.message import Message
        msg = Message(
            sender_id=recipient_id,
            recipient_id=recipient_id,
            subject=subject,
            content=content,
            message_type="direct",
            university_id=target_univ_id
        )
        db.add(msg)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"⚠️ Erreur création message contact: {e}")

    # 3. Créer une Notification instantanée pour le Super Admin
    try:
        from app.models.notification import Notification
        notif = Notification(
            title=f"🚀 Nouvelle demande : {university_name}",
            message=f"{contact_name} ({phone}) souhaite déployer UniSphere AI pour {university_name}.",
            notification_type="contact_request",
            type="info",
            target_roles=["super_admin"],
            recipient_id=recipient_id,
            created_by=recipient_id,
            university_id=target_univ_id,
            is_read=False,
            extra_data={
                "university_name": university_name,
                "contact_name": contact_name,
                "phone": phone,
                "email": email,
                "plan": plan,
                "message": message_text
            }
        )
        db.add(notif)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"⚠️ Erreur création notification contact: {e}")

    # 4. Envoi Email au Super Admin si SMTP actif
    if super_admin and super_admin.email:
        from app.utils.email_service import send_email
        html_email = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <div style="background-color: #031B63; padding: 15px; border-radius: 8px; text-align: center; color: white;">
                <h2 style="margin: 0; font-size: 20px;">UniSphere AI • Nouveau Prospect</h2>
            </div>
            <div style="padding: 20px 10px; color: #1e293b; line-height: 1.6;">
                <p>Salam Chakir's Entreprise,</p>
                <p>Un nouvel établissement vient de soumettre une demande via le site web :</p>
                <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
                    <tr><td style="padding: 8px; font-weight: bold; width: 140px;">Établissement :</td><td style="padding: 8px;">{university_name}</td></tr>
                    <tr style="background-color: #f8fafc;"><td style="padding: 8px; font-weight: bold;">Contact :</td><td style="padding: 8px;">{contact_name}</td></tr>
                    <tr><td style="padding: 8px; font-weight: bold;">Téléphone :</td><td style="padding: 8px;"><a href="tel:{phone}" style="color: #FF6B00; font-weight: bold;">{phone}</a></td></tr>
                    <tr style="background-color: #f8fafc;"><td style="padding: 8px; font-weight: bold;">Email :</td><td style="padding: 8px;">{email if email else 'Non renseigné'}</td></tr>
                    <tr><td style="padding: 8px; font-weight: bold;">Offre choisie :</td><td style="padding: 8px; font-weight: bold; color: #031B63;">{plan}</td></tr>
                    <tr style="background-color: #f8fafc;"><td style="padding: 8px; font-weight: bold;">Précisions :</td><td style="padding: 8px;">{message_text if message_text else 'N/A'}</td></tr>
                </table>
            </div>
        </div>
        """
        try:
            send_email(
                to_email=super_admin.email,
                subject=f"🚀 Nouvelle demande d'essai : {university_name} ({contact_name})",
                html_body=html_email
            )
        except Exception as e:
            print(f"⚠️ Erreur envoi email lead: {e}")

    return {
        "success": True,
        "message": "Votre demande a été transmise avec succès à Chakir's Entreprise (Direction Technique). Vous serez contacté très rapidement."
    }

# ==========================================
# BASCULE D'UNIVERSITÉ (Option B Enseignants Multi-Universités)
# ==========================================
@router.post("/switch-university")
def switch_university(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    target_univ_id = data.get("university_id")
    if not target_univ_id:
        raise HTTPException(status_code=400, detail="Veuillez sélectionner un établissement.")

    if current_user.role == "teacher":
        from app.models.teacher import Teacher
        aff = db.query(Teacher).filter(
            or_(Teacher.user_id == current_user.id, func.lower(Teacher.email) == current_user.email.lower()),
            Teacher.university_id == target_univ_id
        ).first()
        if not aff:
            raise HTTPException(status_code=403, detail="Vous n'êtes pas affilié à cet établissement.")

        current_user.university_id = target_univ_id
        db.commit()

        new_token = create_access_token(data={"sub": current_user.email, "role": current_user.role, "university_id": target_univ_id})
        univ = db.query(University).filter(University.id == target_univ_id).first()
        return {
            "status": "success",
            "access_token": new_token,
            "university_id": target_univ_id,
            "university_name": univ.name if univ else "",
            "message": f"Session activée pour {univ.name if univ else 'cet établissement'}"
        }
    else:
        raise HTTPException(status_code=400, detail="Action réservée aux enseignants multi-établissements.")


# ==========================================
# RÉINITIALISATION MOT DE PASSE PAR CODE OTP
# ==========================================
@router.post("/forgot-password/request-otp")
def request_password_reset_otp(
    data: dict,
    request: Request,
    db: Session = Depends(get_db)
):
    raw_ident = (data.get("identifier") or data.get("email") or "").strip()
    if not raw_ident:
        raise HTTPException(status_code=400, detail="Veuillez saisir votre adresse email ou votre matricule.")

    # Trouver l'utilisateur
    user = db.query(User).filter(User.email.ilike(raw_ident)).first()
    if not user:
        from app.models.student import Student
        stu = db.query(Student).filter(Student.matricule.ilike(raw_ident)).first()
        if stu and stu.user_id:
            user = db.query(User).filter(User.id == stu.user_id).first()
    if not user:
        user = db.query(User).filter(User.phone == raw_ident).first()

    if not user:
        raise HTTPException(status_code=404, detail="Aucun compte associé à cet identifiant n'a été trouvé.")

    if not user.email or "@" not in user.email:
        raise HTTPException(status_code=400, detail="Ce compte ne dispose pas d'une adresse email valide pour recevoir le code OTP.")

    from app.models.password_reset_otp import PasswordResetOTP
    from datetime import datetime, timezone, timedelta
    import random, hashlib

    # Invalider les anciens codes non utilisés
    db.query(PasswordResetOTP).filter(
        PasswordResetOTP.user_id == user.id,
        PasswordResetOTP.is_used == False
    ).update({"is_used": True})

    # Générer le code OTP 6 chiffres
    otp_code = f"{random.randint(100000, 999999)}"
    salt = f"{user.id}_{user.email}"
    otp_hash = hashlib.sha256(f"{otp_code}_{salt}".encode()).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

    otp_record = PasswordResetOTP(
        identifier=user.email,
        otp_code_hash=otp_hash,
        user_id=user.id,
        expires_at=expires_at,
        attempts=0,
        is_used=False,
        channel="email"
    )
    db.add(otp_record)
    db.commit()

    # Envoi email
    from app.utils.email_service import send_otp_email, is_email_configured
    parts = user.email.split("@")
    masked_email = parts[0][0] + "••••" + ("@" + parts[1] if len(parts) > 1 else "")

    if not is_email_configured():
        return {
            "status": "warning",
            "message": f"Service SMTP non configuré dans .env. Code de sécurité pour test : {otp_code}",
            "channel": "email",
            "target_masked": masked_email,
            "identifier": user.email,
            "dev_otp": otp_code,
            "smtp_configured": False
        }

    sent = send_otp_email(user.email, user.full_name, otp_code)
    if not sent:
        return {
            "status": "warning",
            "message": f"Échec d'envoi SMTP (vérifiez vos identifiants SMTP). Code de secours : {otp_code}",
            "channel": "email",
            "target_masked": masked_email,
            "identifier": user.email,
            "dev_otp": otp_code,
            "smtp_configured": True
        }

    return {
        "status": "success",
        "message": f"Code de sécurité envoyé avec succès à {masked_email}",
        "channel": "email",
        "target_masked": masked_email,
        "identifier": user.email,
        "dev_otp": None,
        "smtp_configured": True
    }


@router.post("/forgot-password/verify-otp")
def verify_password_reset_otp(
    data: dict,
    db: Session = Depends(get_db)
):
    identifier = (data.get("identifier") or "").strip()
    otp_code = str(data.get("otp_code") or "").strip()
    new_password = str(data.get("new_password") or "").strip()

    if not identifier or not otp_code or not new_password:
        raise HTTPException(status_code=400, detail="Tous les champs sont obligatoires (identifiant, code OTP et nouveau mot de passe).")

    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Le nouveau mot de passe doit comporter au moins 6 caractères.")

    user = db.query(User).filter(User.email.ilike(identifier)).first()
    if not user:
        user = db.query(User).filter(User.phone == identifier).first()

    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

    from app.models.password_reset_otp import PasswordResetOTP
    from datetime import datetime, timezone
    import hashlib

    otp_record = db.query(PasswordResetOTP).filter(
        PasswordResetOTP.user_id == user.id,
        PasswordResetOTP.is_used == False
    ).order_by(PasswordResetOTP.id.desc()).first()

    if not otp_record:
        raise HTTPException(status_code=400, detail="Aucun code de réinitialisation actif. Veuillez faire une nouvelle demande.")

    now = datetime.now(timezone.utc)
    exp = otp_record.expires_at
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)

    if now > exp:
        otp_record.is_used = True
        db.commit()
        raise HTTPException(status_code=400, detail="Le code de sécurité a expiré (validité 10 min). Veuillez en demander un nouveau.")

    if otp_record.attempts >= 5:
        otp_record.is_used = True
        db.commit()
        raise HTTPException(status_code=400, detail="Trop de tentatives erronées. Pour votre sécurité, demandez un nouveau code.")

    salt = f"{user.id}_{user.email}"
    expected_hash = hashlib.sha256(f"{otp_code}_{salt}".encode()).hexdigest()

    if otp_record.otp_code_hash != expected_hash:
        otp_record.attempts += 1
        db.commit()
        remaining = 5 - otp_record.attempts
        raise HTTPException(status_code=400, detail=f"Code de sécurité incorrect. Il vous reste {remaining} tentative(s).")

    # Code validé avec succès
    otp_record.is_used = True
    user.hashed_password = hash_password(new_password)
    user.is_email_verified = True
    db.commit()

    token = create_access_token(data={"sub": user.email, "role": user.role})

    return {
        "status": "success",
        "message": "Mot de passe réinitialisé avec succès !",
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
# DEMANDE DE RÉINITIALISATION PAR MATRICULE (Étudiant -> Secrétaire/Admin)
# ==========================================
@router.post("/forgot-password/by-matricule")
def request_password_reset_by_matricule(
    data: dict,
    db: Session = Depends(get_db)
):
    """
    Permet à un étudiant de demander la réinitialisation de son mot de passe
    en renseignant uniquement son matricule institutionnel.
    Alerte immédiatement le secrétariat et l'administration de son université.
    """
    from app.models.student import Student
    from app.models.notification import Notification

    raw_matricule = (data.get("matricule") or "").strip()
    if not raw_matricule:
        raise HTTPException(status_code=400, detail="Veuillez saisir votre matricule.")

    student = db.query(Student).filter(
        func.lower(Student.matricule) == raw_matricule.lower()
    ).first()

    if not student:
        raise HTTPException(
            status_code=404,
            detail=f"Aucun dossier étudiant trouvé pour le matricule « {raw_matricule} ». Vérifiez la saisie ou contactez le secrétariat."
        )

    univ = db.query(University).filter(University.id == student.university_id).first()
    univ_name = univ.name if univ else (student.university_name or "Votre université")

    # Créer la notification pour l'administration et le secrétariat
    notif = Notification(
        title="Demande réinitialisation mot de passe",
        message=f"L'étudiant {student.first_name} {student.last_name} (Matricule: {student.matricule}, Filière: {student.filiere or 'N/A'}) demande la réinitialisation de son mot de passe.",
        notification_type="password_reset_request",
        type="warning",
        target_roles=["admin", "secretary"],
        university_id=student.university_id,
        is_read=False
    )
    db.add(notif)
    db.commit()

    return {
        "status": "success",
        "message": f"Votre demande a bien été transmise à l'administration de {univ_name}.",
        "student_name": f"{student.first_name} {student.last_name}",
        "matricule": student.matricule,
        "university_name": univ_name
    }
