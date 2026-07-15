from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func
from typing import List
from datetime import datetime
from app.database.connection import SessionLocal
from app.models.grade import Grade
from app.models.student import Student
from app.models.course import Course
from app.models.exam_session import ExamSession
from app.models.user import User
from app.core.dependencies import require_role

router = APIRouter(prefix="/grades", tags=["Grades"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ✅ Récupérer les notes avec crédits
@router.get("/by-context")
def get_grades_by_context(
    session_id: int,
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "censeur", "teacher"))
):
    """Récupère les notes avec CC, Examen et crédits du cours"""
    course = db.query(Course).filter(
        Course.id == course_id,
        Course.university_id == current_user.university_id
    ).first()
    if not course:
        raise HTTPException(status_code=404, detail="Cours non trouvé")
    
    students = db.query(Student).filter(
        Student.university_id == current_user.university_id,
        Student.filiere == course.department,
        Student.level == course.level
    ).order_by(Student.last_name, Student.first_name).all()
    
    existing_grades = db.query(Grade).filter(
        Grade.session_id == session_id,
        Grade.course_id == course_id
    ).all()
    
    grades_map = {g.student_id: g for g in existing_grades}
    
    result = []
    for student in students:
        grade = grades_map.get(student.id)
        result.append({
            "student_id": student.id,
            "student_name": f"{student.first_name} {student.last_name}",
            "matricule": student.matricule,
            "cc_score": grade.cc_score if grade else None,
            "exam_score": grade.exam_score if grade else None,
            "score": grade.score if grade else None,
            "credits": course.credits,  # ✅ AJOUTÉ
            "comment": grade.comment if grade else None,
            "status": grade.status if grade else "not_graded",
            "grade_id": grade.id if grade else None
        })
    
    return {
        "course": {
            "id": course.id,
            "title": course.title,
            "code": course.code,
            "level": course.level,
            "department": course.department,
            "credits": course.credits  # ✅ AJOUTÉ
        },
        "students": result
    }


# ✅ LISTER TOUTES LES NOTES avec crédits
@router.get("/")
def get_all_grades(
    session_id: int = None,
    student_id: int = None,
    course_id: int = None,
    status: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "censeur", "teacher"))
):
    """Récupère toutes les notes avec crédits"""
    query = db.query(Grade)
    
    if session_id:
        query = query.filter(Grade.session_id == session_id)
    if student_id:
        query = query.filter(Grade.student_id == student_id)
    if course_id:
        query = query.filter(Grade.course_id == course_id)
    if status:
        query = query.filter(Grade.status == status)
    
    grades = query.order_by(Grade.created_at.desc()).all()
    
    result = []
    for grade in grades:
        student = db.query(Student).filter(Student.id == grade.student_id).first()
        course = db.query(Course).filter(Course.id == grade.course_id).first()
        session = db.query(ExamSession).filter(ExamSession.id == grade.session_id).first()
        validated_by_user = None
        if grade.validated_by:
            validated_by_user = db.query(User).filter(User.id == grade.validated_by).first()
        
        result.append({
            "id": grade.id,
            "student_id": grade.student_id,
            "student_name": f"{student.first_name} {student.last_name}" if student else "Inconnu",
            "course_id": grade.course_id,
            "course_title": course.title if course else "Inconnu",
            "course_code": course.code if course else None,
            "course_credits": course.credits if course else 0,  # ✅ AJOUTÉ
            "session_id": grade.session_id,
            "session_name": session.name if session else "Inconnu",
            "cc_score": grade.cc_score,
            "exam_score": grade.exam_score,
            "score": grade.score,
            "coefficient": grade.coefficient,
            "comment": grade.comment,
            "status": grade.status,
            "validated_by": grade.validated_by,
            "validated_by_name": validated_by_user.full_name if validated_by_user else None,
            "validated_at": grade.validated_at.isoformat() if grade.validated_at else None,
            "rejected_by": grade.rejected_by,
            "rejected_at": grade.rejected_at.isoformat() if grade.rejected_at else None,
            "rejection_reason": grade.rejection_reason,
            "created_at": grade.created_at.isoformat() if grade.created_at else None,
            "updated_at": grade.updated_at.isoformat() if grade.updated_at else None
        })
    
    return result


