from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import date, datetime
from app.database.connection import get_db
from app.models.teacher import Teacher
from app.models.course import Course
from app.models.student import Student
from app.models.grade import Grade
from app.models.exam_session import ExamSession
from app.models.schedule import Schedule
from app.models.message import Message
from app.models.user import User
from app.models.attendance import Attendance 
from app.models.material import Material
from app.core.dependencies import require_role

import os
import time

# ✅ PRÉFIXE SANS "S" (espace enseignant connecté)
router = APIRouter(prefix="/teacher", tags=["Teacher"])


# ==========================================
# DASHBOARD TEACHER
# ==========================================
@router.get("/dashboard")
def get_teacher_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("teacher"))
):
    """Dashboard teacher avec stats"""
    
    # Trouver l'enseignant lié à l'utilisateur
    teacher = db.query(Teacher).filter(
        Teacher.user_id == current_user.id,
        Teacher.university_id == current_user.university_id
    ).first()
    
    if not teacher:
        raise HTTPException(status_code=404, detail="Profil enseignant non trouvé")
    
    # Compter les cours assignés
    courses_count = db.query(Course).filter(
        Course.teacher_id == teacher.id,
        Course.university_id == current_user.university_id
    ).count()
    
    # Compter les étudiants dans ses cours
    courses = db.query(Course).filter(
        Course.teacher_id == teacher.id,
        Course.university_id == current_user.university_id
    ).all()
    
    students_ids = set()
    for course in courses:
        students = db.query(Student).filter(
            Student.university_id == current_user.university_id,
            Student.level == course.level,
            Student.filiere == course.department
        ).all()
        for s in students:
            students_ids.add(s.id)
    
    students_count = len(students_ids)
    
    # Compter les notes en attente (brouillon)
    pending_grades = db.query(Grade).join(Course).filter(
        Course.teacher_id == teacher.id,
        Course.university_id == current_user.university_id,
        Grade.status == 'draft'
    ).count()
    
    # Compter les messages non lus
    unread_messages = db.query(Message).filter(
        Message.recipient_id == current_user.id,
        Message.is_read == False
    ).count()
    
    # Moyenne générale
    avg_grade = db.query(func.avg(Grade.score)).join(Course).filter(
        Course.teacher_id == teacher.id,
        Course.university_id == current_user.university_id,
        Grade.score.isnot(None)
    ).scalar() or 0
    
    # Taux de réussite
    total_grades = db.query(Grade).join(Course).filter(
        Course.teacher_id == teacher.id,
        Course.university_id == current_user.university_id,
        Grade.score.isnot(None)
    ).count()
    
    passed_grades = db.query(Grade).join(Course).filter(
        Course.teacher_id == teacher.id,
        Course.university_id == current_user.university_id,
        Grade.score >= 10
    ).count()
    
    success_rate = (passed_grades / total_grades * 100) if total_grades > 0 else 0
    
    return {
        "teacher_name": f"{teacher.first_name} {teacher.last_name}",
        "courses_count": courses_count,
        "students_count": students_count,
        "pending_grades": pending_grades,
        "unread_messages": unread_messages,
        "average_grade": float(avg_grade),
        "total_grades": total_grades,
        "success_rate": success_rate
    }


# ==========================================
# MES COURS
# ==========================================
@router.get("/courses")
def get_teacher_courses(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("teacher"))
):
    """Liste des cours assignés au teacher"""
    
    # Trouver l'enseignant
    teacher = db.query(Teacher).filter(
        Teacher.user_id == current_user.id,
        Teacher.university_id == current_user.university_id
    ).first()
    
    if not teacher:
        raise HTTPException(status_code=404, detail="Profil enseignant non trouvé")
    
    # Récupérer les cours assignés
    courses = db.query(Course).filter(
        Course.teacher_id == teacher.id,
        Course.university_id == current_user.university_id
    ).all()
    
    result = []
    for course in courses:
        # Compter les étudiants
        students_count = db.query(Student).filter(
            Student.university_id == current_user.university_id,
            Student.level == course.level,
            Student.filiere == course.department
        ).count()
        
        # Compter les notes saisies
        grades_count = db.query(Grade).filter(
            Grade.course_id == course.id,
            Grade.score.isnot(None)
        ).count()
        
        result.append({
            "id": course.id,
            "code": course.code,
            "title": course.title,
            "department": course.department,
            "level": course.level,
            "students_count": students_count,
            "grades_count": grades_count,
            "credits": course.credits,
            "hours": course.hours
        })
    
    return result


