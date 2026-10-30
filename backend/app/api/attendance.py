from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List, Dict, Any
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
from app.models.schedule import Schedule
from app.models.teacher import Teacher
from app.core.dependencies import require_role

router = APIRouter(
    prefix="/attendance",
    tags=["Attendance"]
)

# ==========================================
# UTILITAIRES
# ==========================================

# Jours de la semaine en français
DAYS_FR = {
    0: "Lundi", 1: "Mardi", 2: "Mercredi",
    3: "Jeudi", 4: "Vendredi", 5: "Samedi", 6: "Dimanche"
}

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


def get_current_schedule_for_student(db: Session, student: Student, university_id: int, now: datetime = None):
    """
    Trouve le créneau horaire en cours ou le plus proche pour un étudiant
    en se basant sur son emploi du temps (filière + niveau).
    Retourne (schedule, is_late, late_minutes) ou (None, False, 0)
    """
    if now is None:
        now = datetime.now()
    
    current_day = DAYS_FR.get(now.weekday(), "")
    current_time_str = now.strftime("%H:%M")
    
    # Chercher les créneaux du jour pour cette filière/niveau
    from app.models.class_room import ClassRoom
    
    # Trouver la classe de l'étudiant
    class_rooms = db.query(ClassRoom).filter(
        ClassRoom.university_id == university_id
    ).all()
    
    matching_class_ids = []
    for cr in class_rooms:
        if cr.level == student.level:
            # Vérifier la filière
            if cr.filiere_id and hasattr(student, 'filiere_id') and student.filiere_id:
                if cr.filiere_id == student.filiere_id:
                    matching_class_ids.append(cr.id)
            elif hasattr(cr, 'filiere') and cr.filiere and hasattr(student, 'filiere') and student.filiere:
                filiere_name = getattr(cr.filiere, 'name', '')
                if filiere_name and student.filiere and filiere_name.lower() in student.filiere.lower():
                    matching_class_ids.append(cr.id)
            else:
                matching_class_ids.append(cr.id)
    
    if not matching_class_ids:
        # Fallback : chercher tous les schedules du jour pour ce niveau
        matching_class_ids = [cr.id for cr in class_rooms if cr.level == student.level]
    
    # Chercher les créneaux du jour
    schedules = db.query(Schedule).filter(
        Schedule.university_id == university_id,
        Schedule.day_of_week == current_day,
        Schedule.class_id.in_(matching_class_ids) if matching_class_ids else Schedule.id > 0
    ).order_by(Schedule.start_time).all()
    
    if not schedules:
        return None, False, 0
    
    # Trouver le créneau en cours ou le plus récent
    best_schedule = None
    for s in schedules:
        start = s.start_time  # "08:00"
        end = s.end_time      # "10:00"
        
        # Si on est dans la plage du cours (avec 15 min de tolérance après la fin)
        if start <= current_time_str <= end or (current_time_str > end and current_time_str <= _add_minutes(end, 15)):
            best_schedule = s
            break
        # Si on est avant le cours mais proche (30 min avant)
        elif current_time_str < start and current_time_str >= _sub_minutes(start, 30):
            best_schedule = s
            break
    
    # Si aucun créneau trouvé en cours, prendre le plus proche passé
    if not best_schedule:
        for s in reversed(schedules):
            if current_time_str >= s.start_time:
                best_schedule = s
                break
    
    # Si toujours rien, prendre le premier de la journée
    if not best_schedule and schedules:
        best_schedule = schedules[0]
    
    if best_schedule:
        is_late = current_time_str > best_schedule.start_time
        late_minutes = 0
        if is_late:
            try:
                start_parts = best_schedule.start_time.split(":")
                start_h, start_m = int(start_parts[0]), int(start_parts[1])
                now_h, now_m = now.hour, now.minute
                late_minutes = (now_h * 60 + now_m) - (start_h * 60 + start_m)
                if late_minutes < 0:
                    late_minutes = 0
            except:
                late_minutes = 0
        
        return best_schedule, is_late, late_minutes
    
    return None, False, 0


