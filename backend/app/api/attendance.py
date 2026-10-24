from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date, datetime, timedelta, time
from sqlalchemy import func
import json
import re

from app.database.connection import get_db
from app.models.attendance import Attendance
from app.models.student import Student
from app.models.user import User
from app.models.course import Course
from app.core.dependencies import require_role

router = APIRouter(
    prefix="/attendance",
    tags=["Attendance"]
)

# ==========================================
# UTILITAIRES
# ==========================================

def extract_matricule(qr_data: str) -> str:
    """Extrait le matricule d'un QR code"""
    if not qr_data:
        return ""
    qr_data = qr_data.strip()
    try:
        data = json.loads(qr_data)
        if isinstance(data, dict):
            for key in ['matricule', 'matricule_id', 'student_matricule', 'id', 'code']:
                if key in data:
                    return str(data[key]).strip()
    except (json.JSONDecodeError, ValueError):
        pass
    
    url_pattern = r'/(EC-\d{4}-\d{4})$'
    match = re.search(url_pattern, qr_data)
    if match:
        return match.group(1)
    
    matricule_pattern = r'(EC-\d{4}-\d{4}|MAT-\d{4}-\d{4}|[A-Z]{2,3}-\d{4}-\d{4})'
    match = re.search(matricule_pattern, qr_data)
    if match:
        return match.group(1)
    
    if re.match(r'^[A-Z]{2,3}-\d{4}-\d{4}$', qr_data):
        return qr_data
    return qr_data

def get_late_threshold(db: Session, university_id: int) -> time:
    """Récupère l'heure limite de présence (défaut: 08:30)"""
    try:
        from app.models.academic_config import AcademicConfig
        config = db.query(AcademicConfig).filter(
            AcademicConfig.university_id == university_id
        ).first()
        if config and hasattr(config, 'late_threshold_time'):
            return config.late_threshold_time
    except Exception:
        pass
    return time(8, 30)

# ==========================================
# ROUTES EXISTANTES (GARDIEN / ADMIN)
# ==========================================

@router.get("/statistics")
def get_attendance_statistics(
    period: str = Query("week"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("guard", "admin", "secretary", "censeur", "teacher"))
):
    today = date.today()
    total_students = db.query(Student).filter(
        Student.university_id == current_user.university_id,
        Student.status == 'active'
    ).count()
    
    by_level = []
    levels = ['L1', 'L2', 'L3', 'M1', 'M2']
    for level in levels:
        level_students = db.query(Student).filter(
            Student.university_id == current_user.university_id,
            Student.level == level,
            Student.status == 'active'
        ).count()
        if level_students > 0:
            present_count = db.query(Attendance).join(Student).filter(
                Student.university_id == current_user.university_id,
                Student.level == level,
                Attendance.date >= today - timedelta(days=7),
                Attendance.status.in_(['present', 'late'])
            ).count()
            rate = (present_count / level_students * 100) if level_students > 0 else 0
            by_level.append({"level": level, "total": level_students, "present": present_count, "rate": min(rate, 100)})
    
    total_present = sum(level["present"] for level in by_level)
    attendance_rate = (total_present / total_students * 100) if total_students > 0 else 0
    
    return {
        "attendance_rate": attendance_rate,
        "total_students": total_students,
        "total_present": total_present,
        "total_absent": total_students - total_present,
        "by_level": by_level,
        "trends": {"best_day": "Lundi", "worst_day": "Vendredi", "weekly_avg": 75.0, "avg_late": 3},
        "period": period
    }

@router.get("/today/stats")
def get_today_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("guard", "admin", "secretary", "censeur", "teacher"))
):
    today = date.today()
    total_students = db.query(Student).filter(Student.university_id == current_user.university_id, Student.status == 'active').count()
    present = db.query(Attendance).filter(Attendance.university_id == current_user.university_id, Attendance.date == today, Attendance.status == 'present').count()
    late = db.query(Attendance).filter(Attendance.university_id == current_user.university_id, Attendance.date == today, Attendance.status == 'late').count()
    
    return {
        "total": total_students,
        "present": present,
        "absent": total_students - present - late,
        "late": late,
        "attendance_rate": ((present + late) / total_students * 100) if total_students > 0 else 0
    }

