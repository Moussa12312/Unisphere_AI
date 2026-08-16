from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Response
from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from pathlib import Path
from datetime import datetime, date, time
import re
import os
import time as time_module  # ✅ Alias pour éviter le conflit avec datetime.time
import shutil
import secrets
import qrcode
from io import BytesIO
from typing import Optional

from app.database.connection import SessionLocal
from app.models.student import Student
from app.models.filiere import Filiere
from app.models.course import Course
from app.models.user import User
from app.models.university import University
from app.models.teacher import Teacher
from app.models.schedule import Schedule
from app.models.grade import Grade
from app.models.attendance import Attendance
from app.models.material import Material
from app.models.payment import Payment
from app.models.exam_session import ExamSession
from app.core.dependencies import get_current_user, require_role
from app.core.security import hash_password, verify_password
from app.core.config import BACKEND_URL
from app.utils.email_validator import validate_email_exists
from app.utils.academic_year import get_current_academic_year
from app.utils.email_service import send_credentials_email, send_password_reset_email

router = APIRouter(prefix="/students", tags=["Students"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def generate_matricule(db: Session, university_id: int, university_name: str) -> str:
    """Génère un matricule unique au format XX-YYYY-NNNN"""
    prefix = university_name[:2].upper() if len(university_name) >= 2 else university_name.upper()
    year = datetime.now().year

    pattern = re.compile(rf'^{re.escape(prefix)}-{year}-(\d+)$')

    existing_matricules = db.query(Student.matricule).filter(
        Student.university_id == university_id,
        Student.matricule.like(f'{prefix}-{year}-%')
    ).all()

    max_number = 0
    for (matricule,) in existing_matricules:
        if matricule:
            m = pattern.match(matricule)
            if m:
                max_number = max(max_number, int(m.group(1)))

    return f"{prefix}-{year}-{max_number + 1:04d}"


def cleanup_orphan_users(db: Session, university_id: int):
    """Supprime les utilisateurs étudiants orphelins (sans Student associé)"""
    orphan_users = db.query(User).filter(
        User.role == "student",
        User.university_id == university_id,
        ~User.id.in_(db.query(Student.user_id))
    ).all()
    
    for user in orphan_users:
        print(f"🧹 Nettoyage utilisateur orphelin: {user.email}")
        db.delete(user)
    
    if orphan_users:
        db.commit()


# ==========================================
# ✅ CRUD ÉTUDIANTS (Admin/Secretary)
# ==========================================

@router.post("/")
async def create_student(
    first_name: str = Form(...),
    last_name: str = Form(...),
    email: str = Form(...),
    filiere: str = Form(...),
    level: str = Form(...),
    date_of_birth: Optional[str] = Form(None),
    place_of_birth: Optional[str] = Form(None),
    gender: Optional[str] = Form(None),
    nationality: Optional[str] = Form(None),
    phone: Optional[str] = Form(None),
    address: Optional[str] = Form(None),
    domain: Optional[str] = Form(None),
    parent_name: Optional[str] = Form(None),
    parent_phone: Optional[str] = Form(None),
    parent_email: Optional[str] = Form(None),
    photo: UploadFile = File(None),
    scanned_file_path: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "censeur", "teacher"))
):
    """Créer un nouvel étudiant"""
    cleanup_orphan_users(db, current_user.university_id)
    
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")

    is_valid, error_msg = validate_email_exists(email)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)

    new_user = None
    new_student = None
    
    try:
        temp_password = secrets.token_urlsafe(8)
        new_user = User(
            full_name=f"{first_name} {last_name}",
            email=email,
            hashed_password=hash_password(temp_password),
            role="student",
            university_id=current_user.university_id
        )
        db.add(new_user)
        db.flush()
        db.refresh(new_user)

        univ_name = current_user.university.name if current_user.university else "UN"
        auto_matricule = generate_matricule(db, current_user.university_id, univ_name)

        new_student = Student(
            first_name=first_name,
            last_name=last_name,
            email=email,
            filiere=filiere,
            level=level,
            domain=domain,
            date_of_birth=date_of_birth if date_of_birth else None,
            place_of_birth=place_of_birth,
            gender=gender,
            nationality=nationality,
            phone=phone,
            address=address,
            parent_name=parent_name,
            parent_phone=parent_phone,
            parent_email=parent_email,
            matricule=auto_matricule,
            user_id=new_user.id,
            university_id=current_user.university_id,
            university_name=univ_name,
            status="active"
        )
        db.add(new_student)
        db.flush()
        db.refresh(new_student)

        # QR Code
        os.makedirs("qr_codes", exist_ok=True)
        qr_filename = f"STUDENT_{new_student.id}.png"
        qr_path = os.path.join("qr_codes", qr_filename)
        qr = qrcode.make(auto_matricule)
        qr.save(qr_path)
        new_student.qr_code = qr_filename

        # Photo
        if photo and photo.filename and photo.size > 0:
            os.makedirs("uploads", exist_ok=True)
            photo_filename = f"STUDENT_{new_student.id}_{int(time_module.time())}.png"
            photo_path = os.path.join("uploads", photo_filename)
            
            content = await photo.read()
            with open(photo_path, "wb") as buffer:
                buffer.write(content)
            
            new_student.photo = photo_filename

        db.commit()
        db.refresh(new_student)

        # Déplacer le document scanné vers le dossier de l'étudiant
        if scanned_file_path:
            temp_file = Path(scanned_file_path)
            if temp_file.exists():
                student_folder = Path(f"uploads/dossier_etudiant/{new_student.id}")
                student_folder.mkdir(parents=True, exist_ok=True)
                
                dest_path = student_folder / temp_file.name
                shutil.move(str(temp_file), str(dest_path))
                
                new_student.id_document = str(dest_path)
                db.commit()

        # Envoi des identifiants par email
        send_credentials_email(
            to_email=email,
            full_name=f"{first_name} {last_name}",
            password=temp_password,
            role="student",
            university_name=univ_name
        )

        return {
            "student": new_student,
            "temp_password": temp_password,
            "message": "Étudiant créé avec succès"
        }
        
    except IntegrityError as e:
        db.rollback()
        print(f"❌ Conflit d'unicité: {str(e)}")
        try:
            cleanup_orphan_users(db, current_user.university_id)
        except Exception:
            pass
        raise HTTPException(
            status_code=409,
            detail="Un conflit est survenu. Merci de réessayer."
        )
    except Exception as e:
        db.rollback()
        print(f"❌ Erreur création étudiant: {str(e)}")
        try:
            cleanup_orphan_users(db, current_user.university_id)
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"Erreur lors de la création: {str(e)}")


