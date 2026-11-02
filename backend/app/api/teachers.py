from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pathlib import Path
from pydantic import BaseModel
from typing import Optional
from app.database.connection import SessionLocal
from app.models.teacher import Teacher
from app.models.filiere import Filiere
from app.models.user import User
from app.core.dependencies import require_role
from app.core.security import hash_password
from app.services.image_compressor import compress_and_save_upload
from app.utils.email_service import send_credentials_email, send_password_reset_email, send_affiliation_email
from app.utils.email_validator import validate_email_format

import time
import os
import qrcode
import secrets

# ✅ PRÉFIXE AVEC "S" (CRUD enseignants)
router = APIRouter(prefix="/teachers", tags=["Teachers"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def format_teacher(teacher: Teacher) -> dict:
    f_name = None
    if teacher.filiere:
        f_name = teacher.filiere.name
    elif teacher.department:
        f_name = teacher.department
    return {
        "id": teacher.id,
        "first_name": teacher.first_name,
        "last_name": teacher.last_name,
        "email": teacher.email,
        "department": teacher.department,
        "speciality": teacher.speciality,
        "phone": teacher.phone,
        "photo": teacher.photo,
        "qr_code": teacher.qr_code,
        "user_id": teacher.user_id,
        "university_id": teacher.university_id,
        "university_name": teacher.university_name,
        "filiere_id": teacher.filiere_id,
        "filiere_name": f_name,
        "created_at": teacher.created_at.isoformat() if teacher.created_at else None,
        "updated_at": teacher.updated_at.isoformat() if teacher.updated_at else None,
    }


# ==========================================
# SCHÉMAS PYDANTIC
# ==========================================
class TeacherUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    department: Optional[str] = None
    speciality: Optional[str] = None
    phone: Optional[str] = None
    filiere_id: Optional[int] = None
    photo: Optional[str] = None
    password: Optional[str] = None


# ==========================================
# LISTE DES ENSEIGNANTS
# ==========================================
@router.get("/")
def get_teachers(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "censeur", "accountant", "teacher"))
):
    """Liste de tous les enseignants de l'université"""
    teachers = db.query(Teacher).filter(
        Teacher.university_id == current_user.university_id
    ).all()
    return [format_teacher(t) for t in teachers]


def format_teacher_detail(teacher: Teacher, db: Session) -> dict:
    """Enrichit le profil enseignant avec les cours réels, les statistiques d'évaluations et d'heures"""
    from app.models.course import Course
    from app.models.student import Student
    from app.models.grade import Grade

    base = format_teacher(teacher)
    
    courses = db.query(Course).filter(
        Course.teacher_id == teacher.id,
        Course.university_id == teacher.university_id
    ).all()
    
    courses_list = []
    course_ids = []
    total_hours = 0
    student_ids_set = set()
    
    for c in courses:
        course_ids.append(c.id)
        f_name = c.filiere.name if getattr(c, 'filiere', None) else (getattr(c, 'department', '') or '')
        c_hours = getattr(c, 'hours', 20) or 20
        total_hours += c_hours
        
        q = db.query(Student.id).filter(
            Student.level == c.level,
            Student.university_id == teacher.university_id
        )
        if f_name:
            q = q.filter(Student.filiere.ilike(f"%{f_name}%"))
        st_ids = [row[0] for row in q.all()]
        student_ids_set.update(st_ids)
        
        courses_list.append({
            "id": c.id,
            "title": c.title,
            "code": c.code,
            "level": c.level,
            "credits": c.credits or 3,
            "hours": c_hours,
            "filiere_name": f_name or "N/A",
            "students_count": len(st_ids)
        })
        
    evaluations_count = db.query(Grade).filter(Grade.course_id.in_(course_ids)).count() if course_ids else 0
    
    base.update({
        "courses": courses_list,
        "courses_count": len(courses_list),
        "students_count": len(student_ids_set),
        "total_hours": total_hours,
        "hours_count": total_hours,
        "evaluations_count": evaluations_count,
        "grades_count": evaluations_count
    })
    return base