# ==========================================
# ÉTUDIANTS D'UN COURS
# ==========================================
@router.get("/courses/{course_id}/students")
def get_course_students(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("teacher"))
):
    """Liste des étudiants d'un cours spécifique"""
    
    # Trouver l'enseignant
    teacher = db.query(Teacher).filter(
        Teacher.user_id == current_user.id,
        Teacher.university_id == current_user.university_id
    ).first()
    
    if not teacher:
        raise HTTPException(status_code=404, detail="Profil enseignant non trouvé")
    
    # Vérifier que le cours appartient au teacher
    course = db.query(Course).filter(
        Course.id == course_id,
        Course.teacher_id == teacher.id,
        Course.university_id == current_user.university_id
    ).first()
    
    if not course:
        raise HTTPException(status_code=404, detail="Cours non trouvé ou non assigné")
    
    # Récupérer les étudiants
    students = db.query(Student).filter(
        Student.university_id == current_user.university_id,
        Student.level == course.level,
        Student.filiere == course.department
    ).all()
    
    return {
        "course": {
            "id": course.id,
            "code": course.code,
            "title": course.title,
            "department": course.department,
            "level": course.level
        },
        "students": [
            {
                "id": s.id,
                "first_name": s.first_name,
                "last_name": s.last_name,
                "matricule": s.matricule,
                "email": s.email,
                "phone": s.phone,
                "level": s.level,
                "filiere": s.filiere
            }
            for s in students
        ]
    }


# ==========================================
# DERNIÈRES NOTES
# ==========================================
@router.get("/recent-grades")
def get_recent_grades(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("teacher"))
):
    """Dernières notes saisies par le teacher"""
    
    # Trouver l'enseignant
    teacher = db.query(Teacher).filter(
        Teacher.user_id == current_user.id,
        Teacher.university_id == current_user.university_id
    ).first()
    
    if not teacher:
        return []
    
    grades = db.query(Grade).join(Course).filter(
        Course.teacher_id == teacher.id,
        Course.university_id == current_user.university_id,
        Grade.score.isnot(None)
    ).order_by(Grade.updated_at.desc()).limit(10).all()
    
    result = []
    for g in grades:
        course = db.query(Course).filter(Course.id == g.course_id).first()
        student = db.query(Student).filter(Student.id == g.student_id).first()
        session = db.query(ExamSession).filter(ExamSession.id == g.session_id).first() if g.session_id else None
        
        result.append({
            "id": g.id,
            "student_name": f"{student.first_name} {student.last_name}" if student else "Inconnu",
            "course_title": course.title if course else "Cours inconnu",
            "session_name": session.name if session else "Session inconnue",
            "score": float(g.score) if g.score else None,
            "status": g.status,
            "updated_at": g.updated_at.isoformat() if g.updated_at else None
        })
    
    return result


# ==========================================
# EMPLOI DU TEMPS COMPLET
# ==========================================
@router.get("/schedule")
def get_teacher_schedule(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("teacher"))
):
    """Emploi du temps du teacher"""
    
    teacher = db.query(Teacher).filter(
        Teacher.user_id == current_user.id,
        Teacher.university_id == current_user.university_id
    ).first()
    
    if not teacher:
        return []
    
    schedules = db.query(Schedule).filter(
        Schedule.teacher_id == teacher.id,
        Schedule.university_id == current_user.university_id
    ).all()
    
    result = []
    for s in schedules:
        course = db.query(Course).filter(Course.id == s.course_id).first()
        
        # ✅ CORRECTION : Gérer start_time et end_time (string ou time)
        start_time_str = None
        if s.start_time:
            if isinstance(s.start_time, str):
                start_time_str = s.start_time
            else:
                start_time_str = s.start_time.isoformat()
        
        end_time_str = None
        if s.end_time:
            if isinstance(s.end_time, str):
                end_time_str = s.end_time
            else:
                end_time_str = s.end_time.isoformat()
        
        result.append({
            "id": s.id,
            "course_id": s.course_id,
            "course_title": course.title if course else "Cours inconnu",
            "class_name": getattr(s, 'class_name', ''),
            "teacher_id": s.teacher_id,
            "room": s.room,
            "building": getattr(s, 'building', None),
            "day_of_week": s.day_of_week,
            "start_time": start_time_str,
            "end_time": end_time_str
        })
    
    return result

