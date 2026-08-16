from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func
from app.database.connection import SessionLocal
from app.models.student import Student
from app.models.grade import Grade
from app.models.course import Course
from app.models.class_room import ClassRoom
from app.models.exam_session import ExamSession
from app.models.user import User
from app.core.dependencies import require_role

router = APIRouter(prefix="/academic", tags=["Academic"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ✅ PERFORMANCE PAR CLASSE/FILIÈRE
@router.get("/performance")
def get_performance(
    session_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "censeur"))
):
    """Performance par classe et filière"""
    
    # Récupérer les classes
    classes = db.query(ClassRoom).filter(
        ClassRoom.university_id == current_user.university_id
    ).all()
    
    performance = []
    
    for classe in classes:
        # Récupérer les attributs de manière sécurisée
        filiere_name = getattr(classe, 'filiere_name', None) or getattr(classe, 'name', 'N/A')
        level = getattr(classe, 'level', 'N/A')
        filiere_id = getattr(classe, 'filiere_id', None)
        
        # Filtrer les étudiants selon la structure disponible
        students_query = db.query(Student).filter(
            Student.university_id == current_user.university_id
        )
        
        # Si filiere_name existe, l'utiliser
        if filiere_name and hasattr(Student, 'filiere'):
            students_query = students_query.filter(Student.filiere == filiere_name)
        # Sinon utiliser filiere_id si disponible
        elif filiere_id and hasattr(Student, 'filiere_id'):
            students_query = students_query.filter(Student.filiere_id == filiere_id)
        
        # Filtrer par niveau si disponible
        if level != 'N/A' and hasattr(Student, 'level'):
            students_query = students_query.filter(Student.level == level)
        
        students = students_query.all()
        
        if not students:
            continue
        
        student_ids = [s.id for s in students]
        
        # Notes des étudiants
        query = db.query(Grade).filter(
            Grade.student_id.in_(student_ids),
            Grade.score.isnot(None)
        )
        
        if session_id:
            query = query.filter(Grade.session_id == session_id)
        
        grades = query.all()
        
        if not grades:
            continue
        
        # Calculs
        scores = [g.score for g in grades]
        average = sum(scores) / len(scores)
        passed = len([s for s in scores if s >= 10])
        failed = len([s for s in scores if s < 10])
        excellent = len([s for s in scores if s >= 16])
        
        performance.append({
            "class_id": classe.id,
            "class_name": getattr(classe, 'name', 'Classe'),
            "filiere": filiere_name,
            "level": level,
            "total_students": len(students),
            "total_grades": len(grades),
            "average": round(average, 2),
            "passed": passed,
            "failed": failed,
            "excellent": excellent,
            "success_rate": round((passed / len(scores)) * 100, 1) if scores else 0,
            "min_score": round(min(scores), 2),
            "max_score": round(max(scores), 2)
        })
    
    # Trier par moyenne décroissante
    performance.sort(key=lambda x: x["average"], reverse=True)
    
    # Stats globales
    all_grades_query = db.query(Grade).filter(
        Grade.university_id == current_user.university_id,
        Grade.score.isnot(None)
    )
    if session_id:
        all_grades_query = all_grades_query.filter(Grade.session_id == session_id)
    
    all_grades = all_grades_query.all()
    all_scores = [g.score for g in all_grades]
    
    global_stats = {
        "total_students": db.query(Student).filter(
            Student.university_id == current_user.university_id
        ).count(),
        "total_grades": len(all_grades),
        "global_average": round(sum(all_scores) / len(all_scores), 2) if all_scores else 0,
        "global_success_rate": round(
            (len([s for s in all_scores if s >= 10]) / len(all_scores)) * 100, 1
        ) if all_scores else 0,
        "excellent_count": len([s for s in all_scores if s >= 16]),
        "failed_count": len([s for s in all_scores if s < 10])
    }
    
    return {
        "performance": performance,
        "global_stats": global_stats
    }