# ==========================================
# DÉTAIL D'UN ENSEIGNANT
# ==========================================
@router.get("/{teacher_id}")
def get_teacher(
    teacher_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "censeur", "accountant", "teacher"))
):
    """Détail d'un enseignant spécifique avec ses cours et statistiques connectées"""
    teacher = db.query(Teacher).filter(
        Teacher.id == teacher_id,
        Teacher.university_id == current_user.university_id
    ).first()
    
    if not teacher:
        raise HTTPException(status_code=404, detail="Enseignant non trouvé")
    
    return format_teacher_detail(teacher, db)


# ==========================================
# CRÉATION D'UN ENSEIGNANT (Form-Data pour photo)
# ==========================================
@router.post("/")
async def create_teacher(
    background_tasks: BackgroundTasks,
    first_name: str = Form(...),
    last_name: str = Form(...),
    email: str = Form(...),
    department: str = Form(None),
    speciality: str = Form(None),
    phone: str = Form(None),
    filiere_id: Optional[str] = Form(None),
    photo: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary"))
):
    """Créer un nouvel enseignant ou rattacher un enseignant existant (form-data pour upload photo)"""
    
    clean_email = email.strip().lower()
    clean_phone = phone.strip() if phone and phone.strip() else None

    parsed_filiere_id: Optional[int] = None
    if filiere_id is not None and str(filiere_id).strip().isdigit():
        parsed_filiere_id = int(str(filiere_id).strip())

    if parsed_filiere_id:
        filiere = db.query(Filiere).filter(
            Filiere.id == parsed_filiere_id,
            Filiere.university_id == current_user.university_id
        ).first()
        if filiere:
            department = filiere.name
        else:
            parsed_filiere_id = None
    
    if not department:
        department = "Enseignement Général"
    if not speciality:
        speciality = department

    # 1. Vérification d'unicité du téléphone
    if clean_phone:
        existing_phone_user = db.query(User).filter(User.phone == clean_phone).first()
        if existing_phone_user:
            existing_by_email = db.query(User).filter(User.email == clean_email).first()
            if not existing_by_email or existing_phone_user.id != existing_by_email.id:
                raise HTTPException(
                    status_code=400, 
                    detail="Ce numéro de téléphone est déjà associé à un autre compte utilisateur."
                )

    # Lecture sécurisée de la photo en amont (sans se fier à photo.size qui peut valoir None sous Starlette)
    photo_bytes = b""
    if photo and photo.filename:
        photo_bytes = await photo.read()
        if len(photo_bytes) > 8 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="L'image ne doit pas dépasser 8 Mo.")

    # 2. Gestion de l'existence de l'utilisateur (Option B : Rattachement multi-universités)
    existing_user = db.query(User).filter(User.email == clean_email).first()
    univ_name = current_user.university.name if current_user.university else "UniSphere AI"

    if existing_user:
        if existing_user.role != "teacher":
            raise HTTPException(
                status_code=400, 
                detail=f"Cet email est déjà associé à un compte ({existing_user.role}). Impossible de l'enregistrer comme enseignant."
            )
        
        existing_affiliation = db.query(Teacher).filter(
            Teacher.user_id == existing_user.id,
            Teacher.university_id == current_user.university_id
        ).first()
        if existing_affiliation:
            raise HTTPException(
                status_code=400, 
                detail="Cet enseignant est déjà rattaché à votre université."
            )

        new_teacher = Teacher(
            first_name=first_name,
            last_name=last_name,
            email=clean_email,
            department=department,
            speciality=speciality,
            phone=clean_phone or existing_user.phone,
            user_id=existing_user.id,
            university_id=current_user.university_id,
            university_name=univ_name,
            filiere_id=parsed_filiere_id
        )
        db.add(new_teacher)
        db.flush()

        os.makedirs("qr_codes", exist_ok=True)
        qr_filename = f"TEACHER_{new_teacher.id}.png"
        qr_path = os.path.join("qr_codes", qr_filename)
        qr = qrcode.make(f"TEACHER-{new_teacher.id}")
        qr.save(qr_path)
        new_teacher.qr_code = qr_filename

        if photo_bytes:
            os.makedirs("uploads", exist_ok=True)
            ext = Path(photo.filename).suffix.lower() or ".jpg"
            if ext not in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
                ext = ".jpg"
            target_path = Path("uploads") / f"TEACHER_{new_teacher.id}_{int(time.time())}{ext}"
            saved_p = compress_and_save_upload(photo_bytes, target_path, max_dimension=1200, quality=82)
            new_teacher.photo = saved_p.name
            existing_user.photo = saved_p.name

        db.commit()
        db.refresh(new_teacher)

        background_tasks.add_task(
            send_affiliation_email,
            to_email=clean_email,
            full_name=f"{first_name} {last_name}",
            university_name=univ_name
        )

        return {
            "teacher": format_teacher(new_teacher),
            "temp_password": None,
            "message": f"L'enseignant {first_name} {last_name} a été rattaché avec succès à votre établissement."
        }

    # 3. Nouvel utilisateur enseignant (transaction atomique User + Teacher)
    is_valid, error_msg = validate_email_format(clean_email)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)

    temp_password = secrets.token_urlsafe(8)

    try:
        new_user = User(
            full_name=f"{first_name} {last_name}",
            email=clean_email,
            phone=clean_phone,
            hashed_password=hash_password(temp_password),
            role="teacher",
            university_id=current_user.university_id
        )
        db.add(new_user)
        db.flush()

        new_teacher = Teacher(
            first_name=first_name,
            last_name=last_name,
            email=clean_email,
            department=department,
            speciality=speciality,
            phone=clean_phone,
            user_id=new_user.id,
            university_id=current_user.university_id,
            university_name=univ_name,
            filiere_id=parsed_filiere_id
        )
        db.add(new_teacher)
        db.flush()

        os.makedirs("qr_codes", exist_ok=True)
        qr_filename = f"TEACHER_{new_teacher.id}.png"
        qr_path = os.path.join("qr_codes", qr_filename)
        qr = qrcode.make(f"TEACHER-{new_teacher.id}")
        qr.save(qr_path)
        new_teacher.qr_code = qr_filename

        if photo_bytes:
            os.makedirs("uploads", exist_ok=True)
            ext = Path(photo.filename).suffix.lower() or ".jpg"
            if ext not in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
                ext = ".jpg"
            target_path = Path("uploads") / f"TEACHER_{new_teacher.id}_{int(time.time())}{ext}"
            saved_p = compress_and_save_upload(photo_bytes, target_path, max_dimension=1200, quality=82)
            new_teacher.photo = saved_p.name
            new_user.photo = saved_p.name

        db.commit()
        db.refresh(new_teacher)
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur lors de la création de l'enseignant : {str(e)}")

    background_tasks.add_task(
        send_credentials_email,
        to_email=clean_email,
        full_name=f"{first_name} {last_name}",
        password=temp_password,
        role="teacher",
        university_name=univ_name
    )

    return {
        "teacher": format_teacher(new_teacher),
        "temp_password": temp_password,
        "message": "Enseignant créé avec succès"
    }