# ==========================================
# EMPLOI DU TEMPS DU JOUR
# ==========================================
@router.get("/schedule/today")
def get_today_schedule(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("teacher"))
):
    """Emploi du temps du jour"""
    
    teacher = db.query(Teacher).filter(
        Teacher.user_id == current_user.id,
        Teacher.university_id == current_user.university_id
    ).first()
    
    if not teacher:
        return []
    
    days_map = {
        0: 'Lundi', 1: 'Mardi', 2: 'Mercredi',
        3: 'Jeudi', 4: 'Vendredi', 5: 'Samedi'
    }
    
    today_name = days_map.get(date.today().weekday(), 'Lundi')
    
    schedules = db.query(Schedule).filter(
        Schedule.teacher_id == teacher.id,
        Schedule.university_id == current_user.university_id,
        Schedule.day_of_week == today_name
    ).order_by(Schedule.start_time).all()
    
    result = []
    for s in schedules:
        course = db.query(Course).filter(Course.id == s.course_id).first()
        
        # ✅ CORRECTION : Gérer start_time et end_time (string ou time)
        start_time_str = None
        if s.start_time:
            if isinstance(s.start_time, str):
                # Si c'est déjà une string, extraire HH:MM
                start_time_str = s.start_time[:5] if len(s.start_time) >= 5 else s.start_time
            else:
                start_time_str = s.start_time.strftime('%H:%M')
        
        end_time_str = None
        if s.end_time:
            if isinstance(s.end_time, str):
                end_time_str = s.end_time[:5] if len(s.end_time) >= 5 else s.end_time
            else:
                end_time_str = s.end_time.strftime('%H:%M')
        
        result.append({
            "id": s.id,
            "course_title": course.title if course else "Cours inconnu",
            "class_name": getattr(s, 'class_name', ''),
            "room": s.room,
            "start_time": start_time_str,
            "end_time": end_time_str
        })
    
    return result


# ==========================================
# STATISTIQUES
# ==========================================
@router.get("/statistics")
def get_teacher_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("teacher"))
):
    """Statistiques du teacher"""
    
    # Trouver l'enseignant
    teacher = db.query(Teacher).filter(
        Teacher.user_id == current_user.id,
        Teacher.university_id == current_user.university_id
    ).first()
    
    if not teacher:
        raise HTTPException(status_code=404, detail="Profil enseignant non trouvé")
    
    avg_grade = db.query(func.avg(Grade.score)).join(Course).filter(
        Course.teacher_id == teacher.id,
        Course.university_id == current_user.university_id,
        Grade.score.isnot(None)
    ).scalar() or 0
    
    total_grades = db.query(Grade).join(Course).filter(
        Course.teacher_id == teacher.id,
        Course.university_id == current_user.university_id
    ).count()
    
    courses_count = db.query(Course).filter(
        Course.teacher_id == teacher.id,
        Course.university_id == current_user.university_id
    ).count()
    
    return {
        "average_grade": round(float(avg_grade), 2),
        "total_grades": total_grades,
        "courses_count": courses_count
    }


# ==========================================
# PROFIL
# ==========================================
@router.get("/profile")
def get_teacher_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("teacher"))
):
    """Profil du teacher"""
    
    teacher = db.query(Teacher).filter(
        Teacher.user_id == current_user.id,
        Teacher.university_id == current_user.university_id
    ).first()
    
    if not teacher:
        raise HTTPException(status_code=404, detail="Profil enseignant non trouvé")
    
    return {
        "id": teacher.id,
        "first_name": teacher.first_name,
        "last_name": teacher.last_name,
        "email": teacher.email,
        "phone": teacher.phone,
        "department": teacher.department,
        "speciality": teacher.speciality,
        "photo": teacher.photo,
        "qr_code": teacher.qr_code
    }


