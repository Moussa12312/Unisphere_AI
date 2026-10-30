from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime, timezone
from typing import Optional, List
from pydantic import BaseModel

from app.database.connection import SessionLocal
from app.models.user import User
from app.models.notification import Notification
from app.models.password_reset_request import PasswordResetRequest
from app.core.security import hash_password
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/password-reset", tags=["Password Reset Requests"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class PasswordResetSubmit(BaseModel):
    email: str
    message: Optional[str] = None


class PasswordResetResolve(BaseModel):
    new_password: str
    admin_note: Optional[str] = None


@router.post("/request")
def submit_password_reset_request(
    data: PasswordResetSubmit,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Étape 1 : L'utilisateur qui a oublié son mot de passe soumet son email et
    son message de demande à l'administration.
    Sécurité : Le mot de passe N'EST PAS modifié directement ici.
    """
    clean_email = data.email.strip().lower()
    if not clean_email:
        raise HTTPException(status_code=400, detail="Veuillez saisir votre adresse email.")

    user = db.query(User).filter(User.email == clean_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Aucun compte trouvé avec cet email.")

    user_msg = data.message.strip() if data.message else "J'ai oublié mon mot de passe, veuillez le réinitialiser s'il vous plaît."

    req = PasswordResetRequest(
        user_id=user.id,
        university_id=user.university_id,
        email=clean_email,
        user_role=user.role,
        message=user_msg,
        status="pending",
        requester_ip=request.client.host if request.client else None
    )
    db.add(req)

    # Notifier les administrateurs et secrétaires concernés
    if user.university_id:
        try:
            target_roles = ["admin"]
            if user.role in ["student", "alumni"]:
                target_roles.append("secretary")

            dest_users = db.query(User).filter(
                User.university_id == user.university_id,
                User.role.in_(target_roles),
                User.is_active == True
            ).all()

            for dest in dest_users:
                notif = Notification(
                    title="Demande de réinitialisation de mot de passe",
                    message=f"L'utilisateur {user.full_name} ({user.role} - {user.email}) demande la réinitialisation de son mot de passe. Message : \"{user_msg}\"",
                    type="warning",
                    notification_type="security",
                    recipient_id=dest.id,
                    university_id=user.university_id
                )
                db.add(notif)
        except Exception as e:
            print(f"[WARNING] Erreur notification admin: {e}")

    db.commit()
    db.refresh(req)

    return {
        "message": "Votre demande a été transmise avec succès à l'administration de votre établissement. Un responsable validera et réinitialisera votre accès sous peu.",
        "request_id": req.id
    }


@router.get("/requests")
def list_password_reset_requests(
    status: Optional[str] = "pending",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Étape 2 : Consultation des demandes.
    - admin : voit toutes les demandes de son université (personnel + étudiants).
    - secretary : ne peut traiter que les demandes des étudiants et alumni.
    """
    if current_user.role not in ["admin", "secretary", "super_admin"]:
        raise HTTPException(status_code=403, detail="Accès non autorisé.")

    query = db.query(PasswordResetRequest)

    if current_user.role != "super_admin" and current_user.university_id:
        query = query.filter(PasswordResetRequest.university_id == current_user.university_id)

    if current_user.role == "secretary":
        query = query.filter(PasswordResetRequest.user_role.in_(["student", "alumni"]))

    if status and status != "all":
        query = query.filter(PasswordResetRequest.status == status)

    reqs = query.order_by(desc(PasswordResetRequest.created_at)).all()

    result = []
    for r in reqs:
        target_user = db.query(User).filter(User.id == r.user_id).first()
        result.append({
            "id": r.id,
            "user_id": r.user_id,
            "full_name": target_user.full_name if target_user else "Compte supprimé",
            "email": r.email,
            "role": r.user_role,
            "message": r.message,
            "status": r.status,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "handled_at": r.handled_at.isoformat() if r.handled_at else None,
            "admin_note": r.admin_note
        })

    return result


@router.post("/requests/{request_id}/resolve")
def resolve_password_reset_request(
    request_id: int,
    data: PasswordResetResolve,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Étape 3 : L'admin ou la secrétaire applique le nouveau mot de passe.
    Règle stricte : la secrétaire NE PEUT PAS réinitialiser un compte membre du personnel !
    """
    if current_user.role not in ["admin", "secretary", "super_admin"]:
        raise HTTPException(status_code=403, detail="Accès non autorisé.")

    req = db.query(PasswordResetRequest).filter(PasswordResetRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Demande introuvable.")

    if current_user.role != "super_admin" and req.university_id != current_user.university_id:
        raise HTTPException(status_code=403, detail="Cette demande n'appartient pas à votre université.")

    if current_user.role == "secretary" and req.user_role not in ["student", "alumni"]:
        raise HTTPException(
            status_code=403,
            detail="Le secrétariat ne peut réinitialiser que les mots de passe des étudiants et des anciens élèves. Les comptes du personnel relèvent de la direction."
        )

    clean_pwd = data.new_password.strip()
    if len(clean_pwd) < 6:
        raise HTTPException(status_code=400, detail="Le nouveau mot de passe doit comporter au moins 6 caractères.")

    target_user = db.query(User).filter(User.id == req.user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Utilisateur cible introuvable.")

    target_user.hashed_password = hash_password(clean_pwd)
    target_user.is_email_verified = True

    req.status = "resolved"
    req.handled_by = current_user.id
    req.handled_at = datetime.now(timezone.utc)
    req.admin_note = data.admin_note or f"Réinitialisé par {current_user.full_name} ({current_user.role})"

    db.commit()

    return {
        "message": f"Mot de passe de {target_user.full_name} ({target_user.email}) mis à jour avec succès !",
        "status": "resolved"
    }


@router.post("/requests/{request_id}/reject")
def reject_password_reset_request(
    request_id: int,
    data: Optional[dict] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Rejeter une demande suspecte ou erronée"""
    if current_user.role not in ["admin", "secretary", "super_admin"]:
        raise HTTPException(status_code=403, detail="Accès non autorisé.")

    req = db.query(PasswordResetRequest).filter(PasswordResetRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Demande introuvable.")

    if current_user.role == "secretary" and req.user_role not in ["student", "alumni"]:
        raise HTTPException(status_code=403, detail="Action réservée à la direction.")

    req.status = "rejected"
    req.handled_by = current_user.id
    req.handled_at = datetime.now(timezone.utc)
    req.admin_note = (data or {}).get("reason") or f"Rejeté par {current_user.full_name}"

    db.commit()
    return {"message": "Demande rejetée avec succès.", "status": "rejected"}