@router.get("/")
def get_students(
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "accountant", "censeur", "teacher", "student"))
):
    """Liste des étudiants"""
    query = db.query(Student).filter(
        Student.university_id == current_user.university_id
    )
    
    if current_user.role == "student":
        query = query.filter(Student.user_id == current_user.id)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Student.first_name.ilike(search_term)) |
            (Student.last_name.ilike(search_term)) |
            (Student.matricule.ilike(search_term)) |
            (Student.email.ilike(search_term))
        )
    
    students = query.order_by(Student.last_name, Student.first_name).all()
    
    result = []
    for student in students:
        filiere_obj = None
        if student.filiere:
            filiere_obj = db.query(Filiere).filter(
                Filiere.name == student.filiere,
                Filiere.university_id == current_user.university_id
            ).first()
        
        student_dict = {
            "id": student.id,
            "first_name": student.first_name,
            "last_name": student.last_name,
            "matricule": student.matricule,
            "email": student.email,
            "phone": student.phone,
            "level": student.level,
            "filiere": student.filiere,
            "domain": filiere_obj.domain if filiere_obj else "Non défini",
            "status": student.status,
            "photo": student.photo,
            "date_of_birth": student.date_of_birth.isoformat() if student.date_of_birth else None,
            "place_of_birth": student.place_of_birth,
            "address": student.address,
            "created_at": student.created_at.isoformat() if student.created_at else None,
            "user_id": student.user_id,
            "birth_certificate": getattr(student, 'birth_certificate', None),
            "previous_diploma": getattr(student, 'previous_diploma', None),
            "id_document": getattr(student, 'id_document', None),
            "photo_id": getattr(student, 'photo_id', None),
            "file_status": getattr(student, 'file_status', None)
        }
        result.append(student_dict)
    
    return result


@router.get("/{student_id}/qr-code")
def generate_student_qr_code(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "student"))
):
    """Génère et retourne l'image PNG du QR code d'un étudiant"""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Étudiant non trouvé")
    
    if student.qr_code:
        qr_path = os.path.join("qr_codes", student.qr_code)
        if os.path.exists(qr_path):
            with open(qr_path, "rb") as f:
                return Response(content=f.read(), media_type="image/png")
    
    verify_url = f"https://unisphere.ai/verify/{student.matricule}"
    
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=2,
    )
    qr.add_data(verify_url)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    img_io = BytesIO()
    img.save(img_io, 'PNG')
    img_io.seek(0)
    
    return Response(content=img_io.getvalue(), media_type="image/png")


# ==========================================
# ✅ ESPACE ÉTUDIANT CONNECTÉ (/me/*)
# ⚠️ IMPORTANT : Doit être AVANT /{student_id}
# ==========================================

@router.get("/me")
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student"))
):
    """Profil de l'étudiant connecté"""
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Profil étudiant non trouvé")
    
    # Récupérer aussi les infos du User pour le phone/email
    user = db.query(User).filter(User.id == current_user.id).first()
    
    return {
        "id": student.id,
        "first_name": student.first_name,
        "last_name": student.last_name,
        "matricule": student.matricule,
        "email": student.email,
        "phone": student.phone or (user.phone if user else None),
        "level": student.level,
        "filiere": student.filiere,
        "domain": student.domain,
        "date_of_birth": student.date_of_birth.isoformat() if student.date_of_birth else None,
        "place_of_birth": student.place_of_birth,
        "gender": student.gender,
        "nationality": student.nationality,
        "address": student.address,
        "photo": student.photo,
        "status": student.status,
        "academic_year": getattr(student, 'academic_year', '2025-2026'),
        "emergency_contact": getattr(student, 'emergency_contact', None),
        "emergency_phone": getattr(student, 'emergency_phone', None),
        "city": getattr(student, 'city', None),
        "country": getattr(student, 'country', None),
        "user_id": student.user_id,
        "created_at": student.created_at.isoformat() if student.created_at else None
    }