# ==========================================
# MODIFICATION D'UN ENSEIGNANT (JSON)
# ==========================================
@router.put("/{teacher_id}")
def update_teacher(
    teacher_id: int,
    teacher_data: TeacherUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary"))
):
    """Modifier un enseignant (accepte JSON)"""
    
    existing_teacher = db.query(Teacher).filter(
        Teacher.id == teacher_id,
        Teacher.university_id == current_user.university_id
    ).first()

    if not existing_teacher:
        raise HTTPException(status_code=404, detail="Enseignant non trouvé")

    user = db.query(User).filter(User.id == existing_teacher.user_id).first()

    # Téléphone unique
    if teacher_data.phone is not None:
        clean_phone = teacher_data.phone.strip() if teacher_data.phone.strip() else None
        if clean_phone:
            existing_phone_user = db.query(User).filter(
                User.phone == clean_phone,
                User.id != existing_teacher.user_id
            ).first()
            if existing_phone_user:
                raise HTTPException(
                    status_code=400,
                    detail="Ce numéro de téléphone est déjà utilisé par un autre utilisateur."
                )
        existing_teacher.phone = clean_phone
        if user:
            user.phone = clean_phone

    # Email
    if teacher_data.email is not None:
        clean_email = teacher_data.email.strip().lower()
        if clean_email != existing_teacher.email:
            existing_user = db.query(User).filter(
                User.email == clean_email,
                User.id != existing_teacher.user_id
            ).first()
            if existing_user:
                raise HTTPException(status_code=400, detail="Cet email est déjà utilisé par un autre compte.")
            
            # Vérifier que l'email n'est pas déjà utilisé dans la même université
            other_teacher = db.query(Teacher).filter(
                Teacher.email == clean_email,
                Teacher.university_id == current_user.university_id,
                Teacher.id != existing_teacher.id
            ).first()
            if other_teacher:
                raise HTTPException(status_code=400, detail="Un enseignant avec cet email existe déjà dans cette université.")

            existing_teacher.email = clean_email
            if user:
                user.email = clean_email

    if teacher_data.filiere_id:
        filiere = db.query(Filiere).filter(
            Filiere.id == teacher_data.filiere_id,
            Filiere.university_id == current_user.university_id
        ).first()
        if filiere:
            teacher_data.department = filiere.name

    # Mettre à jour les autres champs
    if teacher_data.first_name is not None:
        existing_teacher.first_name = teacher_data.first_name
    if teacher_data.last_name is not None:
        existing_teacher.last_name = teacher_data.last_name
    if teacher_data.department is not None:
        existing_teacher.department = teacher_data.department
    if teacher_data.speciality is not None:
        existing_teacher.speciality = teacher_data.speciality
    if teacher_data.filiere_id is not None:
        existing_teacher.filiere_id = teacher_data.filiere_id
    if teacher_data.photo is not None:
        existing_teacher.photo = teacher_data.photo

    # Mettre à jour l'utilisateur associé
    if user:
        if teacher_data.first_name or teacher_data.last_name:
            user.full_name = f"{existing_teacher.first_name} {existing_teacher.last_name}"
        
        if teacher_data.password:
            if len(teacher_data.password) < 6:
                raise HTTPException(
                    status_code=400, 
                    detail="Le mot de passe doit contenir au moins 6 caractères"
                )
            user.hashed_password = hash_password(teacher_data.password)

    db.commit()
    db.refresh(existing_teacher)
    
    return {
        "teacher": format_teacher(existing_teacher),
        "message": "Enseignant modifié avec succès"
    }