def get_current_schedule_for_teacher(db: Session, teacher_id: int, university_id: int, now: datetime = None):
    """
    Trouve le créneau horaire en cours pour un enseignant.
    Retourne (schedule, is_late, late_minutes)
    """
    if now is None:
        now = datetime.now()
    
    current_day = DAYS_FR.get(now.weekday(), "")
    current_time_str = now.strftime("%H:%M")
    
    schedules = db.query(Schedule).filter(
        Schedule.university_id == university_id,
        Schedule.day_of_week == current_day,
        Schedule.teacher_id == teacher_id
    ).order_by(Schedule.start_time).all()
    
    if not schedules:
        return None, False, 0
    
    best_schedule = None
    for s in schedules:
        start = s.start_time
        end = s.end_time
        
        if start <= current_time_str <= end or (current_time_str > end and current_time_str <= _add_minutes(end, 15)):
            best_schedule = s
            break
        elif current_time_str < start and current_time_str >= _sub_minutes(start, 30):
            best_schedule = s
            break
    
    if not best_schedule:
        for s in reversed(schedules):
            if current_time_str >= s.start_time:
                best_schedule = s
                break
    
    if not best_schedule and schedules:
        best_schedule = schedules[0]
    
    if best_schedule:
        is_late = current_time_str > best_schedule.start_time
        late_minutes = 0
        if is_late:
            try:
                start_parts = best_schedule.start_time.split(":")
                start_h, start_m = int(start_parts[0]), int(start_parts[1])
                now_h, now_m = now.hour, now.minute
                late_minutes = (now_h * 60 + now_m) - (start_h * 60 + start_m)
                if late_minutes < 0:
                    late_minutes = 0
            except:
                late_minutes = 0
        
        return best_schedule, is_late, late_minutes
    
    return None, False, 0


def _add_minutes(time_str: str, minutes: int) -> str:
    """Ajoute des minutes à une heure format HH:MM"""
    try:
        parts = time_str.split(":")
        h, m = int(parts[0]), int(parts[1])
        total = h * 60 + m + minutes
        return f"{total // 60:02d}:{total % 60:02d}"
    except:
        return time_str


def _sub_minutes(time_str: str, minutes: int) -> str:
    """Soustrait des minutes d'une heure format HH:MM"""
    try:
        parts = time_str.split(":")
        h, m = int(parts[0]), int(parts[1])
        total = max(0, h * 60 + m - minutes)
        return f"{total // 60:02d}:{total % 60:02d}"
    except:
        return time_str


def _calc_effective_hours(schedule, late_minutes: int) -> float:
    """Calcule les heures effectives après soustraction du retard"""
    try:
        start_parts = schedule.start_time.split(":")
        end_parts = schedule.end_time.split(":")
        start_total = int(start_parts[0]) * 60 + int(start_parts[1])
        end_total = int(end_parts[0]) * 60 + int(end_parts[1])
        total_minutes = end_total - start_total
        effective_minutes = max(0, total_minutes - late_minutes)
        return round(effective_minutes / 60, 2)
    except:
        return 0


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
                Attendance.status.in_(['present', 'late']),
                Attendance.attendance_type == 'student'
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

@router.get("/stats")
@router.get("/today/stats")
def get_today_stats(
    date_param: Optional[str] = Query(None, alias="date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("guard", "admin", "secretary", "censeur", "teacher"))
):
    target_date = date.today()
    if date_param:
        try:
            target_date = datetime.strptime(date_param, "%Y-%m-%d").date()
        except Exception:
            pass
    total_students = db.query(Student).filter(Student.university_id == current_user.university_id, Student.status == 'active').count()
    present = db.query(Attendance).filter(Attendance.university_id == current_user.university_id, Attendance.date == target_date, Attendance.status == 'present', Attendance.attendance_type == 'student').count()
    late = db.query(Attendance).filter(Attendance.university_id == current_user.university_id, Attendance.date == target_date, Attendance.status == 'late', Attendance.attendance_type == 'student').count()
    
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
        .filter(Student.university_id == current_user.university_id, Attendance.date == today, Attendance.attendance_type == 'student')
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
            "late_minutes": attendance.late_minutes or 0,
            "expected_start": attendance.expected_start_time,
            "scan_time": datetime.combine(attendance.date, attendance.check_in_time).isoformat() if attendance.date and attendance.check_in_time else None
        })
    return result