@router.put("/me")
async def update_my_profile(
    phone: Optional[str] = Form(None),
    address: Optional[str] = Form(None),
    city: Optional[str] = Form(None),
    country: Optional[str] = Form(None),
    emergency_contact: Optional[str] = Form(None),
    emergency_phone: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student"))
):
    """Met à jour les informations personnelles de l'étudiant connecté"""
    student = db.query(Student).filter(
        Student.user_id == current_user.id
    ).first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Profil étudiant non trouvé")
    
    # Mise à jour des champs modifiables (avec vérification d'existence)
    if phone is not None:
        student.phone = phone
    if address is not None:
        student.address = address
    
    for field in ['city', 'country', 'emergency_contact', 'emergency_phone']:
        value = locals().get(field)
        if value is not None and hasattr(student, field):
            setattr(student, field, value)
    
    # Mise à jour du user associé
    user = db.query(User).filter(User.id == current_user.id).first()
    if user and phone is not None:
        user.phone = phone
    
    db.commit()
    db.refresh(student)
    
    return {
        "message": "Profil mis à jour avec succès",
        "student": student
    }


@router.post("/me/photo")
async def upload_my_photo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student"))
):
    """Upload la photo de profil de l'étudiant connecté"""
    student = db.query(Student).filter(
        Student.user_id == current_user.id
    ).first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Profil étudiant non trouvé")
    
    if file.content_type not in ["image/jpeg", "image/png", "image/jpg"]:
        raise HTTPException(status_code=400, detail="Format non supporté (JPG, PNG uniquement)")
    
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image trop volumineuse (max 5 Mo)")
    
    os.makedirs("uploads", exist_ok=True)
    photo_filename = f"STUDENT_{student.id}_{int(time_module.time())}.png"
    photo_path = os.path.join("uploads", photo_filename)
    
    # Supprimer l'ancienne photo si elle existe
    if student.photo:
        old_path = os.path.join("uploads", student.photo)
        if os.path.exists(old_path):
            try:
                os.remove(old_path)
            except Exception:
                pass
    
    with open(photo_path, "wb") as buffer:
        buffer.write(content)
    
    student.photo = photo_filename
    db.commit()
    
    return {
        "message": "Photo mise à jour",
        "photo": photo_filename
    }


@router.post("/me/change-password")
def change_my_password(
    current_password: str = Form(...),
    new_password: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student"))
):
    """Change le mot de passe de l'étudiant connecté"""
    if not verify_password(current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Mot de passe actuel incorrect")
    
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Le nouveau mot de passe doit contenir au moins 6 caractères")
    
    current_user.hashed_password = hash_password(new_password)
    db.commit()
    
    return {"message": "Mot de passe modifié avec succès"}


@router.get("/me/dashboard")
def get_student_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student"))
):
    """Dashboard complet de l'étudiant connecté"""
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Profil étudiant non trouvé")

    # Statistiques de base
    grades = db.query(Grade).filter(Grade.student_id == student.id, Grade.score.isnot(None)).all()
    average_grade = 0
    if grades:
        total_weighted = sum(g.score * (g.coefficient or 1) for g in grades)
        total_coef = sum(g.coefficient or 1 for g in grades)
        average_grade = round(total_weighted / total_coef, 2) if total_coef > 0 else 0

    attendances = db.query(Attendance).filter(Attendance.student_id == student.id).all()
    attendance_rate = 0
    if attendances:
        present_count = len([a for a in attendances if a.status in ['present', 'late']])
        attendance_rate = round((present_count / len(attendances)) * 100, 1)

    # Dernières notes
    recent_grades = []
    sorted_grades = sorted(grades, key=lambda x: x.created_at or datetime.min, reverse=True)[:5]
    for g in sorted_grades:
        course_name = "Matière inconnue"
        if hasattr(g, 'course') and g.course:
            course_name = (
                getattr(g.course, 'title', None) or 
                getattr(g.course, 'subject', None) or 
                getattr(g.course, 'name', None) or 
                getattr(g.course, 'matiere', "Matière inconnue")
            )
        
        recent_grades.append({
            "subject": course_name,
            "score": g.score,
            "coefficient": g.coefficient or 1,
            "date": g.created_at.strftime("%d/%m/%Y") if g.created_at else "N/A",
            "comment": getattr(g, 'comment', "") or ""
        })

    # Prochains événements
    upcoming_events = []
    
    try:
        if student.class_room_id:
            schedules = db.query(Schedule, Course).join(
                Course, Schedule.course_id == Course.id
            ).filter(
                Schedule.class_id == student.class_room_id,
                Schedule.university_id == current_user.university_id
            ).order_by(Schedule.day_of_week, Schedule.start_time).limit(3).all()
            
            for sch, course in schedules:
                upcoming_events.append({
                    "title": f"Cours: {course.title if course else 'Matière'}",
                    "type": "course",
                    "date": sch.day_of_week,
                    "time": f"{sch.start_time} - {sch.end_time}",
                    "location": f"{sch.building or ''} {sch.room or 'Salle inconnue'}".strip()
                })
        
        exams = db.query(ExamSession).filter(
            ExamSession.university_id == current_user.university_id,
            ExamSession.start_date >= date.today()
        ).order_by(ExamSession.start_date.asc()).limit(2).all()
        
        for exam in exams:
            upcoming_events.append({
                "title": f"Session: {exam.name}",
                "type": "exam",
                "date": exam.start_date.strftime("%d/%m/%Y") if exam.start_date else "Date inconnue",
                "time": "Voir détails",
                "location": "Session officielle"
            })
            
        upcoming_events = upcoming_events[:3]
        
    except Exception as e:
        print(f"⚠️ Erreur événements: {e}")
        upcoming_events = []

    return {
        "student_name": f"{student.first_name} {student.last_name}",
        "matricule": student.matricule,
        "filiere": student.filiere,
        "average_grade": average_grade,
        "attendance_rate": attendance_rate,
        "recent_grades": recent_grades,
        "upcoming_events": upcoming_events
    }