@router.get("/recent")
def get_recent_scans(
    limit: int = Query(5),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("guard", "admin", "secretary", "teacher", "censeur"))
):
    today = date.today()
    attendances = (
        db.query(Attendance, Student)
        .join(Student, Attendance.student_id == Student.id)
        .filter(Student.university_id == current_user.university_id, Attendance.date == today)
        .order_by(Attendance.check_in_time.desc())
        .limit(limit)
        .all()
    )
    result = []
    for attendance, student in attendances:
        result.append({
            "id": attendance.id,
            "student_id": student.id,
            "student_name": f"{student.first_name} {student.last_name}",
            "matricule": student.matricule,
            "level": student.level,
            "class_name": student.filiere,
            "status": attendance.status or "present",
            "scan_time": datetime.combine(attendance.date, attendance.check_in_time).isoformat() if attendance.date and attendance.check_in_time else None
        })
    return result

@router.get("/history")
def get_attendance_history(
    start_date: str = Query(None),
    end_date: str = Query(None),
    student_id: int = Query(None),
    limit: int = Query(100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("guard", "admin", "secretary", "censeur", "teacher"))
):
    query = db.query(Attendance, Student).join(Student, Attendance.student_id == Student.id).filter(
        Student.university_id == current_user.university_id,
        Attendance.university_id == current_user.university_id
    )
    if start_date:
        try: query = query.filter(Attendance.date >= date.fromisoformat(start_date))
        except ValueError: pass
    if end_date:
        try: query = query.filter(Attendance.date <= date.fromisoformat(end_date))
        except ValueError: pass
    if student_id:
        query = query.filter(Attendance.student_id == student_id)
    
    attendances = query.order_by(Attendance.date.desc(), Attendance.check_in_time.desc()).limit(limit).all()
    result = []
    for attendance, student in attendances:
        scanner_name = None
        if attendance.scanned_by:
            scanner = db.query(User).filter(User.id == attendance.scanned_by).first()
            if scanner: scanner_name = scanner.full_name
        
        result.append({
            "id": attendance.id,
            "student_id": student.id,
            "student_name": f"{student.first_name} {student.last_name}",
            "matricule": student.matricule,
            "level": student.level,
            "class_name": student.filiere,
            "status": attendance.status or "present",
            "method": attendance.method or "manual",
            "scan_time": datetime.combine(attendance.date, attendance.check_in_time).isoformat() if attendance.date and attendance.check_in_time else None,
            "date": attendance.date.isoformat() if attendance.date else None,
            "scanned_by": scanner_name
        })
    return result

@router.get("/")
def get_attendances(
    date_filter: str = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("guard", "admin", "secretary"))
):
    query = db.query(Attendance, Student).join(Student, Attendance.student_id == Student.id).filter(
        Student.university_id == current_user.university_id
    )
    if date_filter:
        try: query = query.filter(Attendance.date == date.fromisoformat(date_filter))
        except ValueError: pass
    
    attendances = query.order_by(Attendance.created_at.desc()).all()
    result = []
    for attendance, student in attendances:
        result.append({
            "id": attendance.id,
            "student_id": student.id,
            "student_name": f"{student.first_name} {student.last_name}",
            "matricule": student.matricule,
            "level": student.level,
            "class_name": student.filiere,
            "course": getattr(attendance, 'course', 'General Course'),
            "status": attendance.status or "present",
            "scan_time": attendance.created_at.isoformat() if attendance.created_at else None,
            "created_at": attendance.created_at.isoformat() if attendance.created_at else None
        })
    return result

@router.put("/{attendance_id}/status")
def update_attendance_status(
    attendance_id: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "censeur"))
):
    new_status = data.get("status")
    if new_status not in ["present", "late", "absent", "excused"]:
        raise HTTPException(status_code=400, detail="Statut invalide")
    
    attendance = db.query(Attendance).filter(Attendance.id == attendance_id, Attendance.university_id == current_user.university_id).first()
    if not attendance:
        raise HTTPException(status_code=404, detail="Présence non trouvée")
    
    old_status = attendance.status
    attendance.status = new_status
    db.commit()
    return {"message": f"Statut modifié : {old_status} → {new_status}", "attendance_id": attendance.id}