# ✅ Statistiques avec moyenne pondérée
@router.get("/stats")
def get_grades_stats(
    session_id: int,
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "teacher"))
):
    """Statistiques avec moyenne pondérée par crédits"""
    grades = db.query(Grade).filter(
        Grade.session_id == session_id,
        Grade.course_id == course_id,
        Grade.score.isnot(None)
    ).all()
    
    if not grades:
        return {
            "total_students": 0,
            "graded_students": 0,
            "average": 0,
            "min": 0,
            "max": 0,
            "pass_rate": 0,
            "distribution": {}
        }
    
    scores = [g.score for g in grades if g.score is not None]
    
    distribution = {
        "0-5": len([s for s in scores if s < 5]),
        "5-10": len([s for s in scores if 5 <= s < 10]),
        "10-15": len([s for s in scores if 10 <= s < 15]),
        "15-20": len([s for s in scores if 15 <= s <= 20]),
    }
    
    total_students = db.query(Grade).filter(
        Grade.session_id == session_id,
        Grade.course_id == course_id
    ).count()
    
    passing = len([s for s in scores if s >= 10])
    
    return {
        "total_students": total_students,
        "graded_students": len(scores),
        "average": round(sum(scores) / len(scores), 2) if scores else 0,
        "min": min(scores) if scores else 0,
        "max": max(scores) if scores else 0,
        "pass_rate": round((passing / len(scores) * 100), 1) if scores else 0,
        "distribution": distribution
    }


# ✅ NOUVEAU : Moyenne pondérée d'un étudiant sur une session
@router.get("/weighted-average/{student_id}")
def get_weighted_average(
    student_id: int,
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "censeur", "teacher", "student"))
):
    """Calcule la moyenne pondérée d'un étudiant pour une session"""
    grades = db.query(Grade).join(Course).filter(
        Grade.student_id == student_id,
        Grade.session_id == session_id,
        Grade.score.isnot(None)
    ).all()
    
    if not grades:
        return {
            "weighted_average": 0,
            "total_credits": 0,
            "obtained_credits": 0,
            "courses": [],
            "mention": "Non noté"
        }
    
    weighted_sum = 0
    total_credits = 0
    obtained_credits = 0
    courses = []
    
    for grade in grades:
        course = db.query(Course).filter(Course.id == grade.course_id).first()
        if not course:
            continue
        
        credits = course.credits or 3
        weighted_sum += (grade.score or 0) * credits
        total_credits += credits
        
        if grade.score >= 10:
            obtained_credits += credits
        
        courses.append({
            "course_id": course.id,
            "course_title": course.title,
            "course_code": course.code,
            "score": grade.score,
            "credits": credits,
            "status": grade.status
        })
    
    weighted_average = weighted_sum / total_credits if total_credits > 0 else 0
    
    # Mention
    if weighted_average >= 16:
        mention = "Excellent"
    elif weighted_average >= 14:
        mention = "Très Bien"
    elif weighted_average >= 12:
        mention = "Bien"
    elif weighted_average >= 10:
        mention = "Assez Bien"
    elif weighted_average >= 8:
        mention = "Passable"
    else:
        mention = "Insuffisant"
    
    return {
        "weighted_average": round(weighted_average, 2),
        "total_credits": total_credits,
        "obtained_credits": obtained_credits,
        "courses": courses,
        "mention": mention
    }