# ==========================================
# CHANGER MOT DE PASSE
# ==========================================
@router.put("/password")
def change_password(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("teacher"))
):
    """Changer le mot de passe"""
    from app.core.security import verify_password, hash_password
    
    old_password = data.get("old_password")
    new_password = data.get("new_password")
    
    if not old_password or not new_password:
        raise HTTPException(status_code=400, detail="Ancien et nouveau mot de passe requis")
    
    if not verify_password(old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Ancien mot de passe incorrect")
    
    current_user.hashed_password = hash_password(new_password)
    db.commit()
    
    return {"message": "Mot de passe modifié avec succès"}


# ==========================================
# PRÉSENCES D'UN COURS
# ==========================================
@router.get("/courses/{course_id}/attendance")
def get_course_attendance(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("teacher"))
):
    """Présences des étudiants d'un cours"""
    from app.models.attendance import Attendance
    
    teacher = db.query(Teacher).filter(
        Teacher.user_id == current_user.id,
        Teacher.university_id == current_user.university_id
    ).first()
    
    if not teacher:
        raise HTTPException(status_code=404, detail="Profil enseignant non trouvé")
    
    course = db.query(Course).filter(
        Course.id == course_id,
        Course.teacher_id == teacher.id
    ).first()
    
    if not course:
        raise HTTPException(status_code=404, detail="Cours non trouvé")
    
    # Récupérer les étudiants
    students = db.query(Student).filter(
        Student.university_id == current_user.university_id,
        Student.level == course.level,
        Student.filiere == course.department
    ).all()
    
    result = []
    for student in students:
        # Dernière présence
        last_attendance = db.query(Attendance).filter(
            Attendance.student_id == student.id
        ).order_by(Attendance.created_at.desc()).first()
        
        if last_attendance:
            result.append({
                "student_id": student.id,
                "student_name": f"{student.first_name} {student.last_name}",
                "matricule": student.matricule,
                "status": last_attendance.status or "present",
                "date": last_attendance.date.isoformat() if last_attendance.date else None,
                "scan_time": last_attendance.created_at.isoformat() if last_attendance.created_at else None
            })
    
    return result

# ==========================================
# TOUS LES ÉTUDIANTS DE TOUS LES COURS
# ==========================================
@router.get("/students")
def get_all_students(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("teacher"))
):
    """Liste de tous les étudiants de tous les cours du teacher"""
    
    # Trouver l'enseignant
    teacher = db.query(Teacher).filter(
        Teacher.user_id == current_user.id,
        Teacher.university_id == current_user.university_id
    ).first()
    
    if not teacher:
        raise HTTPException(status_code=404, detail="Profil enseignant non trouvé")
    
    # Récupérer tous les cours du teacher
    courses = db.query(Course).filter(
        Course.teacher_id == teacher.id,
        Course.university_id == current_user.university_id
    ).all()
    
    # Collecter tous les étudiants uniques
    students_dict = {}
    for course in courses:
        students = db.query(Student).filter(
            Student.university_id == current_user.university_id,
            Student.level == course.level,
            Student.filiere == course.department
        ).all()
        
        for student in students:
            if student.id not in students_dict:
                students_dict[student.id] = {
                    "id": student.id,
                    "first_name": student.first_name,
                    "last_name": student.last_name,
                    "matricule": student.matricule,
                    "email": student.email,
                    "phone": student.phone,
                    "level": student.level,
                    "filiere": student.filiere,
                    "photo": student.photo,
                    "courses": []
                }
            
            # Ajouter le cours à la liste (sans doublon)
            course_info = {
                "id": course.id,
                "title": course.title,
                "code": course.code
            }
            if not any(c["id"] == course.id for c in students_dict[student.id]["courses"]):
                students_dict[student.id]["courses"].append(course_info)
    
    # Convertir en liste
    students_list = list(students_dict.values())
    
    # Ajouter des stats pour chaque étudiant
    for student in students_list:
        # Moyenne générale
        avg_grade = db.query(func.avg(Grade.score)).filter(
            Grade.student_id == student["id"],
            Grade.score.isnot(None)
        ).scalar() or 0
        
        # Taux de présence
        total_attendance = db.query(func.count(Attendance.id)).filter(
            Attendance.student_id == student["id"]
        ).scalar() or 0
        
        present_attendance = db.query(func.count(Attendance.id)).filter(
            Attendance.student_id == student["id"],
            Attendance.status.in_(["present", "late"])
        ).scalar() or 0
        
        attendance_rate = (present_attendance / total_attendance * 100) if total_attendance > 0 else 0
        
        student["average_grade"] = round(float(avg_grade), 2)
        student["attendance_rate"] = round(attendance_rate, 1)
    
    return students_list