@router.post("/scan")
def scan_qr_code(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("guard", "admin", "secretary"))
):
    qr_data = data.get("matricule", "").strip()
    if not qr_data:
        raise HTTPException(status_code=400, detail="QR code requis")
    
    matricule = extract_matricule(qr_data)
    student = db.query(Student).filter(Student.matricule == matricule, Student.university_id == current_user.university_id).first()
    if not student:
        raise HTTPException(status_code=404, detail=f"Étudiant non trouvé : {matricule}")
    
    now = datetime.now()
    late_threshold = get_late_threshold(db, current_user.university_id)
    status = "present" if now.time() <= late_threshold else "late"
    
    today = date.today()
    existing = db.query(Attendance).filter(
        Attendance.student_id == student.id,
        Attendance.date == today,
        Attendance.university_id == current_user.university_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail=f"{student.first_name} {student.last_name} a déjà été scanné aujourd'hui")
    
    attendance = Attendance(
        student_id=student.id,
        date=today,
        check_in_time=now.time(),
        status=status,
        method="qr_code",
        scanned_by=current_user.id,
        university_id=current_user.university_id
    )
    db.add(attendance)
    db.commit()
    db.refresh(attendance)
    
    return {
        "student_id": student.id,
        "student_name": f"{student.first_name} {student.last_name}",
        "matricule": student.matricule,
        "class_name": student.filiere,
        "level": student.level,
        "status": status,
        "scan_time": now.isoformat()
    }

# ==========================================
# ✅ NOUVELLES ROUTES (ÉTUDIANT & ENSEIGNANT)
# ==========================================

@router.get("/me/courses")
def get_my_course_attendance(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student"))
):
    """Récupère les statistiques de présence de l'étudiant, groupées par module (Ignore les scans gardien)"""
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Profil étudiant non trouvé")

    # Filtre crucial : on ne prend que les présences liées à un cours (faites par les profs)
    attendances = db.query(Attendance).filter(
        Attendance.student_id == student.id,
        Attendance.course_id.isnot(None)
    ).all()

    course_stats = {}
    for att in attendances:
        cid = att.course_id
        if cid not in course_stats:
            course = db.query(Course).filter(Course.id == cid).first()
            course_stats[cid] = {
                "course_id": cid,
                "course_name": getattr(course, 'title', getattr(course, 'name', 'Module')) if course else "Module",
                "total": 0, "present": 0, "late": 0, "absent": 0, "excused": 0
            }
        
        course_stats[cid]["total"] += 1
        if att.status == "present": course_stats[cid]["present"] += 1
        elif att.status == "late": course_stats[cid]["late"] += 1
        elif att.status == "absent": course_stats[cid]["absent"] += 1
        elif att.status == "excused": course_stats[cid]["excused"] += 1

    result = []
    for stats in course_stats.values():
        valid_attendance = stats["present"] + stats["late"] + stats["excused"]
        rate = round((valid_attendance / stats["total"]) * 100, 1) if stats["total"] > 0 else 100.0
        result.append({**stats, "rate": rate})

    result.sort(key=lambda x: x["rate"]) # Trier par taux le plus bas en premier
    return result


# ==========================================
# ✅ NOUVEL ENDPOINT : COURS DE L'ENSEIGNANT CONNECTÉ
# ==========================================
@router.get("/teacher/courses")
def get_teacher_courses(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("teacher", "admin", "secretary", "censeur"))
):
    """Récupère uniquement les cours assignés à l'enseignant connecté, ou tous les cours pour le staff"""
    from app.models.teacher import Teacher
    
    user_role = (current_user.role or "").lower()
    is_staff = user_role in ["admin", "secretary", "secretaire", "censeur", "censor"]
    
    teacher = db.query(Teacher).filter(Teacher.user_id == current_user.id).first()
    if not teacher or is_staff:
        if is_staff:
            courses = db.query(Course).filter(Course.university_id == current_user.university_id).all()
        elif not teacher:
            raise HTTPException(status_code=404, detail="Profil enseignant non trouvé")
        else:
            courses = db.query(Course).filter(
                Course.teacher_id == teacher.id,
                Course.university_id == current_user.university_id
            ).all()
    else:
        courses = db.query(Course).filter(
            Course.teacher_id == teacher.id,
            Course.university_id == current_user.university_id
        ).all()

    result = []
    for c in courses:
        filiere_name = ""
        if hasattr(c, 'filiere') and c.filiere:
            filiere_name = getattr(c.filiere, 'name', str(c.filiere))
        elif hasattr(c, 'department') and c.department:
            filiere_name = c.department
        
        result.append({
            "id": c.id,
            "title": getattr(c, 'title', getattr(c, 'name', 'Cours sans titre')),
            "filiere": filiere_name or "N/A",
            "level": getattr(c, 'level', 'N/A')
        })

    return result