# ✅ SAISIE EN MASSE (avec CC + Examen + notifications)
@router.post("/bulk")
def bulk_save_grades(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "censeur", "teacher"))
):
    """Sauvegarde plusieurs notes (CC + Examen) avec notifications auto"""
    from app.models.notification import Notification
    
    session_id = data.get("session_id")
    course_id = data.get("course_id")
    grades_data = data.get("grades", [])
    status = data.get("status", "draft")
    cc_coefficient = data.get("cc_coefficient", 0.3)
    exam_coefficient = data.get("exam_coefficient", 0.7)
    
    # ✅ CORRECTION : Teacher ne peut que sauvegarder en draft
    if current_user.role == "teacher" and status == "validated":
        status = "draft"  # Forcer en draft
    
    session = db.query(ExamSession).filter(
        ExamSession.id == session_id,
        ExamSession.university_id == current_user.university_id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session non trouvée")
    
    if session.status == "closed":
        raise HTTPException(status_code=400, detail="Cette session est fermée")
    
    course = db.query(Course).filter(Course.id == course_id).first()
    
    saved_count = 0
    for g in grades_data:
        student_id = g.get("student_id")
        cc_score = g.get("cc_score")
        exam_score = g.get("exam_score")
        comment = g.get("comment")
        
        if cc_score is not None and (cc_score < 0 or cc_score > 20):
            raise HTTPException(status_code=400, detail=f"Note CC invalide: {cc_score}")
        if exam_score is not None and (exam_score < 0 or exam_score > 20):
            raise HTTPException(status_code=400, detail=f"Note Examen invalide: {exam_score}")
        
        final_score = None
        if cc_score is not None and exam_score is not None:
            final_score = round(cc_score * cc_coefficient + exam_score * exam_coefficient, 2)
        elif cc_score is not None:
            final_score = cc_score
        elif exam_score is not None:
            final_score = exam_score
        
        existing = db.query(Grade).filter(
            Grade.student_id == student_id,
            Grade.course_id == course_id,
            Grade.session_id == session_id
        ).first()
        
        if existing:
            existing.cc_score = cc_score
            existing.exam_score = exam_score
            existing.cc_coefficient = cc_coefficient
            existing.exam_coefficient = exam_coefficient
            existing.score = final_score
            existing.comment = comment
            existing.status = status
            existing.graded_by = current_user.id
        else:
            new_grade = Grade(
                student_id=student_id,
                course_id=course_id,
                session_id=session_id,
                cc_score=cc_score,
                exam_score=exam_score,
                cc_coefficient=cc_coefficient,
                exam_coefficient=exam_coefficient,
                score=final_score,
                comment=comment,
                status=status,
                graded_by=current_user.id,
                university_id=current_user.university_id
            )
            db.add(new_grade)
        saved_count += 1
    
    db.commit()
    
    # ✅ NOTIFICATION : Teacher → Censeur (seulement si draft)
    if status == "draft" and current_user.role == "teacher" and course:
        censeurs = db.query(User).filter(
            User.university_id == current_user.university_id,
            User.role == "censeur"
        ).all()
        
        for censeur in censeurs:
            notification = Notification(
                title=f"📝 Notes à valider - {course.title}",
                message=f"{current_user.full_name} a soumis {saved_count} notes pour la session {session.name}\nCours: {course.title} ({course.code})",
                notification_type="grade_validation",
                type="warning",
                target_roles=["censeur"],
                recipient_id=censeur.id,
                created_by=current_user.id,
                university_id=current_user.university_id,
                is_read=False
            )
            db.add(notification)
        db.commit()
    
    return {
        "message": f"{saved_count} note(s) sauvegardée(s) en {status}",
        "saved_count": saved_count,
        "status": status
    }

    
# ✅ VALIDER UNE NOTE (avec notification)
@router.put("/{grade_id}/validate")
def validate_grade(
    grade_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "censeur", "secretary"))
):
    """Valide une note (censeur) → Notifie le teacher"""
    from app.models.notification import Notification
    
    grade = db.query(Grade).filter(Grade.id == grade_id).first()
    if not grade:
        raise HTTPException(status_code=404, detail="Note non trouvée")
    
    grade.status = "validated"
    grade.validated_by = current_user.id
    grade.validated_at = datetime.now()
    db.commit()
    db.refresh(grade)
    
    # ✅ Notifier le teacher qui a saisi la note
    if grade.graded_by:
        teacher = db.query(User).filter(User.id == grade.graded_by).first()
        course = db.query(Course).filter(Course.id == grade.course_id).first()
        student = db.query(Student).filter(Student.id == grade.student_id).first()
        
        if teacher and course and student:
            notification = Notification(
                title=f"✅ Note validée - {course.title}",
                message=f"La note de {student.first_name} {student.last_name} a été validée par {current_user.full_name}\nCours: {course.title}",
                notification_type="grade_validated",
                type="success",
                target_roles=["teacher"],
                recipient_id=teacher.id,
                created_by=current_user.id,
                university_id=current_user.university_id,
                is_read=False,
                extra_data=f'{{"grade_id": {grade.id}, "course_id": {course.id}}}'
            )
            db.add(notification)
            db.commit()
    
    return {"message": "Note validée avec succès", "grade_id": grade.id}


