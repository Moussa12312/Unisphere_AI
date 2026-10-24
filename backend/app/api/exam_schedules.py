from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, date, timedelta
from typing import List, Optional
from app.database.connection import SessionLocal
from app.models.exam_session import ExamSession
from app.models.exam_schedule import ExamSchedule
from app.models.class_room import ClassRoom
from app.models.course import Course
from app.models.teacher import Teacher
from app.models.user import User
from app.core.dependencies import require_role

router = APIRouter(prefix="/exam-sessions", tags=["Exam Schedules"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def format_slot(s: ExamSchedule, db: Session):
    course = db.query(Course).filter(Course.id == s.course_id).first()
    class_room = db.query(ClassRoom).filter(ClassRoom.id == s.class_id).first()
    supervisor = db.query(Teacher).filter(Teacher.id == s.supervisor_id).first() if s.supervisor_id else None

    return {
        "id": s.id,
        "session_id": s.session_id,
        "class_id": s.class_id,
        "class_name": class_room.name if class_room else f"Classe {s.class_id}",
        "level": class_room.level if class_room else "",
        "course_id": s.course_id,
        "course_title": course.title if course else f"Matière {s.course_id}",
        "course_code": course.code if course else "",
        "exam_date": s.exam_date.isoformat() if s.exam_date else None,
        "start_time": s.start_time,
        "end_time": s.end_time,
        "time_slot": f"{s.start_time} - {s.end_time}",
        "room": s.room or "",
        "building": s.building or "",
        "supervisor_id": s.supervisor_id,
        "supervisor_name": s.supervisor_name or (f"{supervisor.first_name} {supervisor.last_name}" if supervisor else ""),
        "notes": s.notes or ""
    }


@router.get("/{session_id}/schedules")
def get_session_schedules(
    session_id: int,
    class_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "teacher", "censeur", "student"))
):
    """Récupère toutes les épreuves planifiées pour une session d'examen donnée"""
    session = db.query(ExamSession).filter(
        ExamSession.id == session_id,
        ExamSession.university_id == current_user.university_id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session d'examen introuvable")

    query = db.query(ExamSchedule).filter(
        ExamSchedule.session_id == session_id,
        ExamSchedule.university_id == current_user.university_id
    )

    if class_id:
        query = query.filter(ExamSchedule.class_id == class_id)

    schedules = query.order_by(ExamSchedule.exam_date.asc(), ExamSchedule.start_time.asc()).all()
    return [format_slot(s, db) for s in schedules]


@router.post("/{session_id}/schedules")
def create_exam_schedule(
    session_id: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "censeur"))
):
    """Ajoute une épreuve d'examen au calendrier de la session"""
    session = db.query(ExamSession).filter(
        ExamSession.id == session_id,
        ExamSession.university_id == current_user.university_id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session d'examen introuvable")

    try:
        raw_date = data.get("exam_date")
        if isinstance(raw_date, str):
            exam_d = datetime.strptime(raw_date[:10], "%Y-%m-%d").date()
        else:
            exam_d = raw_date
    except Exception:
        raise HTTPException(status_code=400, detail="Format de date invalide (AAAA-MM-JJ)")

    class_id = int(data.get("class_id"))
    course_id = int(data.get("course_id"))
    start_time = data.get("start_time", "08:30").strip()
    end_time = data.get("end_time", "10:30").strip()
    room = (data.get("room") or "").strip() or None
    building = (data.get("building") or "").strip() or None
    supervisor_id = int(data["supervisor_id"]) if data.get("supervisor_id") else None
    supervisor_name = (data.get("supervisor_name") or "").strip() or None

    # Conflit de salle
    if room:
        room_conflict = db.query(ExamSchedule).filter(
            ExamSchedule.session_id == session_id,
            ExamSchedule.exam_date == exam_d,
            ExamSchedule.room == room,
            ExamSchedule.start_time < end_time,
            ExamSchedule.end_time > start_time
        ).first()
        if room_conflict:
            raise HTTPException(
                status_code=400,
                detail=f"La salle {room} est déjà occupée sur ce créneau ({room_conflict.start_time} - {room_conflict.end_time})"
            )

    slot = ExamSchedule(
        session_id=session_id,
        class_id=class_id,
        course_id=course_id,
        exam_date=exam_d,
        start_time=start_time,
        end_time=end_time,
        room=room,
        building=building,
        supervisor_id=supervisor_id,
        supervisor_name=supervisor_name,
        notes=data.get("notes"),
        university_id=current_user.university_id
    )

    db.add(slot)
    db.commit()
    db.refresh(slot)

    return format_slot(slot, db)


@router.put("/{session_id}/schedules/{schedule_id}")
def update_exam_schedule(
    session_id: int,
    schedule_id: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "censeur"))
):
    """Modifie une épreuve d'examen"""
    slot = db.query(ExamSchedule).filter(
        ExamSchedule.id == schedule_id,
        ExamSchedule.session_id == session_id,
        ExamSchedule.university_id == current_user.university_id
    ).first()

    if not slot:
        raise HTTPException(status_code=404, detail="Épreuve introuvable")

    if "exam_date" in data and data["exam_date"]:
        slot.exam_date = datetime.strptime(data["exam_date"][:10], "%Y-%m-%d").date()
    if "class_id" in data:
        slot.class_id = int(data["class_id"])
    if "course_id" in data:
        slot.course_id = int(data["course_id"])
    if "start_time" in data:
        slot.start_time = data["start_time"].strip()
    if "end_time" in data:
        slot.end_time = data["end_time"].strip()
    if "room" in data:
        slot.room = (data["room"] or "").strip() or None
    if "building" in data:
        slot.building = (data["building"] or "").strip() or None
    if "supervisor_id" in data:
        slot.supervisor_id = int(data["supervisor_id"]) if data["supervisor_id"] else None
    if "supervisor_name" in data:
        slot.supervisor_name = (data["supervisor_name"] or "").strip() or None
    if "notes" in data:
        slot.notes = data.get("notes")

    db.commit()
    db.refresh(slot)
    return format_slot(slot, db)