@router.get("/history")
def get_attendance_history(
    start_date: str = Query(None),
    end_date: str = Query(None),
    student_id: int = Query(None),
    attendance_type: str = Query(None),
    limit: int = Query(100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("guard", "admin", "secretary", "censeur", "teacher"))
):
    query = db.query(Attendance, Student).join(Student, Attendance.student_id == Student.id, isouter=True).filter(
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
    if attendance_type:
        query = query.filter(Attendance.attendance_type == attendance_type)
    
    attendances = query.order_by(Attendance.date.desc(), Attendance.check_in_time.desc()).limit(limit).all()
    result = []
    for attendance, student in attendances:
        scanner_name = None
        if attendance.scanned_by:
            scanner = db.query(User).filter(User.id == attendance.scanned_by).first()
            if scanner: scanner_name = scanner.full_name
        
        student_name = ""
        matricule = ""
        level = ""
        filiere = ""
        
        if student:
            student_name = f"{student.first_name} {student.last_name}"
            matricule = student.matricule
            level = student.level
            filiere = student.filiere
        elif attendance.teacher_id:
            teacher = db.query(Teacher).filter(Teacher.id == attendance.teacher_id).first()
            if teacher:
                student_name = f"{teacher.first_name} {teacher.last_name}"
                matricule = f"PROF-{teacher.id}"
                level = "Enseignant"
                filiere = teacher.department or ""
        
        result.append({
            "id": attendance.id,
            "student_id": getattr(student, 'id', None) if student else None,
            "teacher_id": attendance.teacher_id,
            "student_name": student_name,
            "matricule": matricule,
            "level": level,
            "class_name": filiere,
            "status": attendance.status or "present",
            "method": attendance.method or "manual",
            "attendance_type": attendance.attendance_type or "student",
            "late_minutes": attendance.late_minutes or 0,
            "expected_start": attendance.expected_start_time,
            "expected_end": attendance.expected_end_time,
            "effective_hours": attendance.effective_hours,
            "scan_time": datetime.combine(attendance.date, attendance.check_in_time).isoformat() if attendance.date and attendance.check_in_time else None,
            "date": attendance.date.isoformat() if attendance.date else None,
            "scanned_by": scanner_name
        })
    return result

@router.get("/")
def get_attendances(
    date_filter: str = Query(None),
    attendance_type: str = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("guard", "admin", "secretary"))
):
    query = db.query(Attendance, Student).join(Student, Attendance.student_id == Student.id, isouter=True).filter(
        Attendance.university_id == current_user.university_id
    )
    if date_filter:
        try: query = query.filter(Attendance.date == date.fromisoformat(date_filter))
        except ValueError: pass
    if attendance_type:
        query = query.filter(Attendance.attendance_type == attendance_type)
    
    attendances = query.order_by(Attendance.created_at.desc()).all()
    result = []
    for attendance, student in attendances:
        student_name = ""
        matricule = ""
        level = ""
        filiere = ""
        
        if student:
            student_name = f"{student.first_name} {student.last_name}"
            matricule = student.matricule
            level = student.level
            filiere = student.filiere
        elif attendance.teacher_id:
            teacher = db.query(Teacher).filter(Teacher.id == attendance.teacher_id).first()
            if teacher:
                student_name = f"Prof. {teacher.first_name} {teacher.last_name}"
                matricule = f"PROF-{teacher.id}"
                level = "Enseignant"
                filiere = teacher.department or ""
        
        result.append({
            "id": attendance.id,
            "student_id": getattr(student, 'id', None) if student else None,
            "teacher_id": attendance.teacher_id,
            "student_name": student_name,
            "matricule": matricule,
            "level": level,
            "class_name": filiere,
            "course": getattr(attendance, 'course', 'General Course'),
            "status": attendance.status or "present",
            "attendance_type": attendance.attendance_type or "student",
            "late_minutes": attendance.late_minutes or 0,
            "expected_start": attendance.expected_start_time,
            "effective_hours": attendance.effective_hours,
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


# ==========================================
# ✅ SCAN ÉTUDIANT (basé sur l'emploi du temps)
# ==========================================

@router.post("/scan")
def scan_qr_code(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("guard", "admin", "secretary"))
):
    """Scan QR étudiant - le statut present/late est basé sur l'emploi du temps de l'étudiant"""
    qr_data = data.get("matricule", "").strip()
    if not qr_data:
        raise HTTPException(status_code=400, detail="QR code requis")
    
    matricule = extract_matricule(qr_data)
    student = db.query(Student).filter(Student.matricule == matricule, Student.university_id == current_user.university_id).first()
    if not student:
        raise HTTPException(status_code=404, detail=f"Étudiant non trouvé : {matricule}")
    
    now = datetime.now()
    today = date.today()
    
    # Chercher le créneau en cours dans l'emploi du temps de l'étudiant
    schedule, is_late, late_minutes = get_current_schedule_for_student(db, student, current_user.university_id, now)
    
    # Déterminer le statut basé sur l'emploi du temps
    if schedule:
        status = "late" if is_late and late_minutes > 0 else "present"
    else:
        # Pas de créneau trouvé, on accepte quand même le scan
        status = "present"
    
    # Vérifier doublon (même étudiant, même jour, même créneau si existant)
    existing_query = db.query(Attendance).filter(
        Attendance.student_id == student.id,
        Attendance.date == today,
        Attendance.university_id == current_user.university_id,
        Attendance.attendance_type == 'student'
    )
    if schedule:
        existing_query = existing_query.filter(Attendance.schedule_id == schedule.id)
    
    existing = existing_query.first()
    
    if existing:
        msg = f"{student.first_name} {student.last_name} a déjà été scanné"
        if schedule:
            course = db.query(Course).filter(Course.id == schedule.course_id).first()
            course_name = getattr(course, 'title', 'ce cours') if course else 'ce cours'
            msg += f" pour {course_name}"
        raise HTTPException(status_code=400, detail=msg)
    
    attendance = Attendance(
        student_id=student.id,
        date=today,
        check_in_time=now.time(),
        status=status,
        method="qr_code",
        attendance_type="student",
        scanned_by=current_user.id,
        university_id=current_user.university_id,
        schedule_id=schedule.id if schedule else None,
        course_id=schedule.course_id if schedule else None,
        expected_start_time=schedule.start_time if schedule else None,
        expected_end_time=schedule.end_time if schedule else None,
        late_minutes=late_minutes if is_late else 0
    )
    db.add(attendance)
    db.commit()
    db.refresh(attendance)
    
    # Récupérer le nom du cours
    course_name = None
    if schedule and schedule.course_id:
        course = db.query(Course).filter(Course.id == schedule.course_id).first()
        course_name = getattr(course, 'title', None) if course else None
    
    return {
        "student_id": student.id,
        "student_name": f"{student.first_name} {student.last_name}",
        "matricule": student.matricule,
        "class_name": student.filiere,
        "level": student.level,
        "status": status,
        "late_minutes": late_minutes if is_late else 0,
        "course_name": course_name,
        "expected_start": schedule.start_time if schedule else None,
        "scan_time": now.isoformat()
    }


# ==========================================
# ✅ SCAN ENSEIGNANT (suivi de ponctualité)
# ==========================================

@router.post("/teacher/scan")
def scan_teacher(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("guard", "admin", "secretary"))
):
    """Scan QR enseignant - enregistre la ponctualité et calcule les heures effectives"""
    qr_data = data.get("teacher_id", data.get("matricule", "")).strip()
    if not qr_data:
        raise HTTPException(status_code=400, detail="Identifiant enseignant requis")
    
    # Extraire l'ID enseignant du QR code
    teacher_id = None
    if qr_data.startswith("TEACHER-"):
        try:
            teacher_id = int(qr_data.replace("TEACHER-", ""))
        except ValueError:
            pass
    elif qr_data.isdigit():
        teacher_id = int(qr_data)
    
    if not teacher_id:
        raise HTTPException(status_code=400, detail=f"Format QR enseignant invalide : {qr_data}")
    
    teacher = db.query(Teacher).filter(
        Teacher.id == teacher_id,
        Teacher.university_id == current_user.university_id
    ).first()
    if not teacher:
        raise HTTPException(status_code=404, detail=f"Enseignant non trouvé (ID: {teacher_id})")
    
    now = datetime.now()
    today = date.today()
    
    # Chercher le créneau en cours pour cet enseignant
    schedule, is_late, late_minutes = get_current_schedule_for_teacher(db, teacher.id, current_user.university_id, now)
    
    if schedule:
        status = "late" if is_late and late_minutes > 0 else "present"
        effective_hours = _calc_effective_hours(schedule, late_minutes if is_late else 0)
    else:
        status = "present"
        effective_hours = None
    
    # Vérifier doublon
    existing = db.query(Attendance).filter(
        Attendance.teacher_id == teacher.id,
        Attendance.date == today,
        Attendance.university_id == current_user.university_id,
        Attendance.attendance_type == 'teacher',
        Attendance.schedule_id == (schedule.id if schedule else None)
    ).first()
    
    if existing:
        course = db.query(Course).filter(Course.id == schedule.course_id).first() if schedule else None
        course_name = getattr(course, 'title', 'ce créneau') if course else 'ce créneau'
        raise HTTPException(
            status_code=400,
            detail=f"Prof. {teacher.first_name} {teacher.last_name} a déjà été scanné pour {course_name}"
        )
    
    attendance = Attendance(
        teacher_id=teacher.id,
        date=today,
        check_in_time=now.time(),
        status=status,
        method="qr_code",
        attendance_type="teacher",
        scanned_by=current_user.id,
        university_id=current_user.university_id,
        schedule_id=schedule.id if schedule else None,
        course_id=schedule.course_id if schedule else None,
        expected_start_time=schedule.start_time if schedule else None,
        expected_end_time=schedule.end_time if schedule else None,
        late_minutes=late_minutes if is_late else 0,
        effective_hours=effective_hours
    )
    db.add(attendance)
    db.commit()
    db.refresh(attendance)
    
    course_name = None
    if schedule and schedule.course_id:
        course = db.query(Course).filter(Course.id == schedule.course_id).first()
        course_name = getattr(course, 'title', None) if course else None
    
    return {
        "teacher_id": teacher.id,
        "teacher_name": f"{teacher.first_name} {teacher.last_name}",
        "department": teacher.department,
        "status": status,
        "late_minutes": late_minutes if is_late else 0,
        "effective_hours": effective_hours,
        "expected_start": schedule.start_time if schedule else None,
        "expected_end": schedule.end_time if schedule else None,
        "course_name": course_name,
        "scan_time": now.isoformat()
    }