# ✅ REJETER UNE NOTE (avec notification)
@router.put("/{grade_id}/reject")
def reject_grade(
    grade_id: int,
    data: dict = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "censeur"))
):
    """Rejette une note → Notifie le teacher avec la raison"""
    from app.models.notification import Notification
    
    grade = db.query(Grade).filter(Grade.id == grade_id).first()
    if not grade:
        raise HTTPException(status_code=404, detail="Note non trouvée")
    
    reason = data.get("reason") if data else None
    
    grade.status = "rejected"
    grade.rejected_by = current_user.id
    grade.rejected_at = datetime.now()
    grade.rejection_reason = reason
    db.commit()
    db.refresh(grade)
    
    # ✅ Notifier le teacher
    if grade.graded_by:
        teacher = db.query(User).filter(User.id == grade.graded_by).first()
        course = db.query(Course).filter(Course.id == grade.course_id).first()
        student = db.query(Student).filter(Student.id == grade.student_id).first()
        
        if teacher and course and student:
            notification = Notification(
                title=f"❌ Note rejetée - {course.title}",
                message=f"La note de {student.first_name} {student.last_name} a été rejetée par {current_user.full_name}\nCours: {course.title}\nRaison: {reason or 'Non spécifiée'}",
                notification_type="grade_rejected",
                type="error",
                target_roles=["teacher"],
                recipient_id=teacher.id,
                created_by=current_user.id,
                university_id=current_user.university_id,
                is_read=False,
                extra_data=f'{{"grade_id": {grade.id}, "course_id": {course.id}, "reason": "{reason or ""}"}}'
            )
            db.add(notification)
            db.commit()
    
    return {"message": "Note rejetée", "grade_id": grade.id}


# ✅ Récupérer toutes les sessions avec stats pour un cours
@router.get("/sessions-with-stats/{course_id}")
def get_sessions_with_stats(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "teacher"))
):
    """Liste des sessions avec statistiques pour un cours"""
    
    sessions = db.query(ExamSession).filter(
        ExamSession.university_id == current_user.university_id
    ).order_by(ExamSession.start_date.desc()).all()
    
    result = []
    for session in sessions:
        grades = db.query(Grade).filter(
            Grade.session_id == session.id,
            Grade.course_id == course_id,
            Grade.score.isnot(None)
        ).all()
        
        scores = [g.score for g in grades]
        
        result.append({
            "id": session.id,
            "name": session.name,
            "session_type": session.session_type,
            "status": session.status,
            "start_date": session.start_date.isoformat() if session.start_date else None,
            "end_date": session.end_date.isoformat() if session.end_date else None,
            "graded_count": len(scores),
            "average": round(sum(scores) / len(scores), 2) if scores else None
        })
    
    return result

