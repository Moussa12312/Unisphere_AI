from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, date
from app.database.connection import SessionLocal
from app.models.exam_session import ExamSession
from app.models.user import User
from app.core.dependencies import require_role

router = APIRouter(prefix="/exam-sessions", tags=["Exam Sessions"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def session_to_dict(s):
    """Convertit une session en dict de manière sécurisée"""
    return {
        "id": s.id,
        "name": s.name,
        "session_type": getattr(s, 'session_type', 'semester1'),
        "start_date": s.start_date.isoformat() if s.start_date else None,
        "end_date": s.end_date.isoformat() if s.end_date else None,
        "status": getattr(s, 'status', 'draft'),
        "description": getattr(s, 'description', None),
        "university_id": s.university_id,
        "created_at": s.created_at.isoformat() if getattr(s, 'created_at', None) else None,
        "updated_at": s.updated_at.isoformat() if getattr(s, 'updated_at', None) else None
    }


# ✅ LISTER TOUTES LES SESSIONS
@router.get("/")
def get_exam_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "teacher", "censeur"))
):
    """Liste toutes les sessions d'examens"""
    
    sessions = db.query(ExamSession).filter(
        ExamSession.university_id == current_user.university_id
    ).order_by(ExamSession.start_date.desc()).all()
    
    return [session_to_dict(s) for s in sessions]


# ✅ RÉCUPÉRER UNE SESSION SPÉCIFIQUE
@router.get("/{session_id}")
def get_exam_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "teacher", "censeur"))
):
    """Récupère une session d'examen par son ID"""
    
    session = db.query(ExamSession).filter(
        ExamSession.id == session_id,
        ExamSession.university_id == current_user.university_id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session non trouvée")
    
    return session_to_dict(session)


# ✅ CRÉER UNE SESSION
@router.post("/")
def create_exam_session(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "censeur"))
):
    """Crée une nouvelle session d'examen"""
    
    # Validation des dates
    try:
        start_date = datetime.strptime(data.get("start_date"), "%Y-%m-%d").date()
        end_date = datetime.strptime(data.get("end_date"), "%Y-%m-%d").date()
    except:
        raise HTTPException(status_code=400, detail="Format de date invalide")
    
    if start_date > end_date:
        raise HTTPException(status_code=400, detail="La date de début doit être avant la date de fin")
    
    # Déterminer le statut automatiquement
    now = datetime.now().date()
    status = data.get("status")
    if not status:
        if now < start_date:
            status = "upcoming"
        elif now > end_date:
            status = "closed"
        else:
            status = "open"
    
    session_type = data.get("session_type", "semester1")
    if session_type == "makeup":
        from app.models.academic_config import AcademicConfig
        ac_config = db.query(AcademicConfig).filter(
            AcademicConfig.university_id == current_user.university_id
        ).first()
        if ac_config and not ac_config.allow_makeup_exam:
            raise HTTPException(
                status_code=400,
                detail="Les sessions de rattrapage sont désactivées selon les règles de délibération de l'établissement."
            )

    new_session = ExamSession(
        name=data.get("name"),
        session_type=session_type,
        start_date=start_date,
        end_date=end_date,
        status=status,
        description=data.get("description"),
        university_id=current_user.university_id
    )
    
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    
    return session_to_dict(new_session)


