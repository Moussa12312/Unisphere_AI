from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from datetime import datetime

from app.database.connection import SessionLocal
from app.models.deliberation import DeliberationRule, DeliberationSession, DeliberationDecision
from app.models.student import Student
from app.models.grade import Grade
from app.models.user import User
from app.core.dependencies import require_role

router = APIRouter(prefix="/deliberations", tags=["Deliberations"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ==========================================
# 📏 RÈGLES DE VALIDATION
# ==========================================
class RuleCreate(BaseModel):
    name: str
    filiere: Optional[str] = None
    level: Optional[str] = None
    min_average: float = 10.0
    max_failed_courses: int = 2
    catchup_min_average: float = 8.0


@router.get("/rules")
def get_rules(db: Session = Depends(get_db), current_user: User = Depends(require_role("admin", "censeur"))):
    return db.query(DeliberationRule).filter(
        DeliberationRule.university_id == current_user.university_id
    ).order_by(DeliberationRule.created_at.desc()).all()


@router.post("/rules")
def create_rule(data: RuleCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin", "censeur"))):
    rule = DeliberationRule(**data.dict(), university_id=current_user.university_id)
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


@router.put("/rules/{rule_id}")
def update_rule(rule_id: int, data: RuleCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin", "censeur"))):
    rule = db.query(DeliberationRule).filter(
        DeliberationRule.id == rule_id,
        DeliberationRule.university_id == current_user.university_id
    ).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Règle non trouvée")
    for field, value in data.dict().items():
        setattr(rule, field, value)
    db.commit()
    db.refresh(rule)
    return rule


@router.delete("/rules/{rule_id}")
def delete_rule(rule_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin"))):
    rule = db.query(DeliberationRule).filter(
        DeliberationRule.id == rule_id,
        DeliberationRule.university_id == current_user.university_id
    ).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Règle non trouvée")
    db.delete(rule)
    db.commit()
    return {"message": "Règle supprimée"}


# ==========================================
# 📅 SESSIONS DE JURY
# ==========================================
class SessionCreate(BaseModel):
    title: str
    filiere: str
    level: str
    academic_year: str
    session_date: Optional[str] = None
    jury_members: Optional[str] = None
    rule_id: Optional[int] = None


@router.get("/sessions")
def get_sessions(db: Session = Depends(get_db), current_user: User = Depends(require_role("admin", "censeur"))):
    sessions = db.query(DeliberationSession).filter(
        DeliberationSession.university_id == current_user.university_id
    ).order_by(DeliberationSession.created_at.desc()).all()

    return [{
        "id": s.id,
        "title": s.title,
        "filiere": s.filiere,
        "level": s.level,
        "academic_year": s.academic_year,
        "session_date": s.session_date.isoformat() if s.session_date else None,
        "status": s.status,
        "jury_members": s.jury_members,
        "rule_id": s.rule_id,
        "decisions_count": len(s.decisions),
        "created_at": s.created_at.isoformat() if s.created_at else None,
    } for s in sessions]


@router.post("/sessions")
def create_session(data: SessionCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin", "censeur"))):
    session_date = None
    if data.session_date:
        try:
            session_date = datetime.fromisoformat(data.session_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Format de date invalide")

    new_session = DeliberationSession(
        title=data.title,
        filiere=data.filiere,
        level=data.level,
        academic_year=data.academic_year,
        session_date=session_date,
        jury_members=data.jury_members,
        rule_id=data.rule_id,
        university_id=current_user.university_id,
        created_by=current_user.id
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return new_session


@router.get("/sessions/{session_id}")
def get_session_detail(session_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin", "censeur"))):
    session = db.query(DeliberationSession).filter(
        DeliberationSession.id == session_id,
        DeliberationSession.university_id == current_user.university_id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session non trouvée")
    return session


@router.delete("/sessions/{session_id}")
def delete_session(session_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin"))):
    session = db.query(DeliberationSession).filter(
        DeliberationSession.id == session_id,
        DeliberationSession.university_id == current_user.university_id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session non trouvée")
    db.delete(session)
    db.commit()
    return {"message": "Session supprimée"}


# ==========================================
# ⚖️ DÉCISIONS (avec proposition automatique)
# ==========================================
def _compute_decision(average: float, failed_count: int, rule: Optional[DeliberationRule]) -> str:
    """Propose une décision selon la règle de validation active."""
    min_avg = rule.min_average if rule else 10.0
    max_failed = rule.max_failed_courses if rule else 2
    catchup_min = rule.catchup_min_average if rule else 8.0

    if average >= min_avg and failed_count == 0:
        return "admis"
    if average >= catchup_min and failed_count <= max_failed:
        return "rattrapage"
    return "redouble"


@router.get("/sessions/{session_id}/proposals")
def get_decision_proposals(session_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin", "censeur"))):
    """
    ✅ Calcule automatiquement une proposition de décision pour chaque étudiant
    de la filière/niveau de la session, à partir de ses notes réelles.
    Le jury peut ensuite valider ou modifier chaque proposition.
    """
    session = db.query(DeliberationSession).filter(
        DeliberationSession.id == session_id,
        DeliberationSession.university_id == current_user.university_id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session non trouvée")

    rule = db.query(DeliberationRule).filter(DeliberationRule.id == session.rule_id).first() if session.rule_id else None

    students = db.query(Student).filter(
        Student.university_id == current_user.university_id,
        Student.filiere == session.filiere,
        Student.level == session.level
    ).all()

    existing_decisions = {d.student_id: d for d in session.decisions}

    results = []
    for student in students:
        grades = db.query(Grade).filter(Grade.student_id == student.id, Grade.status == "validated").all()
        scored = [g.score for g in grades if g.score is not None]
        average = round(sum(scored) / len(scored), 2) if scored else 0.0
        failed_count = len([g for g in grades if g.score is not None and g.score < 10])

        existing = existing_decisions.get(student.id)
        results.append({
            "student_id": student.id,
            "student_name": f"{student.first_name} {student.last_name}",
            "matricule": student.matricule,
            "average": average,
            "failed_courses_count": failed_count,
            "proposed_decision": _compute_decision(average, failed_count, rule),
            "final_decision": existing.decision if existing else None,
            "decision_id": existing.id if existing else None,
        })

    return results


class DecisionSave(BaseModel):
    student_id: int
    average: float
    failed_courses_count: int
    decision: str
    comment: Optional[str] = None


@router.post("/sessions/{session_id}/decisions")
def save_decision(session_id: int, data: DecisionSave, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin", "censeur"))):
    session = db.query(DeliberationSession).filter(
        DeliberationSession.id == session_id,
        DeliberationSession.university_id == current_user.university_id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session non trouvée")

    if data.decision not in ("admis", "rattrapage", "redouble", "exclu"):
        raise HTTPException(status_code=400, detail="Décision invalide")

    existing = db.query(DeliberationDecision).filter(
        DeliberationDecision.session_id == session_id,
        DeliberationDecision.student_id == data.student_id
    ).first()

    if existing:
        existing.average = data.average
        existing.failed_courses_count = data.failed_courses_count
        existing.decision = data.decision
        existing.comment = data.comment
        db.commit()
        db.refresh(existing)
        return existing

    new_decision = DeliberationDecision(
        session_id=session_id,
        student_id=data.student_id,
        average=data.average,
        failed_courses_count=data.failed_courses_count,
        decision=data.decision,
        comment=data.comment
    )
    db.add(new_decision)
    db.commit()
    db.refresh(new_decision)
    return new_decision


@router.post("/sessions/{session_id}/complete")
def complete_session(session_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin", "censeur"))):
    """Clôture une session : elle devient consultable dans les procès-verbaux."""
    session = db.query(DeliberationSession).filter(
        DeliberationSession.id == session_id,
        DeliberationSession.university_id == current_user.university_id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session non trouvée")

    session.status = "completed"
    session.completed_at = datetime.utcnow()
    db.commit()
    return {"message": "Session clôturée avec succès"}


# ==========================================
# 📄 PROCÈS-VERBAUX (sessions clôturées)
# ==========================================
@router.get("/minutes")
def get_minutes(db: Session = Depends(get_db), current_user: User = Depends(require_role("admin", "censeur"))):
    """Liste des sessions clôturées, consultables comme procès-verbaux."""
    sessions = db.query(DeliberationSession).filter(
        DeliberationSession.university_id == current_user.university_id,
        DeliberationSession.status == "completed"
    ).order_by(DeliberationSession.completed_at.desc()).all()

    return [{
        "id": s.id,
        "title": s.title,
        "filiere": s.filiere,
        "level": s.level,
        "academic_year": s.academic_year,
        "jury_members": s.jury_members,
        "completed_at": s.completed_at.isoformat() if s.completed_at else None,
        "decisions_count": len(s.decisions),
        "admis_count": len([d for d in s.decisions if d.decision == "admis"]),
    } for s in sessions]


@router.get("/minutes/{session_id}")
def get_minute_detail(session_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin", "censeur"))):
    """Détail complet d'un procès-verbal : session + toutes les décisions."""
    session = db.query(DeliberationSession).filter(
        DeliberationSession.id == session_id,
        DeliberationSession.university_id == current_user.university_id,
        DeliberationSession.status == "completed"
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Procès-verbal non trouvé")

    decisions = []
    for d in session.decisions:
        student = db.query(Student).filter(Student.id == d.student_id).first()
        decisions.append({
            "student_name": f"{student.first_name} {student.last_name}" if student else "Inconnu",
            "matricule": student.matricule if student else "-",
            "average": d.average,
            "decision": d.decision,
            "comment": d.comment
        })

    return {
        "id": session.id,
        "title": session.title,
        "filiere": session.filiere,
        "level": session.level,
        "academic_year": session.academic_year,
        "jury_members": session.jury_members,
        "completed_at": session.completed_at.isoformat() if session.completed_at else None,
        "decisions": decisions
    }
