from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database.connection import SessionLocal
from app.models.user import User
from app.core.dependencies import require_role
from pydantic import BaseModel, EmailStr
from typing import Optional
from app.core.security import hash_password
from app.utils.email_service import send_credentials_email, send_password_reset_email
from app.utils.email_validator import validate_email_exists

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

    is_valid, error_msg = validate_email_exists(staff_data.email)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)
    
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

    # ✅ AJOUTÉ : envoi des identifiants directement par email au nouveau membre du personnel
    send_credentials_email(
        to_email=new_staff.email,
        full_name=new_staff.full_name,
        password=staff_data.password,
        role=new_staff.role,
        university_name=current_user.university.name if current_user.university else ""
    )

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
        # ✅ AJOUTÉ : le nouveau mot de passe est envoyé directement par email
        send_password_reset_email(
            to_email=staff.email,
            full_name=staff.full_name,
            new_password=staff_data.password
        )
        
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

# ✅ SUPPRIMER UN MEMBRE PROPREMENT AVEC DÉLIAGE DES CLÉS ÉTRANGÈRES
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
    
    staff_name = staff.full_name or staff.email
    uid = staff.id

    try:
        # 1. Nettoyage Enseignant si rattaché
        try:
            from app.models.teacher import Teacher
            from app.models.course import Course
            from app.models.material import Material
            from app.models.schedule import Schedule
            from app.models.attendance import Attendance
            from app.models.class_room import ClassRoom
            from app.models.exam_schedule import ExamSchedule

            teachers = db.query(Teacher).filter(Teacher.user_id == uid).all()
            for t in teachers:
                db.query(Course).filter(Course.teacher_id == t.id).update({Course.teacher_id: None}, synchronize_session=False)
                db.query(Material).filter(Material.teacher_id == t.id).delete(synchronize_session=False)
                db.query(Schedule).filter(Schedule.teacher_id == t.id).update({Schedule.teacher_id: None}, synchronize_session=False)
                db.query(Attendance).filter(Attendance.teacher_id == t.id).update({Attendance.teacher_id: None}, synchronize_session=False)
                db.query(ClassRoom).filter(ClassRoom.main_teacher_id == t.id).update({ClassRoom.main_teacher_id: None}, synchronize_session=False)
                db.query(ExamSchedule).filter(ExamSchedule.supervisor_id == t.id).update({ExamSchedule.supervisor_id: None}, synchronize_session=False)
                db.delete(t)
        except Exception:
            pass

        # 2. Nettoyage Censeur si rattaché
        try:
            from app.models.censor import Censor
            db.query(Censor).filter(Censor.user_id == uid).delete(synchronize_session=False)
        except Exception:
            pass

        # 3. Messages & Notifications
        try:
            from app.models.message import Message
            db.query(Message).filter((Message.sender_id == uid) | (Message.recipient_id == uid)).update({Message.parent_id: None}, synchronize_session=False)
            db.query(Message).filter((Message.sender_id == uid) | (Message.recipient_id == uid)).delete(synchronize_session=False)
        except Exception:
            pass

        try:
            from app.models.notification import Notification
            db.query(Notification).filter((Notification.recipient_id == uid) | (Notification.created_by == uid)).delete(synchronize_session=False)
        except Exception:
            pass

        # 4. OTP et réinitialisations de mot de passe
        try:
            from app.models.password_reset_otp import PasswordResetOTP
            db.query(PasswordResetOTP).filter(PasswordResetOTP.user_id == uid).delete(synchronize_session=False)
        except Exception:
            pass

        try:
            from app.models.password_reset_request import PasswordResetRequest
            db.query(PasswordResetRequest).filter((PasswordResetRequest.user_id == uid) | (PasswordResetRequest.handled_by == uid)).delete(synchronize_session=False)
        except Exception:
            pass

        # 5. Logs d'audit & Notes
        try:
            from app.models.audit_log import AuditLog
            db.query(AuditLog).filter(AuditLog.user_id == uid).update({AuditLog.user_id: None}, synchronize_session=False)
        except Exception:
            pass

        try:
            from app.models.grade import Grade
            db.query(Grade).filter(Grade.graded_by == uid).update({Grade.graded_by: None}, synchronize_session=False)
            db.query(Grade).filter(Grade.validated_by == uid).update({Grade.validated_by: None}, synchronize_session=False)
            db.query(Grade).filter(Grade.rejected_by == uid).update({Grade.rejected_by: None}, synchronize_session=False)
        except Exception:
            pass

        # 6. Scans de présence & Sessions de scan
        try:
            from app.models.attendance import Attendance
            db.query(Attendance).filter(Attendance.scanned_by == uid).update({Attendance.scanned_by: None}, synchronize_session=False)
        except Exception:
            pass

        try:
            from app.models.scan_session import ScanSession
            db.query(ScanSession).filter(ScanSession.created_by == uid).update({ScanSession.created_by: current_user.id}, synchronize_session=False)
        except Exception:
            pass

        # 7. Comptabilité & Paie
        try:
            from app.models.accounting import PayrollEntry, Expense, BankAccount
            db.query(PayrollEntry).filter(PayrollEntry.user_id == uid).delete(synchronize_session=False)
            db.query(Expense).filter(Expense.created_by == uid).update({Expense.created_by: None}, synchronize_session=False)
            db.query(BankAccount).filter(BankAccount.created_by == uid).update({BankAccount.created_by: None}, synchronize_session=False)
        except Exception:
            pass

        # 8. Paiements & Rappels
        try:
            from app.models.payment import Payment
            from app.models.payment_reminder import PaymentReminder
            db.query(Payment).filter(Payment.created_by == uid).update({Payment.created_by: None}, synchronize_session=False)
            db.query(Payment).filter(Payment.paid_by == uid).update({Payment.paid_by: None}, synchronize_session=False)
            db.query(PaymentReminder).filter(PaymentReminder.sent_by_user_id == uid).update({PaymentReminder.sent_by_user_id: None}, synchronize_session=False)
        except Exception:
            pass

        # 9. Écritures de grand livre
        try:
            from app.models.ledger import JournalEntry, FiscalYear, BankReconciliation
            db.query(JournalEntry).filter(JournalEntry.created_by == uid).update({JournalEntry.created_by: None}, synchronize_session=False)
            db.query(FiscalYear).filter(FiscalYear.closed_by == uid).update({FiscalYear.closed_by: None}, synchronize_session=False)
            db.query(BankReconciliation).filter(BankReconciliation.created_by == uid).update({BankReconciliation.created_by: None}, synchronize_session=False)
        except Exception:
            pass

        # 10. Incidents & Annonces & Documents
        try:
            from app.models.incident import Incident
            db.query(Incident).filter(Incident.reported_by == uid).update({Incident.reported_by: current_user.id}, synchronize_session=False)
        except Exception:
            pass

        try:
            from app.models.announcement import Announcement
            db.query(Announcement).filter(Announcement.created_by == uid).update({Announcement.created_by: None}, synchronize_session=False)
        except Exception:
            pass

        try:
            from app.models.document import Document
            db.query(Document).filter(Document.generated_by == uid).update({Document.generated_by: None}, synchronize_session=False)
        except Exception:
            pass

        try:
            from app.models.academic_fee import AcademicFee
            db.query(AcademicFee).filter(AcademicFee.created_by == uid).update({AcademicFee.created_by: None}, synchronize_session=False)
        except Exception:
            pass

        # 11. Suppression du compte utilisateur
        db.delete(staff)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la suppression de {staff_name} : {str(e)}"
        )
    
    return {"message": f"{staff_name} supprimé avec succès"}

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