@router.get("/me/courses")
def get_my_courses(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student"))
):
    """Récupère les cours de l'étudiant avec leurs supports"""
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Profil étudiant non trouvé")

    courses = db.query(Course).filter(
        Course.level == student.level,
        Course.university_id == student.university_id
    ).all()

    result = []
    for c in courses:
        course_filiere_name = ""
        if hasattr(c, 'filiere') and c.filiere:
            course_filiere_name = getattr(c.filiere, 'name', '')
        elif hasattr(c, 'filiere_name'):
            course_filiere_name = c.filiere_name
            
        if student.filiere and course_filiere_name != student.filiere:
            continue

        teacher_name = "Enseignant non assigné"
        if hasattr(c, 'teacher_id') and c.teacher_id:
            teacher = db.query(Teacher).filter(Teacher.id == c.teacher_id).first()
            if teacher:
                teacher_name = f"{teacher.first_name} {teacher.last_name}"
        
        materials = db.query(Material).filter(
            Material.course_id == c.id,
            Material.visibility.in_(['students', 'public']),
            Material.university_id == current_user.university_id
        ).order_by(Material.created_at.desc()).all()
        
        materials_list = []
        for m in materials:
            materials_list.append({
                "id": m.id,
                "title": m.title,
                "description": m.description,
                "file_path": m.file_path,
                "file_type": m.file_type,
                "original_name": m.original_name,
                "file_size": m.file_size,
                "download_count": m.download_count,
                "created_at": m.created_at.isoformat() if m.created_at else None
            })

        result.append({
            "id": c.id,
            "title": getattr(c, 'title', getattr(c, 'name', 'Cours sans titre')),
            "description": getattr(c, 'description', ''),
            "teacher": teacher_name,
            "coefficient": getattr(c, 'coefficient', 1),
            "materials": materials_list
        })

    return result


@router.get("/me/grades")
def get_my_grades(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student"))
):
    """Récupère toutes les notes de l'étudiant"""
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Profil étudiant non trouvé")

    grades = db.query(Grade).filter(Grade.student_id == student.id).all()
    
    result = []
    for g in grades:
        subject = "Matière inconnue"
        if hasattr(g, 'course') and g.course:
            subject = getattr(g.course, 'title', getattr(g.course, 'name', 'Matière'))
            
        result.append({
            "id": g.id,
            "subject": subject,
            "score": g.score,
            "max_score": getattr(g, 'max_score', 20),
            "coefficient": g.coefficient or 1,
            "exam_type": getattr(g, 'exam_type', getattr(g, 'type', 'Devoir')),
            "date": g.created_at.strftime("%d/%m/%Y") if g.created_at else "N/A",
            "comment": getattr(g, 'comment', '')
        })

    result.sort(key=lambda x: x['date'], reverse=True)
    return result


@router.get("/me/schedule")
def get_my_schedule(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student"))
):
    """Récupère l'emploi du temps de l'étudiant"""
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Profil non trouvé")

    if student.class_room_id:
        schedules = db.query(Schedule).filter(
            Schedule.class_id == student.class_room_id,
            Schedule.university_id == student.university_id
        ).all()
    else:
        schedules = db.query(Schedule).filter(
            Schedule.university_id == student.university_id
        ).all()

    result = []
    for s in schedules:
        course = db.query(Course).filter(Course.id == s.course_id).first()
        
        if course and student.filiere:
            course_filiere_name = ""
            if hasattr(course, 'filiere') and course.filiere:
                course_filiere_name = getattr(course.filiere, 'name', '')
            elif hasattr(course, 'filiere_name'):
                course_filiere_name = course.filiere_name
                
            if course_filiere_name != student.filiere:
                continue

        teacher = db.query(Teacher).filter(Teacher.id == s.teacher_id).first() if s.teacher_id else None
        
        result.append({
            "id": s.id,
            "day_of_week": s.day_of_week,
            "start_time": s.start_time,
            "end_time": s.end_time,
            "subject": getattr(course, 'title', getattr(course, 'name', 'Cours inconnu')) if course else "Cours inconnu",
            "teacher": f"{teacher.first_name} {teacher.last_name}" if teacher else "Non assigné",
            "room": f"{s.building or ''} {s.room or ''}".strip() or "Salle inconnue"
        })

    return result


