from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional

from app.database.connection import SessionLocal
from app.core.dependencies import require_role
from app.models.user import User
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.audit_log import AuditLog
from app.models.notification import Notification
from app.utils.email_service import send_email
from app.utils.email_validator import validate_email_exists

router = APIRouter(
    prefix="/admin",
    tags=["Admin"]
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class ChangeEmailRequest(BaseModel):
    identifier: str              # Matricule étudiant ou ancien email
    new_email: str               # Nouvelle adresse email réelle
    reason_message: Optional[str] = "Correction administrative d'adresse email"

@router.get("/dashboard")
def admin_dashboard(
    current_user: User = Depends(require_role("admin"))
):
    return {
        "message": "Welcome Admin"
    }

@router.post("/change-user-email")
def change_user_email(
    data: ChangeEmailRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary"))
):
    """
    Permet à l'administration ou au secrétariat de modifier l'adresse email d'un
    étudiant (via son matricule ou email) ou d'un enseignant s'il s'est trompé.
    """
    ident = data.identifier.strip()
    new_email = data.new_email.strip().lower()

    if not ident:
        raise HTTPException(status_code=400, detail="Veuillez fournir le matricule ou l'ancien email.")
    if not new_email or "@" not in new_email:
        raise HTTPException(status_code=400, detail="Veuillez fournir une nouvelle adresse email valide.")

    # 1. Vérifier la validité de l'email
    is_valid, err = validate_email_exists(new_email)
    if not is_valid:
        raise HTTPException(status_code=400, detail=f"Nouvelle adresse email invalide : {err}")

    # 2. Vérifier que le nouvel email n'est pas déjà pris
    email_taken = db.query(User).filter(User.email == new_email).first()
    if email_taken:
        raise HTTPException(status_code=400, detail=f"L'adresse '{new_email}' est déjà utilisée par un autre compte.")

    # 3. Retrouver l'utilisateur cible (Étudiant ou Enseignant)
    target_user = None
    target_student = None
    target_teacher = None

    # Recherche étudiant par matricule
    target_student = db.query(Student).filter(
        Student.matricule.ilike(ident),
        Student.university_id == current_user.university_id
    ).first()

    if target_student and target_student.user_id:
        target_user = db.query(User).filter(User.id == target_student.user_id).first()

    # Si pas trouvé par matricule, recherche par email
    if not target_user:
        target_user = db.query(User).filter(User.email.ilike(ident)).first()
        if target_user:
            if target_user.role == "student":
                target_student = db.query(Student).filter(
                    Student.user_id == target_user.id,
                    Student.university_id == current_user.university_id
                ).first()
                if not target_student:
                    raise HTTPException(status_code=403, detail="Cet étudiant n'appartient pas à votre établissement.")
            elif target_user.role == "teacher":
                target_teacher = db.query(Teacher).filter(
                    Teacher.user_id == target_user.id,
                    Teacher.university_id == current_user.university_id
                ).first()
                if not target_teacher:
                    raise HTTPException(status_code=403, detail="Cet enseignant n'est pas affilié à votre établissement.")
            else:
                # Vérifier université
                if target_user.university_id != current_user.university_id:
                    raise HTTPException(status_code=403, detail="Cet utilisateur n'appartient pas à votre établissement.")

    if not target_user:
        raise HTTPException(status_code=404, detail=f"Aucun compte trouvé avec l'identifiant '{ident}'.")

    old_email = target_user.email

    # 4. Appliquer le changement
    target_user.email = new_email
    target_user.is_email_verified = True

    if target_student:
        target_student.email = new_email

    if target_teacher:
        target_teacher.email = new_email

    # 5. Audit Log
    try:
        log = AuditLog(
            action=f"Modification email de {target_user.full_name} ({old_email} -> {new_email})",
            user_email=current_user.email,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            status="success",
            university_id=current_user.university_id
        )
        db.add(log)
    except Exception:
        pass

    db.commit()

    # 6. Notification par email au nouvel email
    try:
        send_email(
            to_email=new_email,
            subject="UniSphere AI — Mise à jour de votre adresse email",
            html_body=f"""
            <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b;">
              <div style="background: #031B63; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 20px;">UniSphere <span style="color: #FF7900;">AI</span></h1>
                <p style="color: #94a3b8; font-size: 12px; margin: 4px 0 0 0;">Administration Universitaire</p>
              </div>
              <div style="border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px; padding: 24px; background: #ffffff;">
                <p>Bonjour <strong>{target_user.full_name}</strong>,</p>
                <p>Votre adresse email de connexion a été mise à jour par l'administration de votre établissement.</p>
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
                  <p style="margin: 4px 0;"><strong>Nouvelle adresse email :</strong> {new_email}</p>
                  <p style="margin: 4px 0;"><strong>Motif :</strong> {data.reason_message}</p>
                </div>
                <p style="font-size: 13px; color: #64748b;">Vous pouvez dès à présent utiliser cette adresse pour vous connecter ou réinitialiser votre mot de passe par code OTP.</p>
              </div>
            </div>
            """
        )
    except Exception:
        pass

    return {
        "status": "success",
        "message": f"Adresse email mise à jour avec succès : {old_email} ➜ {new_email}",
        "user_id": target_user.id,
        "full_name": target_user.full_name,
        "new_email": new_email
    }