# ✅ MODIFIER UNE SESSION
@router.put("/{session_id}")
def update_exam_session(
    session_id: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "censeur"))
):
    """Modifie une session d'examen"""
    
    session = db.query(ExamSession).filter(
        ExamSession.id == session_id,
        ExamSession.university_id == current_user.university_id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session non trouvée")
    
    # Mise à jour des champs
    if "name" in data:
        session.name = data["name"]
    if "session_type" in data:
        if data["session_type"] == "makeup":
            from app.models.academic_config import AcademicConfig
            ac_config = db.query(AcademicConfig).filter(
                AcademicConfig.university_id == current_user.university_id
            ).first()
            if ac_config and not ac_config.allow_makeup_exam:
                raise HTTPException(
                    status_code=400,
                    detail="Les sessions de rattrapage sont désactivées selon les règles de délibération de l'établissement."
                )
        session.session_type = data["session_type"]
    if "status" in data:
        session.status = data["status"]
    if "description" in data:
        session.description = data["description"]
    if "start_date" in data and data["start_date"]:
        try:
            session.start_date = datetime.strptime(data["start_date"], "%Y-%m-%d").date()
        except:
            raise HTTPException(status_code=400, detail="Format de date invalide")
    if "end_date" in data and data["end_date"]:
        try:
            session.end_date = datetime.strptime(data["end_date"], "%Y-%m-%d").date()
        except:
            raise HTTPException(status_code=400, detail="Format de date invalide")
    
    # updated_at seulement si la colonne existe
    if hasattr(session, 'updated_at'):
        session.updated_at = datetime.now()
    
    db.commit()
    db.refresh(session)
    
    return session_to_dict(session)


# ✅ SUPPRIMER UNE SESSION
@router.delete("/{session_id}")
def delete_exam_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "censeur"))
):
    """Supprime une session d'examen"""
    
    session = db.query(ExamSession).filter(
        ExamSession.id == session_id,
        ExamSession.university_id == current_user.university_id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session non trouvée")
    
    # Supprimer les notes associées
    try:
        from app.models.grade import Grade
        db.query(Grade).filter(Grade.session_id == session_id).delete()
    except Exception as e:
        # ✅ CORRIGÉ : avant, un échec ici était totalement ignoré, risquant de laisser
        # des notes orphelines pointant vers une session supprimée. On log au minimum.
        print(f"⚠️ Impossible de supprimer les notes de la session {session_id}: {str(e)}")
    
    db.delete(session)
    db.commit()
    
    return {"message": "Session supprimée avec succès"}


# ==========================================
# 🔄 ÉTUDIANTS ÉCHOUÉS & CANDIDATS AU RATTRAPAGE
# ==========================================
@router.get("/makeup/candidates")
def get_makeup_candidates(
    session_id: int = None,
    filiere: str = None,
    level: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "censeur", "teacher"))
):
    """
    Récupère la liste de tous les étudiants ayant échoué à une session normale (note < 10/20)
    qui sont convoqués à la session de rattrapage pour les modules concernés.
    """
    from app.models.grade import Grade
    from app.models.student import Student
    from app.models.course import Course
    from app.models.academic_config import AcademicConfig

    ac_config = db.query(AcademicConfig).filter(
        AcademicConfig.university_id == current_user.university_id
    ).first()
    min_pass = getattr(ac_config, 'min_passing_grade', 10.0) or 10.0

    query = db.query(Grade, Student, Course, ExamSession).join(
        Student, Grade.student_id == Student.id
    ).join(
        Course, Grade.course_id == Course.id
    ).join(
        ExamSession, Grade.session_id == ExamSession.id
    ).filter(
        Student.university_id == current_user.university_id,
        ExamSession.session_type != "makeup",
        Grade.score.isnot(None),
        Grade.score < min_pass
    )

    if session_id:
        query = query.filter(Grade.session_id == session_id)
    if filiere:
        query = query.filter(Student.filiere.ilike(f"%{filiere}%"))
    if level:
        query = query.filter(Student.level == level)

    failed_records = query.order_by(Student.last_name, Student.first_name, Course.title).all()

    candidates = []
    for grade, student, course, session in failed_records:
        candidates.append({
            "grade_id": grade.id,
            "student_id": student.id,
            "student_name": f"{student.first_name} {student.last_name}",
            "matricule": student.matricule,
            "level": student.level,
            "filiere": student.filiere,
            "course_id": course.id,
            "course_title": course.title,
            "course_code": course.code,
            "credits": course.credits or 3,
            "session_id": session.id,
            "session_name": session.name,
            "score": grade.score,
            "cc_score": grade.cc_score,
            "exam_score": grade.exam_score,
            "points_missing": round(min_pass - (grade.score or 0), 2)
        })

    return {
        "min_passing_grade": min_pass,
        "total_failures": len(candidates),
        "unique_students": len(set(c["student_id"] for c in candidates)),
        "candidates": candidates
    }