@router.get("/me/attendance")
def get_my_attendance(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student"))
):
    """Récupère l'historique des présences"""
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Profil étudiant non trouvé")

    attendances = db.query(Attendance).filter(
        Attendance.student_id == student.id
    ).order_by(Attendance.date.desc()).all()

    result = []
    for att in attendances:
        course_name = "Cours inconnu"
        if hasattr(att, 'course_id') and att.course_id:
            course = db.query(Course).filter(Course.id == att.course_id).first()
            if course:
                course_name = getattr(course, 'title', getattr(course, 'name', 'Cours'))
        
        result.append({
            "id": att.id,
            "date": att.date.strftime("%d/%m/%Y") if att.date else "N/A",
            "status": att.status,
            "course": course_name,
            "comment": getattr(att, 'comment', '') or ''
        })

    return result


@router.get("/me/payments")
def get_my_payments(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student"))
):
    """Récupère l'historique des paiements"""
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Profil étudiant non trouvé")

    try:
        payments = db.query(Payment).filter(
            Payment.student_id == student.id
        ).order_by(Payment.payment_date.desc()).all()

        result = []
        for p in payments:
            result.append({
                "id": p.id,
                "amount": p.amount,
                "payment_date": p.payment_date.strftime("%d/%m/%Y") if p.payment_date else "N/A",
                "payment_method": getattr(p, 'payment_method', 'Espèces'),
                "description": getattr(p, 'description', getattr(p, 'label', 'Paiement')),
                "status": getattr(p, 'status', 'completed')
            })

        return result
        
    except Exception:
        return []


@router.get("/me/receipts")
def get_my_receipts(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student"))
):
    """Récupère les reçus de paiement"""
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Profil étudiant non trouvé")

    try:
        payments = db.query(Payment).filter(
            Payment.student_id == student.id,
            Payment.status == 'completed'
        ).order_by(Payment.payment_date.desc()).all()

        result = []
        for p in payments:
            result.append({
                "id": p.id,
                "receipt_number": getattr(p, 'receipt_number', f"REC-{p.id:06d}"),
                "amount": p.amount,
                "payment_date": p.payment_date.strftime("%d/%m/%Y") if p.payment_date else "N/A",
                "description": getattr(p, 'description', getattr(p, 'label', 'Paiement')),
                "payment_method": getattr(p, 'payment_method', 'Espèces'),
                "status": getattr(p, 'status', 'paid'),
                "student": {
                    "name": f"{student.first_name} {student.last_name}",
                    "matricule": student.matricule,
                    "level": student.level,
                    "filiere": student.filiere
                },
                "university": {
                    "name": getattr(current_user, 'university_name', 'Université')
                },
                "creator": {
                    "name": "Service Comptable"
                },
                "tranches": {
                    "paid": [{"tranche_name": "Paiement unique", "amount": p.amount}],
                    "remaining": [],
                    "total_paid": p.amount,
                    "paid_percentage": 100
                }
            })

        return result
        
    except Exception:
        return []


@router.get("/me/receipts/{receipt_id}")
def get_my_receipt_by_id(
    receipt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student"))
):
    """Récupère les détails d'un reçu spécifique"""
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Profil étudiant non trouvé")

    try:
        payment = db.query(Payment).filter(
            Payment.id == receipt_id,
            Payment.student_id == student.id
        ).first()
        
        if not payment:
            raise HTTPException(status_code=404, detail="Reçu introuvable")
        
        university = db.query(University).filter(
            University.id == current_user.university_id
        ).first()
        
        status = 'paid'
        if hasattr(payment, 'balance') and payment.balance and payment.balance > 0:
            status = 'partial'
        elif hasattr(payment, 'status'):
            status = payment.status
        
        receipt_data = {
            "payment": {
                "id": payment.id,
                "receipt_number": getattr(payment, 'receipt_number', None) or f"REC-{payment.id:06d}",
                "reference": getattr(payment, 'reference', None) or f"REF-{payment.id:06d}",
                "amount": payment.amount or 0,
                "total_amount": getattr(payment, 'total_amount', None) or payment.amount or 0,
                "balance": getattr(payment, 'balance', None) or 0,
                "payment_date": payment.payment_date.isoformat() if payment.payment_date else (payment.created_at.isoformat() if payment.created_at else None),
                "created_at": payment.created_at.isoformat() if payment.created_at else None,
                "payment_type": getattr(payment, 'payment_type', 'scolarite') or 'scolarite',
                "payment_method": getattr(payment, 'payment_method', 'cash') or 'cash',
                "description": getattr(payment, 'description', None) or getattr(payment, 'label', 'Paiement de scolarité'),
                "status": status
            },
            "student": {
                "id": student.id,
                "name": f"{student.first_name} {student.last_name}",
                "first_name": student.first_name,
                "last_name": student.last_name,
                "matricule": student.matricule,
                "level": student.level,
                "filiere": student.filiere
            },
            "university": {
                "name": university.name if university else "Université",
                "address": getattr(university, 'address', '') if university else '',
                "phone": getattr(university, 'phone', '') if university else '',
                "email": getattr(university, 'email', '') if university else ''
            },
            "creator": {
                "name": "Service Comptable",
                "role": "accountant"
            },
            "tranches": {
                "paid": [{"tranche_name": "Paiement effectué", "amount": payment.amount or 0, "due_date": payment.payment_date.isoformat() if payment.payment_date else None}],
                "remaining": [],
                "total_paid": payment.amount or 0,
                "total_remaining": getattr(payment, 'balance', None) or 0,
                "paid_percentage": 100 if status == 'paid' else 0
            }
        }
        
        return {"receipt": receipt_data}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f" Erreur reçu: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur serveur: {str(e)}")