# ==========================================
# LISTE DES RESSOURCES DU TEACHER
# ==========================================
@router.get("/materials")
def get_teacher_materials(
    course_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("teacher"))
):
    """Liste des ressources pédagogiques du teacher"""
    
    teacher = db.query(Teacher).filter(
        Teacher.user_id == current_user.id,
        Teacher.university_id == current_user.university_id
    ).first()
    
    if not teacher:
        raise HTTPException(status_code=404, detail="Profil enseignant non trouvé")
    
    query = db.query(Material).filter(
        Material.teacher_id == teacher.id,
        Material.university_id == current_user.university_id
    )
    
    if course_id:
        query = query.filter(Material.course_id == course_id)
    
    materials = query.order_by(Material.created_at.desc()).all()
    
    result = []
    for m in materials:
        course = db.query(Course).filter(Course.id == m.course_id).first() if m.course_id else None
        
        result.append({
            "id": m.id,
            "title": m.title,
            "description": m.description,
            "file_path": m.file_path,
            "file_type": m.file_type,
            "file_size": m.file_size,
            "original_name": m.original_name,
            "course_id": m.course_id,
            "course_title": course.title if course else None,
            "course_code": course.code if course else None,
            "visibility": m.visibility,
            "download_count": m.download_count,
            "created_at": m.created_at.isoformat() if m.created_at else None
        })
    
    return result


# ==========================================
# UPLOAD UNE RESSOURCE
# ==========================================
@router.post("/materials")
async def upload_material(
    title: str = Form(...),
    description: str = Form(None),
    course_id: int = Form(None),
    visibility: str = Form("students"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("teacher"))
):
    """Upload une ressource pédagogique"""
    
    teacher = db.query(Teacher).filter(
        Teacher.user_id == current_user.id,
        Teacher.university_id == current_user.university_id
    ).first()
    
    if not teacher:
        raise HTTPException(status_code=404, detail="Profil enseignant non trouvé")
    
    # Vérifier le cours si fourni
    if course_id:
        course = db.query(Course).filter(
            Course.id == course_id,
            Course.teacher_id == teacher.id
        ).first()
        if not course:
            raise HTTPException(status_code=404, detail="Cours non trouvé")
    
    # Vérifier le fichier
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="Fichier requis")
    
    # Déterminer le type de fichier
    ext = os.path.splitext(file.filename)[1].lower() if file.filename else ""
    type_map = {
        ".pdf": "pdf",
        ".doc": "docx", ".docx": "docx",
        ".ppt": "pptx", ".pptx": "pptx",
        ".xls": "xlsx", ".xlsx": "xlsx",
        ".mp4": "video", ".avi": "video", ".mov": "video",
        ".jpg": "image", ".jpeg": "image", ".png": "image", ".gif": "image",
        ".zip": "zip", ".rar": "zip"
    }
    file_type = type_map.get(ext, "other")
    
    # Créer le dossier
    os.makedirs("uploads/materials", exist_ok=True)
    
    # Générer un nom unique
    filename = f"material_{int(time.time())}_{teacher.id}{ext}"
    filepath = os.path.join("uploads/materials", filename)
    
    # Sauvegarder le fichier
    content = await file.read()
    file_size = len(content)
    
    # Vérifier la taille (max 50 Mo)
    if file_size > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Fichier trop volumineux (max 50 Mo)")
    
    with open(filepath, "wb") as buffer:
        buffer.write(content)
    
    # Créer l'entrée en base
    material = Material(
        title=title,
        description=description,
        file_path=filename,
        file_type=file_type,
        file_size=file_size,
        original_name=file.filename,
        course_id=course_id,
        teacher_id=teacher.id,
        university_id=current_user.university_id,
        visibility=visibility
    )
    db.add(material)
    db.commit()
    db.refresh(material)
    
    return {
        "id": material.id,
        "title": material.title,
        "file_path": material.file_path,
        "file_type": material.file_type,
        "file_size": material.file_size,
        "message": "Ressource uploadée avec succès"
    }