# ==========================================
# ✅ STATISTIQUES ENSEIGNANTS
# ==========================================

@router.get("/teacher/stats")
def get_teacher_attendance_stats(
    teacher_id: int = Query(None),
    start_date: str = Query(None),
    end_date: str = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "censeur", "secretary", "guard"))
):
    """Statistiques de ponctualité des enseignants"""
    query = db.query(Attendance).filter(
        Attendance.university_id == current_user.university_id,
        Attendance.attendance_type == 'teacher'
    )
    
    if teacher_id:
        query = query.filter(Attendance.teacher_id == teacher_id)
    if start_date:
        try: query = query.filter(Attendance.date >= date.fromisoformat(start_date))
        except: pass
    if end_date:
        try: query = query.filter(Attendance.date <= date.fromisoformat(end_date))
        except: pass
    
    attendances = query.all()
    
    # Grouper par enseignant
    teacher_stats = {}
    for att in attendances:
        tid = att.teacher_id
        if tid not in teacher_stats:
            teacher = db.query(Teacher).filter(Teacher.id == tid).first()
            teacher_stats[tid] = {
                "teacher_id": tid,
                "teacher_name": f"{teacher.first_name} {teacher.last_name}" if teacher else "Inconnu",
                "department": teacher.department if teacher else "",
                "total_scans": 0,
                "on_time": 0,
                "late_count": 0,
                "total_late_minutes": 0,
                "total_effective_hours": 0,
                "total_expected_hours": 0
            }
        
        teacher_stats[tid]["total_scans"] += 1
        if att.status == "present":
            teacher_stats[tid]["on_time"] += 1
        elif att.status == "late":
            teacher_stats[tid]["late_count"] += 1
        
        teacher_stats[tid]["total_late_minutes"] += att.late_minutes or 0
        if att.effective_hours:
            teacher_stats[tid]["total_effective_hours"] += att.effective_hours
        
        # Calculer heures attendues
        if att.expected_start_time and att.expected_end_time:
            try:
                s_parts = att.expected_start_time.split(":")
                e_parts = att.expected_end_time.split(":")
                expected_h = (int(e_parts[0]) * 60 + int(e_parts[1]) - int(s_parts[0]) * 60 - int(s_parts[1])) / 60
                teacher_stats[tid]["total_expected_hours"] += expected_h
            except:
                pass
    
    # Calculer les taux
    result = []
    for stats in teacher_stats.values():
        stats["punctuality_rate"] = round(
            (stats["on_time"] / stats["total_scans"] * 100) if stats["total_scans"] > 0 else 100, 1
        )
        stats["total_effective_hours"] = round(stats["total_effective_hours"], 2)
        stats["total_expected_hours"] = round(stats["total_expected_hours"], 2)
        stats["hours_lost"] = round(stats["total_expected_hours"] - stats["total_effective_hours"], 2)
        result.append(stats)
    
    result.sort(key=lambda x: x["punctuality_rate"], reverse=True)
    return result