# ✅ DÉTECTER LES ANOMALIES (avec configuration)
@router.get("/anomalies")
def get_anomalies(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "censeur"))
):
    """Détecte les notes suspectes selon la configuration"""
    from app.models.anomaly_config import AnomalyConfig
    
    config = db.query(AnomalyConfig).filter(
        AnomalyConfig.university_id == current_user.university_id
    ).first()
    
    if config and not config.enable_anomalies:
        return {
            "anomalies": [],
            "total": 0,
            "high": 0,
            "medium": 0,
            "low": 0,
            "enabled": False
        }
    
    threshold_exceptional = config.threshold_exceptional if config else 19.0
    threshold_very_high = config.threshold_very_high if config else 18.0
    threshold_very_low = config.threshold_very_low if config else 3.0
    threshold_low = config.threshold_low if config else 5.0
    
    grades = db.query(Grade).filter(
        Grade.score.isnot(None),
        Grade.university_id == current_user.university_id
    ).all()
    
    anomalies = []
    for grade in grades:
        if grade.score is not None:
            anomaly_type = None
            severity = "low"
            
            if grade.score > threshold_exceptional:
                anomaly_type = "Note exceptionnelle"
                severity = "medium"
            elif grade.score > threshold_very_high:
                anomaly_type = "Note très élevée"
                severity = "low"
            elif grade.score < threshold_very_low:
                anomaly_type = "Note très faible"
                severity = "high"
            elif grade.score < threshold_low:
                anomaly_type = "Note faible"
                severity = "medium"
            
            if anomaly_type:
                student = db.query(Student).filter(Student.id == grade.student_id).first()
                course = db.query(Course).filter(Course.id == grade.course_id).first()
                session = db.query(ExamSession).filter(ExamSession.id == grade.session_id).first()
                
                anomalies.append({
                    "id": grade.id,
                    "student_id": grade.student_id,
                    "student_name": f"{student.first_name} {student.last_name}" if student else "Inconnu",
                    "matricule": student.matricule if student else "N/A",
                    "course_id": grade.course_id,
                    "course_title": course.title if course else "Inconnu",
                    "session_id": grade.session_id,
                    "session_name": session.name if session else "Inconnu",
                    "score": grade.score,
                    "coefficient": grade.coefficient,
                    "status": grade.status,
                    "anomaly_type": anomaly_type,
                    "severity": severity,
                    "comment": grade.comment,
                    "created_at": grade.created_at.isoformat() if grade.created_at else None
                })
    
    severity_order = {"high": 0, "medium": 1, "low": 2}
    anomalies.sort(key=lambda x: severity_order.get(x["severity"], 3))
    
    return {
        "anomalies": anomalies,
        "total": len(anomalies),
        "high": len([a for a in anomalies if a["severity"] == "high"]),
        "medium": len([a for a in anomalies if a["severity"] == "medium"]),
        "low": len([a for a in anomalies if a["severity"] == "low"]),
        "enabled": True,
        "config": {
            "threshold_exceptional": threshold_exceptional,
            "threshold_very_high": threshold_very_high,
            "threshold_very_low": threshold_very_low,
            "threshold_low": threshold_low
        }
    }


# ✅ CONFIGURATION DES ANOMALIES
@router.get("/anomalies/config")
def get_anomaly_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "censeur"))
):
    """Récupère la configuration des anomalies"""
    from app.models.anomaly_config import AnomalyConfig
    
    config = db.query(AnomalyConfig).filter(
        AnomalyConfig.university_id == current_user.university_id
    ).first()
    
    if not config:
        config = AnomalyConfig(
            university_id=current_user.university_id,
            enable_anomalies=True,
            threshold_exceptional=19.0,
            threshold_very_high=18.0,
            threshold_very_low=3.0,
            threshold_low=5.0
        )
        db.add(config)
        db.commit()
        db.refresh(config)
    
    return {
        "enable_anomalies": config.enable_anomalies,
        "threshold_exceptional": config.threshold_exceptional,
        "threshold_very_high": config.threshold_very_high,
        "threshold_very_low": config.threshold_very_low,
        "threshold_low": config.threshold_low
    }


@router.put("/anomalies/config")
def update_anomaly_config(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "censeur"))
):
    """Met à jour la configuration des anomalies"""
    from app.models.anomaly_config import AnomalyConfig
    
    config = db.query(AnomalyConfig).filter(
        AnomalyConfig.university_id == current_user.university_id
    ).first()
    
    if not config:
        config = AnomalyConfig(university_id=current_user.university_id)
        db.add(config)
    
    if "enable_anomalies" in data:
        config.enable_anomalies = data["enable_anomalies"]
    if "threshold_exceptional" in data:
        config.threshold_exceptional = float(data["threshold_exceptional"])
    if "threshold_very_high" in data:
        config.threshold_very_high = float(data["threshold_very_high"])
    if "threshold_very_low" in data:
        config.threshold_very_low = float(data["threshold_very_low"])
    if "threshold_low" in data:
        config.threshold_low = float(data["threshold_low"])
    
    db.commit()
    
    return {"message": "Configuration des anomalies mise à jour"}