@router.get("/course/{course_id}/roster")
def get_course_roster(
    course_id: int,
    date: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("teacher", "admin", "secretary", "censeur"))
):
    """Récupère la liste des étudiants d'un cours pour faire l'appel"""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Cours non trouvé")

    filiere_name = ""
    if hasattr(course, 'filiere') and course.filiere:
        filiere_name = getattr(course.filiere, 'name', str(course.filiere))
    elif hasattr(course, 'department') and course.department:
        filiere_name = course.department

    query = db.query(Student).filter(
        Student.level == course.level,
        Student.university_id == current_user.university_id
    )
    if filiere_name:
        query = query.filter(Student.filiere.ilike(f"%{filiere_name}%"))

    students = query.order_by(Student.last_name, Student.first_name).all()

    target_date = datetime.strptime(date, "%Y-%m-%d").date()
    existing_attendance = db.query(Attendance).filter(
        Attendance.course_id == course_id,
        Attendance.date == target_date
    ).all()
    
    attendance_map = {att.student_id: att.status for att in existing_attendance}

    roster = []
    for s in students:
        roster.append({
            "student_id": s.id,
            "student_name": f"{s.first_name} {s.last_name}",
            "matricule": s.matricule,
            "current_status": attendance_map.get(s.id, "present")
        })

    return {
        "course_name": getattr(course, 'title', getattr(course, 'name', 'Cours')),
        "date": date,
        "students": roster
    }


@router.post("/mark-bulk")
def mark_bulk_attendance(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("teacher", "admin", "secretary", "censeur"))
):
    """Enregistre l'appel d'un cours pour une date donnée sans restriction d'heure"""
    course_id = data.get("course_id")
    date_str = data.get("date")
    records = data.get("records", [])

    if not course_id or not date_str or not records:
        raise HTTPException(status_code=400, detail="Données incomplètes")

    target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    current_time = datetime.now().time()

    for record in records:
        student_id = record.get("student_id")
        status = record.get("status", "present")
        comment = record.get("comment", "")

        existing = db.query(Attendance).filter(
            Attendance.student_id == student_id,
            Attendance.course_id == course_id,
            Attendance.date == target_date
        ).first()

        if existing:
            existing.status = status
            existing.comment = comment
            existing.scanned_by = current_user.id
            if not existing.check_in_time and status in ["present", "late"]:
                existing.check_in_time = current_time
        else:
            new_att = Attendance(
                student_id=student_id,
                course_id=course_id,
                date=target_date,
                check_in_time=current_time if status in ["present", "late"] else None,
                status=status,
                comment=comment,
                method="teacher_appel",
                scanned_by=current_user.id,
                university_id=current_user.university_id
            )
            db.add(new_att)

    db.commit()
    return {"message": "Appel enregistré avec succès"}


# ==========================================
# ⚙️ CONFIGURATION DES PRÉSENCES
# ==========================================

@router.get("/config")
def get_attendance_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "censeur", "secretary", "guard"))
):
    """Récupère la configuration de seuil de présence"""
    from app.models.academic_config import AcademicConfig
    config = db.query(AcademicConfig).filter(
        AcademicConfig.university_id == current_user.university_id
    ).first()
    
    threshold_str = "08:30"
    if config and config.late_threshold_time:
        threshold_str = config.late_threshold_time.strftime("%H:%M")
        
    return {
        "late_threshold": threshold_str,
        "min_attendance_rate": getattr(config, 'min_attendance_rate', 75.0) if config else 75.0
    }

@router.put("/config")
def update_attendance_config(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "censeur", "secretary"))
):
    """Met à jour le seuil d'heure de retard et le taux minimum"""
    from app.models.academic_config import AcademicConfig
    config = db.query(AcademicConfig).filter(
        AcademicConfig.university_id == current_user.university_id
    ).first()
    
    if not config:
        config = AcademicConfig(university_id=current_user.university_id)
        db.add(config)
        db.flush()
        
    late_threshold = data.get("late_threshold")
    if late_threshold:
        try:
            parts = str(late_threshold).strip().split(":")
            h, m = int(parts[0]), int(parts[1])
            config.late_threshold_time = time(h, m)
        except Exception:
            raise HTTPException(status_code=400, detail="Format d'heure invalide (ex: 08:30)")
            
    if "min_attendance_rate" in data:
        config.min_attendance_rate = float(data["min_attendance_rate"])
        
    db.commit()
    return {
        "message": "Configuration sauvegardée avec succès",
        "late_threshold": config.late_threshold_time.strftime("%H:%M") if config.late_threshold_time else "08:30",
        "min_attendance_rate": config.min_attendance_rate
    }