# ✅ STATISTIQUES AVANCÉES
@router.get("/statistics")
def get_statistics(
    session_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "censeur"))
):
    """Statistiques avancées"""
    
    # Récupérer toutes les notes
    query = db.query(Grade).filter(
        Grade.university_id == current_user.university_id,
        Grade.score.isnot(None)
    )
    if session_id:
        query = query.filter(Grade.session_id == session_id)
    
    grades = query.all()
    scores = [g.score for g in grades]
    
    # Distribution des notes par tranche
    distribution = {
        "0-5": len([s for s in scores if s < 5]),
        "5-10": len([s for s in scores if 5 <= s < 10]),
        "10-12": len([s for s in scores if 10 <= s < 12]),
        "12-14": len([s for s in scores if 12 <= s < 14]),
        "14-16": len([s for s in scores if 14 <= s < 16]),
        "16-18": len([s for s in scores if 16 <= s < 18]),
        "18-20": len([s for s in scores if s >= 18])
    }
    
    # Statistiques par matière
    courses_stats = []
    courses = db.query(Course).filter(
        Course.university_id == current_user.university_id
    ).all()
    
    for course in courses:
        course_grades = [g for g in grades if g.course_id == course.id]
        if not course_grades:
            continue
        
        course_scores = [g.score for g in course_grades]
        courses_stats.append({
            "course_id": course.id,
            "course_title": getattr(course, 'title', 'Cours'),
            "course_code": getattr(course, 'code', ''),
            "total_grades": len(course_grades),
            "average": round(sum(course_scores) / len(course_scores), 2),
            "min": round(min(course_scores), 2),
            "max": round(max(course_scores), 2),
            "success_rate": round(
                (len([s for s in course_scores if s >= 10]) / len(course_scores)) * 100, 1
            )
        })
    
    # Trier par moyenne décroissante
    courses_stats.sort(key=lambda x: x["average"], reverse=True)
    
    # Mentions
    mentions = {
        "Insuffisant (<10)": len([s for s in scores if s < 10]),
        "Passable (10-12)": len([s for s in scores if 10 <= s < 12]),
        "Assez Bien (12-14)": len([s for s in scores if 12 <= s < 14]),
        "Bien (14-16)": len([s for s in scores if 14 <= s < 16]),
        "Très Bien (16-18)": len([s for s in scores if 16 <= s < 18]),
        "Excellent (≥18)": len([s for s in scores if s >= 18])
    }
    
    return {
        "total_grades": len(grades),
        "global_average": round(sum(scores) / len(scores), 2) if scores else 0,
        "distribution": distribution,
        "courses_stats": courses_stats,
        "mentions": mentions,
        "min_score": round(min(scores), 2) if scores else 0,
        "max_score": round(max(scores), 2) if scores else 0
    }


# ✅ RAPPORTS GÉNÉRÉS
@router.get("/reports")
def get_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "censeur"))
):
    """Liste des rapports disponibles"""
    
    sessions = db.query(ExamSession).filter(
        ExamSession.university_id == current_user.university_id
    ).order_by(ExamSession.start_date.desc()).all()
    
    reports = []
    
    for session in sessions:
        # Statistiques pour cette session
        grades = db.query(Grade).filter(
            Grade.session_id == session.id,
            Grade.score.isnot(None)
        ).all()
        
        if not grades:
            continue
        
        scores = [g.score for g in grades]
        
        reports.append({
            "id": session.id,
            "session_name": session.name,
            "session_type": getattr(session, 'session_type', 'semester1'),
            "start_date": session.start_date.isoformat() if session.start_date else None,
            "end_date": session.end_date.isoformat() if session.end_date else None,
            "status": getattr(session, 'status', 'draft'),
            "total_grades": len(grades),
            "average": round(sum(scores) / len(scores), 2),
            "success_rate": round(
                (len([s for s in scores if s >= 10]) / len(scores)) * 100, 1
            ),
            "students_count": len(set(g.student_id for g in grades)),
            "courses_count": len(set(g.course_id for g in grades))
        })
    
    return {"reports": reports}