# ==========================================
# UPLOAD PHOTO D'UN ENSEIGNANT
# ==========================================
@router.post("/upload-photo/{teacher_id}")
async def upload_teacher_photo(
    teacher_id: int,
    photo: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary"))
):
    """Upload une photo pour un enseignant"""
    
    # Vérifier que l'enseignant existe
    teacher = db.query(Teacher).filter(
        Teacher.id == teacher_id,
        Teacher.university_id == current_user.university_id
    ).first()
    
    if not teacher:
        raise HTTPException(status_code=404, detail="Enseignant non trouvé")
    
    # Vérifier que c'est bien une image (tolérant si content_type est None sur mobile)
    ctype = (photo.content_type or "").lower()
    ext_check = Path(photo.filename or "").suffix.lower()
    if not ctype.startswith("image/") and ext_check not in (".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".heif"):
        raise HTTPException(status_code=400, detail="Le fichier doit être une image (JPG, PNG, WebP)")
    
    # Vérifier la taille (max 8 Mo)
    content = await photo.read()
    if not content:
        raise HTTPException(status_code=400, detail="Le fichier image envoyé est vide")
    if len(content) > 8 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="L'image ne doit pas dépasser 8 Mo")
    
    # Supprimer l'ancienne photo si elle existe
    if teacher.photo:
        old_photo_path = os.path.join("uploads", os.path.basename(teacher.photo))
        if os.path.exists(old_photo_path):
            try:
                os.remove(old_photo_path)
            except Exception as e:
                print(f"Erreur suppression ancienne photo: {e}")
    
    # Sauvegarder la nouvelle photo
    os.makedirs("uploads", exist_ok=True)
    ext = ext_check if ext_check in (".jpg", ".jpeg", ".png", ".webp", ".gif") else ".jpg"
    target_path = Path("uploads") / f"TEACHER_{teacher_id}_{int(time.time())}{ext}"
    saved_p = compress_and_save_upload(content, target_path, max_dimension=1200, quality=82)
    photo_filename = saved_p.name
    
    # Mettre à jour la base de données (Teacher + User synchronisés)
    teacher.photo = photo_filename
    if teacher.user_id:
        u_obj = db.query(User).filter(User.id == teacher.user_id).first()
        if u_obj:
            u_obj.photo = photo_filename
    db.commit()
    db.refresh(teacher)
    
    return {
        "message": "Photo uploadée avec succès",
        "photo_url": f"/uploads/{photo_filename}",
        "photo_filename": photo_filename
    }


