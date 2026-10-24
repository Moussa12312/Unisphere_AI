from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.database.connection import SessionLocal
from app.models.teacher import Teacher
from app.models.filiere import Filiere
from app.models.user import User
from app.core.dependencies import require_role
from app.core.security import hash_password
from app.utils.email_service import send_credentials_email, send_password_reset_email
from app.utils.email_validator import validate_email_exists

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
    first_name: str = Form(...),
    last_name: str = Form(...),
    email: str = Form(...),
    department: str = Form(None),
    speciality: str = Form(None),
    phone: str = Form(None),
    filiere_id: int = Form(None),
    photo: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary"))
):
    """Créer un nouvel enseignant (form-data pour upload photo)"""
    
    if filiere_id:
        filiere = db.query(Filiere).filter(
            Filiere.id == filiere_id,
            Filiere.university_id == current_user.university_id
        ).first()
        if filiere:
            department = filiere.name
    
    if not department:
        department = "Enseignement Général"
    if not speciality:
        speciality = department
    
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")

    is_valid, error_msg = validate_email_exists(email)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)

    temp_password = secrets.token_urlsafe(8)

    new_user = User(
        full_name=f"{first_name} {last_name}",
        email=email,
        hashed_password=hash_password(temp_password),
        role="teacher",
        university_id=current_user.university_id
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    new_teacher = Teacher(
        first_name=first_name,
        last_name=last_name,
        email=email,
        department=department,
        speciality=speciality,
        phone=phone,
        user_id=new_user.id,
        university_id=current_user.university_id,
        university_name=current_user.university.name if current_user.university else "UniSphere AI",
        filiere_id=filiere_id
    )
    db.add(new_teacher)
    db.commit()
    db.refresh(new_teacher)

    os.makedirs("qr_codes", exist_ok=True)
    qr_filename = f"TEACHER_{new_teacher.id}.png"
    qr_path = os.path.join("qr_codes", qr_filename)
    qr = qrcode.make(f"TEACHER-{new_teacher.id}")
    qr.save(qr_path)
    new_teacher.qr_code = qr_filename

    if photo and photo.filename and photo.size > 0:
        os.makedirs("uploads", exist_ok=True)
        photo_filename = f"TEACHER_{new_teacher.id}_{int(time.time())}.png"
        photo_path = os.path.join("uploads", photo_filename)
        
        content = await photo.read()
        with open(photo_path, "wb") as buffer:
            buffer.write(content)
        
        new_teacher.photo = photo_filename

    db.commit()
    db.refresh(new_teacher)

    # ✅ AJOUTÉ : envoi des identifiants directement par email à l'enseignant
    send_credentials_email(
        to_email=email,
        full_name=f"{first_name} {last_name}",
        password=temp_password,
        role="teacher",
        university_name=current_user.university.name if current_user.university else ""
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

    if teacher_data.email and teacher_data.email != existing_teacher.email:
        existing_user = db.query(User).filter(User.email == teacher_data.email).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")

    if teacher_data.filiere_id:
        filiere = db.query(Filiere).filter(
            Filiere.id == teacher_data.filiere_id,
            Filiere.university_id == current_user.university_id
        ).first()
        if filiere:
            teacher_data.department = filiere.name

    # Mettre à jour les champs fournis
    if teacher_data.first_name is not None:
        existing_teacher.first_name = teacher_data.first_name
    if teacher_data.last_name is not None:
        existing_teacher.last_name = teacher_data.last_name
    if teacher_data.email is not None:
        existing_teacher.email = teacher_data.email
    if teacher_data.department is not None:
        existing_teacher.department = teacher_data.department
    if teacher_data.speciality is not None:
        existing_teacher.speciality = teacher_data.speciality
    if teacher_data.phone is not None:
        existing_teacher.phone = teacher_data.phone
    if teacher_data.filiere_id is not None:
        existing_teacher.filiere_id = teacher_data.filiere_id
    if teacher_data.photo is not None:
        existing_teacher.photo = teacher_data.photo

    # Mettre à jour l'utilisateur associé
    user = db.query(User).filter(User.id == existing_teacher.user_id).first()
    if user:
        if teacher_data.first_name or teacher_data.last_name:
            user.full_name = f"{existing_teacher.first_name} {existing_teacher.last_name}"
        if teacher_data.email:
            user.email = teacher_data.email
        
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
    
    # Vérifier que c'est bien une image
    if not photo.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="Le fichier doit être une image")
    
    # Vérifier la taille (max 5 Mo)
    content = await photo.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="L'image ne doit pas dépasser 5 Mo")
    
    # Supprimer l'ancienne photo si elle existe
    if teacher.photo:
        old_photo_path = os.path.join("uploads", teacher.photo)
        if os.path.exists(old_photo_path):
            try:
                os.remove(old_photo_path)
            except Exception as e:
                print(f"Erreur suppression ancienne photo: {e}")
    
    # Sauvegarder la nouvelle photo
    os.makedirs("uploads", exist_ok=True)
    
    # Générer un nom unique
    ext = os.path.splitext(photo.filename)[1] if photo.filename else ".png"
    photo_filename = f"TEACHER_{teacher_id}_{int(time.time())}{ext}"
    photo_path = os.path.join("uploads", photo_filename)
    
    with open(photo_path, "wb") as buffer:
        buffer.write(content)
    
    # Mettre à jour la base de données
    teacher.photo = photo_filename
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
    """Supprimer un enseignant"""
    teacher = db.query(Teacher).filter(
        Teacher.id == teacher_id,
        Teacher.university_id == current_user.university_id
    ).first()
    
    if not teacher:
        raise HTTPException(status_code=404, detail="Enseignant non trouvé")
    
    if teacher.qr_code:
        qr_path = os.path.join("qr_codes", teacher.qr_code)
        if os.path.exists(qr_path):
            os.remove(qr_path)
    
    if teacher.photo:
        photo_path = os.path.join("uploads", teacher.photo)
        if os.path.exists(photo_path):
            os.remove(photo_path)
            
    user_id = teacher.user_id
    db.delete(teacher)
    db.commit()
    
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        db.delete(user)
        db.commit()
        
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