@router.delete("/{session_id}/schedules/{schedule_id}")
def delete_exam_schedule(
    session_id: int,
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "censeur"))
):
    """Supprime une épreuve d'examen"""
    slot = db.query(ExamSchedule).filter(
        ExamSchedule.id == schedule_id,
        ExamSchedule.session_id == session_id,
        ExamSchedule.university_id == current_user.university_id
    ).first()

    if not slot:
        raise HTTPException(status_code=404, detail="Épreuve introuvable")

    db.delete(slot)
    db.commit()
    return {"message": "Épreuve supprimée avec succès"}


@router.get("/{session_id}/matrix")
def get_session_matrix(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "teacher", "censeur", "student"))
):
    """
    Retourne les données structurées en tableau matriciel :
    Dates & Horaires en lignes x Classes en colonnes
    (Format officiel conforme au tableau d'affichage des universités).
    """
    session = db.query(ExamSession).filter(
        ExamSession.id == session_id,
        ExamSession.university_id == current_user.university_id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session d'examen introuvable")

    # Toutes les épreuves de la session
    schedules = db.query(ExamSchedule).filter(
        ExamSchedule.session_id == session_id,
        ExamSchedule.university_id == current_user.university_id
    ).order_by(ExamSchedule.exam_date.asc(), ExamSchedule.start_time.asc()).all()

    # Classes concernées ou toutes les classes
    used_class_ids = {s.class_id for s in schedules}
    if used_class_ids:
        classes = db.query(ClassRoom).filter(
            ClassRoom.id.in_(used_class_ids)
        ).order_by(ClassRoom.level.asc(), ClassRoom.name.asc()).all()
    else:
        classes = db.query(ClassRoom).filter(
            ClassRoom.university_id == current_user.university_id
        ).order_by(ClassRoom.level.asc(), ClassRoom.name.asc()).all()

    classes_list = [{"id": c.id, "name": c.name, "level": c.level, "room": c.room} for c in classes]

    # Générer la liste des jours entre start_date et end_date (en excluant les dimanches par défaut)
    dates_list = []
    if session.start_date and session.end_date:
        cur = session.start_date
        while cur <= session.end_date:
            if cur.weekday() != 6:  # 6 = Dimanche
                dates_list.append(cur.isoformat())
            cur += timedelta(days=1)

    # Récupérer tous les créneaux horaires uniques utilisés
    used_slots = set()
    for s in schedules:
        used_slots.add(f"{s.start_time} - {s.end_time}")
    
    # Créneaux standards par défaut si aucun
    standard_slots = ["08:30 - 10:30", "11:00 - 13:00", "13:15 - 15:15"]
    all_slots = sorted(list(used_slots.union(set(standard_slots))))

    # Construire la grille : entries[date][slot][class_id]
    formatted_items = [format_slot(s, db) for s in schedules]

    return {
        "session": {
            "id": session.id,
            "name": session.name,
            "session_type": session.session_type,
            "start_date": session.start_date.isoformat() if session.start_date else None,
            "end_date": session.end_date.isoformat() if session.end_date else None,
            "status": session.status,
            "description": session.description
        },
        "classes": classes_list,
        "dates": dates_list,
        "time_slots": all_slots,
        "items": formatted_items
    }