# ==========================================
# SUPPRESSION D'UN ENSEIGNANT
# ==========================================
@router.delete("/{teacher_id}")
def delete_teacher(
    teacher_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary"))
):
    """Supprimer un enseignant proprement avec nettoyage des clés étrangères"""
    teacher = db.query(Teacher).filter(
        Teacher.id == teacher_id,
        Teacher.university_id == current_user.university_id
    ).first()
    
    if not teacher:
        raise HTTPException(status_code=404, detail="Enseignant non trouvé")
    
    if teacher.qr_code:
        qr_path = os.path.join("qr_codes", os.path.basename(teacher.qr_code))
        if os.path.exists(qr_path):
            try:
                os.remove(qr_path)
            except Exception:
                pass
    
    if teacher.photo:
        photo_path = os.path.join("uploads", os.path.basename(teacher.photo))
        if os.path.exists(photo_path):
            try:
                os.remove(photo_path)
            except Exception:
                pass
            
    user_id = teacher.user_id

    try:
        from app.models.course import Course
        from app.models.material import Material
        from app.models.schedule import Schedule
        from app.models.attendance import Attendance
        from app.models.class_room import ClassRoom
        from app.models.exam_schedule import ExamSchedule

        db.query(Course).filter(Course.teacher_id == teacher.id).update({Course.teacher_id: None}, synchronize_session=False)
        db.query(Material).filter(Material.teacher_id == teacher.id).delete(synchronize_session=False)
        db.query(Schedule).filter(Schedule.teacher_id == teacher.id).update({Schedule.teacher_id: None}, synchronize_session=False)
        db.query(Attendance).filter(Attendance.teacher_id == teacher.id).update({Attendance.teacher_id: None}, synchronize_session=False)
        db.query(ClassRoom).filter(ClassRoom.main_teacher_id == teacher.id).update({ClassRoom.main_teacher_id: None}, synchronize_session=False)
        db.query(ExamSchedule).filter(ExamSchedule.supervisor_id == teacher.id).update({ExamSchedule.supervisor_id: None}, synchronize_session=False)

        db.delete(teacher)
        db.flush()

        # Supprimer le User uniquement s'il n'est affilié à aucune autre université
        if user_id:
            other_affiliations = db.query(Teacher).filter(Teacher.user_id == user_id).count()
            if other_affiliations == 0:
                from app.models.message import Message
                from app.models.notification import Notification
                from app.models.audit_log import AuditLog
                from app.models.grade import Grade
                from app.models.password_reset_otp import PasswordResetOTP
                from app.models.password_reset_request import PasswordResetRequest

                db.query(Message).filter((Message.sender_id == user_id) | (Message.recipient_id == user_id)).update({Message.parent_id: None}, synchronize_session=False)
                db.query(Message).filter((Message.sender_id == user_id) | (Message.recipient_id == user_id)).delete(synchronize_session=False)
                db.query(Notification).filter((Notification.recipient_id == user_id) | (Notification.created_by == user_id)).delete(synchronize_session=False)
                db.query(PasswordResetOTP).filter(PasswordResetOTP.user_id == user_id).delete(synchronize_session=False)
                db.query(PasswordResetRequest).filter((PasswordResetRequest.user_id == user_id) | (PasswordResetRequest.handled_by == user_id)).delete(synchronize_session=False)
                db.query(AuditLog).filter(AuditLog.user_id == user_id).update({AuditLog.user_id: None}, synchronize_session=False)
                db.query(Grade).filter(Grade.graded_by == user_id).update({Grade.graded_by: None}, synchronize_session=False)
                db.query(Grade).filter(Grade.validated_by == user_id).update({Grade.validated_by: None}, synchronize_session=False)
                db.query(Grade).filter(Grade.rejected_by == user_id).update({Grade.rejected_by: None}, synchronize_session=False)

                user = db.query(User).filter(User.id == user_id).first()
                if user:
                    db.delete(user)

        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur lors de la suppression de l'enseignant : {str(e)}")
        
    return {"message": "Enseignant supprimé avec succès"}