@router.get("/me/card")
def get_my_student_card(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student"))
):
    """Récupère les données de la carte étudiante"""
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Profil étudiant non trouvé")

    university = db.query(University).filter(University.id == current_user.university_id).first()
    if not university:
        raise HTTPException(status_code=404, detail="Université non trouvée")

    saved_config = university.card_config or {}

    photo_url = f"{BACKEND_URL}/uploads/{student.photo}" if student.photo else None
    qr_code_url = f"{BACKEND_URL}/qr_codes/{student.qr_code}" if student.qr_code else None
    logo_url = f"{BACKEND_URL}/uploads/logos/{university.logo}" if getattr(university, 'logo', None) else None

    return {
        "student": {
            "id": student.id,
            "first_name": student.first_name,
            "last_name": student.last_name,
            "matricule": student.matricule,
            "level": student.level,
            "filiere": student.filiere,
            "domain": getattr(student, 'domain', ''),
            "faculty": getattr(student, 'faculty', ''),
            "date_of_birth": student.date_of_birth.strftime("%d/%m/%Y") if student.date_of_birth else None,
            "photo": photo_url,
            "qr_code": qr_code_url
        },
        "university": {
            "id": university.id,
            "name": university.name,
            "slogan": getattr(university, 'slogan', ''),
            "logo": logo_url,
            "academic_year": getattr(university, 'academic_year', None) or get_current_academic_year(db, current_user.university_id),
            "address": getattr(university, 'address', ''),
            "phone": getattr(university, 'phone', ''),
            "email": getattr(university, 'email', '')
        },
        "config": saved_config
    }


@router.get("/me/files")
def get_my_files(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student"))
):
    """Récupère les fichiers du dossier de l'étudiant"""
    student = db.query(Student).filter(
        Student.user_id == current_user.id
    ).first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Profil étudiant non trouvé")
    
    student_folder = Path(f"uploads/dossier_etudiant/{student.id}")
    
    if not student_folder.exists():
        return []
    
    files = []
    for file_path in student_folder.iterdir():
        if file_path.is_file():
            filename = file_path.name
            doc_type = "other"
            
            if filename.startswith("cni_"):
                doc_type = "cni"
            elif filename.startswith("birth_certificate_"):
                doc_type = "birth_certificate"
            elif filename.startswith("photo_"):
                doc_type = "photo"
            elif filename.startswith("bac_"):
                doc_type = "bac"
            
            files.append({
                "id": filename,
                "name": doc_type,
                "filename": filename,
                "path": f"uploads/dossier_etudiant/{student.id}/{filename}",
                "size": file_path.stat().st_size,
                "status": "pending",
                "uploaded_at": datetime.fromtimestamp(file_path.stat().st_mtime).isoformat()
            })
    
    return files


