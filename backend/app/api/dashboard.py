from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import datetime, timedelta
from app.database.connection import SessionLocal
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.course import Course
from app.models.user import User
from app.core.dependencies import require_role

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "censeur", "accountant", "guard", "teacher"))
):
    university_id = current_user.university_id
    now = datetime.utcnow()
    
    # Calculer le 1er jour du mois en cours
    first_day_this_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    # Calculer le 1er jour du mois dernier
    first_day_last_month = (first_day_this_month - timedelta(days=1)).replace(day=1)
    
    # ==========================================
    # ÉTUDIANTS
    # ==========================================
    total_students = db.query(func.count(Student.id)).filter(
        Student.university_id == university_id
    ).scalar() or 0
    
    # Nouveaux étudiants ce mois
    new_students_this_month = db.query(func.count(Student.id)).filter(
        Student.university_id == university_id,
        Student.created_at >= first_day_this_month
    ).scalar() or 0
    
    # Étudiants le mois dernier (pour calcul de croissance)
    students_last_month = db.query(func.count(Student.id)).filter(
        Student.university_id == university_id,
        Student.created_at < first_day_this_month
    ).scalar() or 0
    
    # Répartition par filière
    by_filiere_rows = db.query(
        Student.filiere, func.count(Student.id)
    ).filter(
        Student.university_id == university_id,
        Student.filiere.isnot(None)
    ).group_by(Student.filiere).all()
    
    by_filiere = {}
    for row in by_filiere_rows:
        filiere_name = row[0] or "Non défini"
        if " - " in filiere_name:
            filiere_name = filiere_name.split(" - ")[-1].strip()
        by_filiere[filiere_name] = row[1]
    
    # Répartition par niveau
    by_level_rows = db.query(
        Student.level, func.count(Student.id)
    ).filter(
        Student.university_id == university_id,
        Student.level.isnot(None)
    ).group_by(Student.level).all()
    
    by_level = {row[0] or "Non défini": row[1] for row in by_level_rows}
    
    # ==========================================
    # ENSEIGNANTS
    # ==========================================
    total_teachers = db.query(func.count(Teacher.id)).filter(
        Teacher.university_id == university_id
    ).scalar() or 0
    
    new_teachers_this_month = db.query(func.count(Teacher.id)).filter(
        Teacher.university_id == university_id,
        Teacher.created_at >= first_day_this_month
    ).scalar() or 0
    
    # ==========================================
    # COURS
    # ==========================================
    total_courses = db.query(func.count(Course.id)).filter(
        Course.university_id == university_id
    ).scalar() or 0
    
    new_courses_this_month = db.query(func.count(Course.id)).filter(
        Course.university_id == university_id,
        Course.created_at >= first_day_this_month
    ).scalar() or 0
    
    # ==========================================
    # INSCRIPTIONS SUR 6 MOIS (pour le graphique)
    # ==========================================
    monthly_inscriptions = []
    for i in range(5, -1, -1):  # 5, 4, 3, 2, 1, 0 (6 mois)
        # Calculer le 1er jour du mois i mois avant aujourd'hui
        if i == 0:
            month_start = first_day_this_month
            month_end = now
        else:
            # Mois précédent
            month_start = (first_day_this_month - timedelta(days=i*30)).replace(day=1)
            if i == 1:
                month_end = first_day_this_month
            else:
                month_end = (month_start + timedelta(days=32)).replace(day=1)
        
        count = db.query(func.count(Student.id)).filter(
            Student.university_id == university_id,
            Student.created_at >= month_start,
            Student.created_at < month_end
        ).scalar() or 0
        
        month_label = month_start.strftime('%b').capitalize()
        monthly_inscriptions.append({
            "month": month_label,
            "value": count
        })
    
    # ==========================================
    # ENSEIGNANTS SANS COURS
    # ==========================================
    teachers_with_courses = db.query(Course.teacher_id).filter(
        Course.university_id == university_id,
        Course.teacher_id.isnot(None)
    ).distinct().all()
    
    teachers_with_courses_ids = [t[0] for t in teachers_with_courses if t[0]]
    
    if teachers_with_courses_ids:
        teachers_without_courses = db.query(func.count(Teacher.id)).filter(
            Teacher.university_id == university_id,
            ~Teacher.id.in_(teachers_with_courses_ids)
        ).scalar() or 0
    else:
        teachers_without_courses = total_teachers
    
    # ==========================================
    # ACTIVITÉS RÉCENTES (5 derniers étudiants)
    # ==========================================
    recent_students = db.query(Student).filter(
        Student.university_id == university_id
    ).order_by(Student.id.desc()).limit(5).all()
    
    recent_activities = [
        {
            "type": "student",
            "description": f"Nouvel étudiant : {s.first_name} {s.last_name} ({s.matricule})",
            "time": s.created_at.isoformat() if s.created_at else None
        }
        for s in recent_students
    ]
    
    # ==========================================
    # RÉPONSE COMPLÈTE
    # ==========================================
    return {
        "students": {
            "total": total_students,
            "new_this_month": new_students_this_month,
            "last_month": students_last_month,
            "by_filiere": by_filiere,
            "by_level": by_level
        },
        "teachers": {
            "total": total_teachers,
            "new_this_month": new_teachers_this_month
        },
        "courses": {
            "total": total_courses,
            "new_this_month": new_courses_this_month
        },
        "monthly_inscriptions": monthly_inscriptions,
        "recent_activities": recent_activities,
        "alerts": {
            "teachers_without_courses": teachers_without_courses
        }
    }