# ==========================================
# ✅ ROUTES COURS ÉTUDIANT & ENSEIGNANT
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


@router.get("/teacher/courses")
def get_teacher_courses(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("teacher", "admin", "secretary", "censeur"))
):
    """Récupère uniquement les cours assignés à l'enseignant connecté, ou tous les cours pour le staff"""
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
    date: Optional[str] = Query(None),
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

    target_date = date_class.today() if 'date_class' in globals() else datetime.now().date()
    if date:
        try:
            target_date = datetime.strptime(date, "%Y-%m-%d").date()
        except Exception:
            pass
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
        "date": str(target_date),
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
                attendance_type="student",
                scanned_by=current_user.id,
                university_id=current_user.university_id
            )
            db.add(new_att)

        # ✅ SYNCHRONISATION PRÉSENCE JOURNALIÈRE (Audio 3 & 4)
        # Si l'étudiant est présent ou en retard dans un cours, il est obligatoirement présent à l'école aujourd'hui
        if status in ["present", "late"]:
            daily_att = db.query(Attendance).filter(
                Attendance.student_id == student_id,
                Attendance.course_id.is_(None),
                Attendance.date == target_date,
                Attendance.attendance_type == "student"
            ).first()

            if not daily_att:
                daily_att = Attendance(
                    student_id=student_id,
                    course_id=None,
                    date=target_date,
                    check_in_time=current_time,
                    status="present",
                    method="auto_sync_appel",
                    attendance_type="student",
                    scanned_by=current_user.id,
                    university_id=current_user.university_id,
                    comment="Présence journalière validée automatiquement via l'appel en classe"
                )
                db.add(daily_att)
            elif daily_att.status == "absent":
                daily_att.status = "present"
                daily_att.check_in_time = current_time
                daily_att.comment = "Présence journalière actualisée via l'appel en classe"

    db.commit()
    return {"message": "Appel enregistré avec succès et présences journalières synchronisées"}