# ==========================================
# SUPPRIMER UNE RESSOURCE
# ==========================================
@router.delete("/materials/{material_id}")
def delete_material(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("teacher"))
):
    """Supprimer une ressource"""
    
    teacher = db.query(Teacher).filter(
        Teacher.user_id == current_user.id,
        Teacher.university_id == current_user.university_id
    ).first()
    
    if not teacher:
        raise HTTPException(status_code=404, detail="Profil enseignant non trouvé")
    
    material = db.query(Material).filter(
        Material.id == material_id,
        Material.teacher_id == teacher.id
    ).first()
    
    if not material:
        raise HTTPException(status_code=404, detail="Ressource non trouvée")
    
    # Supprimer le fichier physique
    if material.file_path:
        filepath = os.path.join("uploads/materials", material.file_path)
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
            except Exception as e:
                print(f"⚠️ Erreur suppression fichier: {e}")
    
    db.delete(material)
    db.commit()
    
    return {"message": "Ressource supprimée avec succès"}


# ==========================================
# INCRÉMENTER LE COMPTEUR DE TÉLÉCHARGEMENTS
# ==========================================
@router.post("/materials/{material_id}/download")
def increment_download(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("teacher", "student", "admin"))
):
    """Incrémente le compteur de téléchargements"""
    material = db.query(Material).filter(Material.id == material_id).first()
    if material:
        material.download_count = (material.download_count or 0) + 1
        db.commit()
    return {"message": "ok"}

# ==========================================
# LISTE DES DOCUMENTS DU TEACHER
# ==========================================
@router.get("/documents")
def get_teacher_documents(
    document_type: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("teacher"))
):
    """Liste des documents créés par le teacher"""
    from app.models.document import Document
    
    teacher = db.query(Teacher).filter(
        Teacher.user_id == current_user.id,
        Teacher.university_id == current_user.university_id
    ).first()
    
    if not teacher:
        raise HTTPException(status_code=404, detail="Profil enseignant non trouvé")
    
    query = db.query(Document).filter(
        Document.generated_by == current_user.id,
        Document.university_id == current_user.university_id
    )
    
    if document_type:
        query = query.filter(Document.document_type == document_type)
    
    documents = query.order_by(Document.created_at.desc()).all()
    
    result = []
    for doc in documents:
        student = None
        if doc.student_id:
            student = db.query(Student).filter(Student.id == doc.student_id).first()
        
        result.append({
            "id": doc.id,
            "document_type": doc.document_type,
            "title": doc.title,
            "description": doc.description,
            "file_path": doc.file_path,
            "student_id": doc.student_id,
            "student_name": f"{student.first_name} {student.last_name}" if student else None,
            "is_downloaded": doc.is_downloaded,
            "download_count": doc.download_count,
            "created_at": doc.created_at.isoformat() if doc.created_at else None
        })
    
    return result