# ==========================================
# RÉINITIALISER LE MOT DE PASSE
# ==========================================
@router.post("/{teacher_id}/reset-password")
def reset_teacher_password(
    teacher_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary"))
):
    """Réinitialiser le mot de passe"""
    teacher = db.query(Teacher).filter(
        Teacher.id == teacher_id,
        Teacher.university_id == current_user.university_id
    ).first()
    
    if not teacher:
        raise HTTPException(status_code=404, detail="Enseignant non trouvé")
    
    temp_password = secrets.token_urlsafe(8)
    
    user = db.query(User).filter(User.id == teacher.user_id).first()
    if user:
        user.hashed_password = hash_password(temp_password)
        db.commit()

        # ✅ AJOUTÉ : le nouveau mot de passe est envoyé directement par email à l'enseignant
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


# ==========================================
# METTRE À JOUR LE MOT DE PASSE (Personnalisé)
# ==========================================
@router.put("/{teacher_id}/password")
def update_teacher_password(
    teacher_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Mettre à jour le mot de passe"""
    teacher = db.query(Teacher).filter(
        Teacher.id == teacher_id,
        Teacher.university_id == current_user.university_id
    ).first()
    
    if not teacher:
        raise HTTPException(status_code=404, detail="Enseignant non trouvé")
    
    new_password = payload.get("password")
    if not new_password:
        raise HTTPException(status_code=400, detail="Le mot de passe est requis")
    
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Le mot de passe doit contenir au moins 6 caractères")
    
    user = db.query(User).filter(User.id == teacher.user_id).first()
    if user:
        user.hashed_password = hash_password(new_password)
        db.commit()
        return {"message": "Mot de passe mis à jour avec succès"}
    
    raise HTTPException(status_code=404, detail="Utilisateur associé non trouvé")


# ==========================================
# QR CODE DE L'ENSEIGNANT (Génération et Affichage)
# ==========================================
@router.get("/{teacher_id}/qr-code")
@router.get("/{teacher_id}/qrcode")
def get_teacher_qr_code(
    teacher_id: int,
    db: Session = Depends(get_db)
):
    """Génère et retourne l'image PNG du QR code d'un enseignant"""
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Enseignant non trouvé")
    
    os.makedirs("qr_codes", exist_ok=True)
    qr_filename = teacher.qr_code or f"TEACHER_{teacher.id}.png"
    qr_filename = os.path.basename(qr_filename)
    qr_path = os.path.join("qr_codes", qr_filename)
    
    if os.path.exists(qr_path) and os.path.getsize(qr_path) > 0:
        return FileResponse(qr_path, media_type="image/png", filename=f"QR_TEACHER_{teacher.id}.png")
    
    # Génération du QR code s'il n'existe pas encore sur le disque
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=2,
    )
    qr.add_data(f"TEACHER-{teacher.id}")
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    img.save(qr_path)
    
    if teacher.qr_code != qr_filename:
        teacher.qr_code = qr_filename
        db.commit()
        
    return FileResponse(qr_path, media_type="image/png", filename=f"QR_TEACHER_{teacher.id}.png")