# ==========================================
# ⚙️ CONFIGURATION DES PRÉSENCES
# ==========================================

@router.get("/config")
def get_attendance_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "censeur", "secretary", "guard"))
):
    """Récupère la configuration de présence"""
    from app.models.academic_config import AcademicConfig
    config = db.query(AcademicConfig).filter(
        AcademicConfig.university_id == current_user.university_id
    ).first()
    
    return {
        "mode": "schedule",  # Toujours basé sur l'emploi du temps
        "min_attendance_rate": getattr(config, 'min_attendance_rate', 75.0) if config else 75.0,
        "description": "Le système de présence est basé sur l'emploi du temps des étudiants. Le retard est calculé automatiquement par rapport à l'heure de début du cours."
    }

@router.put("/config")
def update_attendance_config(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "censeur", "secretary"))
):
    """Met à jour le taux minimum de présence"""
    from app.models.academic_config import AcademicConfig
    config = db.query(AcademicConfig).filter(
        AcademicConfig.university_id == current_user.university_id
    ).first()
    
    if not config:
        config = AcademicConfig(university_id=current_user.university_id)
        db.add(config)
        db.flush()
        
    if "min_attendance_rate" in data:
        config.min_attendance_rate = float(data["min_attendance_rate"])
        
    db.commit()
    return {
        "message": "Configuration sauvegardée avec succès",
        "mode": "schedule",
        "min_attendance_rate": config.min_attendance_rate
    }