# ==========================================
# UPLOAD UN DOCUMENT
# ==========================================
@router.post("/documents")
async def upload_document(
    title: str = Form(...),
    document_type: str = Form(...),
    description: str = Form(None),
    student_id: int = Form(None),
    file: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("teacher"))
):
    """Upload un document officiel"""
    from app.models.document import Document
    
    teacher = db.query(Teacher).filter(
        Teacher.user_id == current_user.id,
        Teacher.university_id == current_user.university_id
    ).first()
    
    if not teacher:
        raise HTTPException(status_code=404, detail="Profil enseignant non trouvé")
    
    # Vérifier le type de document
    valid_types = ["syllabus", "exam_report", "attendance_report", "grade_report", "other"]
    if document_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Type invalide. Types valides: {', '.join(valid_types)}")
    
    # Vérifier l'étudiant si fourni
    if student_id:
        student = db.query(Student).filter(
            Student.id == student_id,
            Student.university_id == current_user.university_id
        ).first()
        if not student:
            raise HTTPException(status_code=404, detail="Étudiant non trouvé")
    
    # Sauvegarder le fichier si fourni
    file_path = None
    if file and file.filename:
        os.makedirs("uploads/documents", exist_ok=True)
        ext = os.path.splitext(file.filename)[1] if file.filename else ".pdf"
        filename = f"doc_{int(time.time())}_{current_user.id}{ext}"
        filepath = os.path.join("uploads/documents", filename)
        
        content = await file.read()
        with open(filepath, "wb") as buffer:
            buffer.write(content)
        
        file_path = filename
    
    # Créer le document
    document = Document(
        document_type=document_type,
        title=title,
        description=description,
        file_path=file_path,
        student_id=student_id,
        generated_by=current_user.id,
        university_id=current_user.university_id
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    
    return {
        "id": document.id,
        "title": document.title,
        "document_type": document.document_type,
        "message": "Document créé avec succès"
    }


# ==========================================
# SUPPRIMER UN DOCUMENT
# ==========================================
@router.delete("/documents/{document_id}")
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("teacher"))
):
    """Supprimer un document"""
    from app.models.document import Document
    
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.generated_by == current_user.id
    ).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document non trouvé")
    
    # Supprimer le fichier physique
    if document.file_path:
        filepath = os.path.join("uploads/documents", document.file_path)
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
            except Exception as e:
                print(f"⚠️ Erreur suppression fichier: {e}")
    
    db.delete(document)
    db.commit()
    
    return {"message": "Document supprimé avec succès"}


# ==========================================
# GÉNÉRER UN DOCUMENT AUTOMATIQUE
# ==========================================
@router.post("/documents/generate/{type}")
def generate_document(
    type: str,  # syllabus, attendance_report, grade_report
    course_id: int = None,
    student_id: int = None,
    session_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("teacher"))
):
    """Génère automatiquement un document"""
    from app.models.document import Document
    
    teacher = db.query(Teacher).filter(
        Teacher.user_id == current_user.id,
        Teacher.university_id == current_user.university_id
    ).first()
    
    if not teacher:
        raise HTTPException(status_code=404, detail="Profil enseignant non trouvé")
    
    # Générer le contenu selon le type
    content = ""
    title = ""
    
    if type == "syllabus" and course_id:
        course = db.query(Course).filter(
            Course.id == course_id,
            Course.teacher_id == teacher.id
        ).first()
        if not course:
            raise HTTPException(status_code=404, detail="Cours non trouvé")
        
        title = f"Syllabus - {course.title}"
        content = f"""
SYLLABUS DU COURS : {course.title}
Code : {course.code}
Niveau : {course.level}
Filière : {course.department}
Crédits : {course.credits}
Volume horaire : {course.hours}h

Enseignant : {teacher.first_name} {teacher.last_name}

Description du cours :
[À compléter]

Objectifs pédagogiques :
[À compléter]

Contenu du cours :
[À compléter]

Évaluation :
[À compléter]
"""
    
    elif type == "attendance_report" and course_id:
        course = db.query(Course).filter(
            Course.id == course_id,
            Course.teacher_id == teacher.id
        ).first()
        if not course:
            raise HTTPException(status_code=404, detail="Cours non trouvé")
        
        title = f"Rapport de présence - {course.title}"
        # Ici on pourrait générer un vrai rapport avec les données
        content = f"Rapport de présence pour {course.title}"
    
    elif type == "grade_report" and session_id and course_id:
        course = db.query(Course).filter(
            Course.id == course_id,
            Course.teacher_id == teacher.id
        ).first()
        if not course:
            raise HTTPException(status_code=404, detail="Cours non trouvé")
        
        session = db.query(ExamSession).filter(ExamSession.id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session non trouvée")
        
        title = f"Relevé de notes - {course.title} - {session.name}"
        content = f"Relevé de notes pour {course.title} - {session.name}"
    
    else:
        raise HTTPException(status_code=400, detail="Type de document invalide ou paramètres manquants")
    
    # Créer le document
    document = Document(
        document_type=type,
        title=title,
        description=content[:200],
        generated_by=current_user.id,
        university_id=current_user.university_id
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    
    return {
        "id": document.id,
        "title": document.title,
        "content": content,
        "message": "Document généré avec succès"
    }