@router.post("/me/files")
async def upload_my_file(
    document_type: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student"))
):
    """Upload un fichier dans le dossier de l'étudiant"""
    student = db.query(Student).filter(
        Student.user_id == current_user.id
    ).first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Profil étudiant non trouvé")
    
    allowed_types = ["image/jpeg", "image/png", "image/jpg", "application/pdf"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Format non supporté. Utilisez JPG, PNG ou PDF.")
    
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Fichier trop volumineux (max 10 Mo)")
    
    student_folder = Path(f"uploads/dossier_etudiant/{student.id}")
    student_folder.mkdir(parents=True, exist_ok=True)
    
    # Supprimer l'ancien fichier du même type
    for existing_file in student_folder.iterdir():
        if existing_file.name.startswith(f"{document_type}_"):
            try:
                existing_file.unlink()
            except Exception:
                pass
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    ext = Path(file.filename).suffix.lower() if file.filename else ".jpg"
    filename = f"{document_type}_{timestamp}{ext}"
    file_path = student_folder / filename
    
    with open(file_path, "wb") as f:
        f.write(content)
    
    return {
        "message": "Fichier uploadé avec succès",
        "filename": filename,
        "path": f"uploads/dossier_etudiant/{student.id}/{filename}"
    }


@router.delete("/me/files/{filename}")
def delete_my_file(
    filename: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student"))
):
    """Supprime un fichier du dossier de l'étudiant"""
    student = db.query(Student).filter(
        Student.user_id == current_user.id
    ).first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Profil étudiant non trouvé")
    
    file_path = Path(f"uploads/dossier_etudiant/{student.id}/{filename}")
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Fichier non trouvé")
    
    file_path.unlink()
    
    return {"message": "Fichier supprimé avec succès"}


# ==========================================
# ✅ CRUD ÉTUDIANT (par ID - Admin/Secretary)
# ⚠️ Doit être APRÈS toutes les routes /me/*
# ==========================================

@router.get("/{student_id}")
def get_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "accountant", "censeur", "teacher"))
):
    """Récupère un étudiant par ID"""
    student = db.query(Student).filter(
        Student.id == student_id,
        Student.university_id == current_user.university_id
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Étudiant non trouvé")
    return student


@router.put("/{student_id}")
async def update_student(
    student_id: int,
    first_name: str = Form(...),
    last_name: str = Form(...),
    email: str = Form(...),
    filiere: str = Form(...),
    level: str = Form(...),
    date_of_birth: Optional[str] = Form(None),
    place_of_birth: Optional[str] = Form(None),
    gender: Optional[str] = Form(None),
    nationality: Optional[str] = Form(None),
    phone: Optional[str] = Form(None),
    address: Optional[str] = Form(None),
    domain: Optional[str] = Form(None),
    parent_name: Optional[str] = Form(None),
    parent_phone: Optional[str] = Form(None),
    parent_email: Optional[str] = Form(None),
    photo: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary"))
):
    """Met à jour un étudiant"""
    existing_student = db.query(Student).filter(
        Student.id == student_id,
        Student.university_id == current_user.university_id
    ).first()

    if not existing_student:
        raise HTTPException(status_code=404, detail="Étudiant non trouvé")

    if email != existing_student.email:
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")

    existing_student.first_name = first_name
    existing_student.last_name = last_name
    existing_student.email = email
    existing_student.filiere = filiere
    existing_student.level = level
    existing_student.domain = domain
    existing_student.date_of_birth = date_of_birth if date_of_birth else None
    existing_student.place_of_birth = place_of_birth
    existing_student.gender = gender
    existing_student.nationality = nationality
    existing_student.phone = phone
    existing_student.address = address
    existing_student.parent_name = parent_name
    existing_student.parent_phone = parent_phone
    existing_student.parent_email = parent_email
    
    if photo and photo.filename and photo.size > 0:
        os.makedirs("uploads", exist_ok=True)
        photo_filename = f"STUDENT_{existing_student.id}_{int(time_module.time())}.png"
        photo_path = os.path.join("uploads", photo_filename)
        
        content = await photo.read()
        with open(photo_path, "wb") as buffer:
            buffer.write(content)
        
        existing_student.photo = photo_filename

    user = db.query(User).filter(User.id == existing_student.user_id).first()
    if user:
        user.full_name = f"{first_name} {last_name}"
        user.email = email

    db.commit()
    db.refresh(existing_student)
    return existing_student


@router.delete("/{student_id}")
def delete_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Supprime un étudiant"""
    student = db.query(Student).filter(
        Student.id == student_id,
        Student.university_id == current_user.university_id
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Étudiant non trouvé")
    
    user_id = student.user_id
    
    if student.qr_code:
        qr_path = os.path.join("qr_codes", student.qr_code)
        if os.path.exists(qr_path):
            os.remove(qr_path)
            
    if student.photo:
        photo_path = os.path.join("uploads", student.photo)
        if os.path.exists(photo_path):
            os.remove(photo_path)
            
    db.delete(student)
    db.commit()
    
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        db.delete(user)
        db.commit()
        
    return {"message": "Étudiant supprimé"}


@router.post("/{student_id}/document/{doc_type}")
async def upload_student_document(
    student_id: int,
    doc_type: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "student"))
):
    """Upload un document officiel pour un étudiant"""
    valid_types = ["birth_certificate", "previous_diploma", "id_document", "photo_id"]
    if doc_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Type invalide. Types: {', '.join(valid_types)}")
    
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Étudiant non trouvé")
    
    if current_user.role == "student" and student.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    os.makedirs("uploads/student_documents", exist_ok=True)
    ext = file.filename.split('.')[-1] if '.' in file.filename else 'pdf'
    filename = f"{doc_type}_{student_id}_{int(time_module.time())}.{ext}"
    filepath = os.path.join("uploads/student_documents", filename)
    
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Fichier trop volumineux (max 10 Mo)")
    
    with open(filepath, "wb") as buffer:
        buffer.write(content)
    
    setattr(student, doc_type, filename)
    
    required_docs = ["birth_certificate", "previous_diploma", "id_document"]
    all_present = all(getattr(student, doc, None) for doc in required_docs)
    student.file_status = "complete" if all_present else "incomplete"
    
    db.commit()
    
    return {
        "message": "Document uploadé avec succès",
        "filename": filename,
        "file_status": student.file_status
    }

# ==========================================
# ✅ VALIDATION DES DOCUMENTS (Secrétaire/Admin)
# ==========================================

@router.get("/documents/pending")
def get_pending_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary"))
):
    """Récupère tous les documents en attente de validation"""
    import os
    from pathlib import Path
    
    # Récupérer tous les étudiants de l'université
    students = db.query(Student).filter(
        Student.university_id == current_user.university_id
    ).all()
    
    pending_docs = []
    
    for student in students:
        student_folder = Path(f"uploads/dossier_etudiant/{student.id}")
        
        if not student_folder.exists():
            continue
        
        for file_path in student_folder.iterdir():
            if file_path.is_file():
                filename = file_path.name
                
                # Déterminer le type
                doc_type = "other"
                if filename.startswith("cni_"):
                    doc_type = "cni"
                elif filename.startswith("birth_certificate_"):
                    doc_type = "birth_certificate"
                elif filename.startswith("photo_"):
                    doc_type = "photo"
                elif filename.startswith("bac_"):
                    doc_type = "bac"
                
                pending_docs.append({
                    "student_id": student.id,
                    "student_name": f"{student.first_name} {student.last_name}",
                    "matricule": student.matricule,
                    "level": student.level,
                    "filiere": student.filiere,
                    "document_type": doc_type,
                    "filename": filename,
                    "path": f"uploads/dossier_etudiant/{student.id}/{filename}",
                    "size": file_path.stat().st_size,
                    "uploaded_at": datetime.fromtimestamp(file_path.stat().st_mtime).isoformat()
                })
    
    # Trier par date décroissante
    pending_docs.sort(key=lambda x: x['uploaded_at'], reverse=True)
    
    return pending_docs


@router.post("/documents/{student_id}/{filename}/validate")
def validate_document(
    student_id: int,
    filename: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary"))
):
    """Valide un document étudiant"""
    import os
    from pathlib import Path
    
    # Vérifier que l'étudiant appartient à l'université
    student = db.query(Student).filter(
        Student.id == student_id,
        Student.university_id == current_user.university_id
    ).first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Étudiant non trouvé")
    
    file_path = Path(f"uploads/dossier_etudiant/{student_id}/{filename}")
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Document non trouvé")
    
    # Déplacer vers un dossier "validated"
    validated_folder = Path(f"uploads/dossier_etudiant/{student_id}/validated")
    validated_folder.mkdir(parents=True, exist_ok=True)
    
    validated_path = validated_folder / filename
    
    try:
        shutil.move(str(file_path), str(validated_path))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur de déplacement: {str(e)}")
    
    # Mettre à jour le statut du dossier de l'étudiant
    update_file_status(student, validated_folder)
    
    # TODO : Notifier l'étudiant (optionnel)
    # send_notification(student.user_id, "Document validé", f"Votre document {filename} a été validé")
    
    return {
        "message": "Document validé avec succès",
        "new_path": str(validated_path)
    }


@router.post("/documents/{student_id}/{filename}/reject")
def reject_document(
    student_id: int,
    filename: str,
    reason: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary"))
):
    """Rejette un document étudiant"""
    import os
    from pathlib import Path
    
    # Vérifier que l'étudiant appartient à l'université
    student = db.query(Student).filter(
        Student.id == student_id,
        Student.university_id == current_user.university_id
    ).first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Étudiant non trouvé")
    
    file_path = Path(f"uploads/dossier_etudiant/{student_id}/{filename}")
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Document non trouvé")
    
    # Supprimer le fichier rejeté
    try:
        file_path.unlink()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur de suppression: {str(e)}")
    
    # TODO : Notifier l'étudiant avec la raison du rejet
    # send_notification(student.user_id, "Document rejeté", f"Raison: {reason}")
    
    return {
        "message": "Document rejeté",
        "reason": reason
    }


def update_file_status(student: Student, validated_folder: Path):
    """Met à jour le statut du dossier de l'étudiant (complet/incomplet)"""
    # Vérifier si tous les documents requis sont validés
    required_docs = ["cni", "birth_certificate", "photo"]
    
    validated_count = 0
    for doc_type in required_docs:
        # Chercher un fichier validé de ce type
        found = False
        for file in validated_folder.iterdir():
            if file.name.startswith(f"{doc_type}_"):
                found = True
                break
        if found:
            validated_count += 1
    
    if validated_count >= len(required_docs):
        student.file_status = "complete"
    else:
        student.file_status = "incomplete"
    
    # Sauvegarder (la session sera commit par l'appelant)
    try:
        db = SessionLocal()
        db.add(student)
        db.commit()
    except Exception:
        pass


@router.post("/{student_id}/reset-password")
def reset_student_password(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Réinitialiser le mot de passe d'un étudiant"""
    student = db.query(Student).filter(
        Student.id == student_id,
        Student.university_id == current_user.university_id
    ).first()

    if not student:
        raise HTTPException(status_code=404, detail="Étudiant non trouvé")

    temp_password = secrets.token_urlsafe(8)

    user = db.query(User).filter(User.id == student.user_id).first()
    if user:
        user.hashed_password = hash_password(temp_password)
        db.commit()

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