from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.connection import SessionLocal
from app.models.schedule import Schedule
from app.models.course import Course
from app.models.class_room import ClassRoom
from app.models.teacher import Teacher
from app.models.user import User
from app.core.dependencies import require_role

router = APIRouter(prefix="/schedules", tags=["Schedules"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def time_overlaps(start1: str, end1: str, start2: str, end2: str) -> bool:
    return start1 < end2 and start2 < end1


# ✅ NOUVEAU : Endpoint pour vérifier les conflits
@router.post("/check-conflicts")
def check_conflicts_endpoint(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary"))
):
    """Vérifie les conflits et retourne la liste"""
    conflicts = []
    
    day_of_week = data.get("day_of_week")
    start_time = data.get("start_time")
    end_time = data.get("end_time")
    room = data.get("room")
    teacher_id = data.get("teacher_id")
    class_id = data.get("class_id")
    exclude_id = data.get("exclude_id")
    
    if not day_of_week or not start_time or not end_time:
        return {"conflicts": []}
    
    query = db.query(Schedule).filter(
        Schedule.day_of_week == day_of_week,
        Schedule.university_id == current_user.university_id
    )
    
    if exclude_id:
        query = query.filter(Schedule.id != exclude_id)
    
    schedules = query.all()
    
    for s in schedules:
        if not time_overlaps(start_time, end_time, s.start_time, s.end_time):
            continue
        
        # Conflit de SALLE
        if room and s.room and room == s.room:
            course = db.query(Course).filter(Course.id == s.course_id).first()
            conflicts.append({
                "field": "room",
                "message": "Salle déjà occupée"
            })
        
        # Conflit d'ENSEIGNANT
        if teacher_id and teacher_id == s.teacher_id:
            conflicts.append({
                "field": "teacher_id",
                "message": "Enseignant déjà occupé"
            })
        
        # Conflit de CLASSE
        if class_id and class_id == s.class_id:
            conflicts.append({
                "field": "class_id",
                "message": "Classe déjà en cours"
            })
    
    return {"conflicts": conflicts}


@router.post("/")
def create_schedule(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary"))
):
    new_schedule = Schedule(
        course_id=data.get("course_id"),
        class_id=data.get("class_id"),
        teacher_id=data.get("teacher_id"),
        room=data.get("room"),
        building=data.get("building"),
        day_of_week=data.get("day_of_week"),
        start_time=data.get("start_time"),
        end_time=data.get("end_time"),
        university_id=current_user.university_id
    )
    
    db.add(new_schedule)
    db.commit()
    db.refresh(new_schedule)
    
    return new_schedule


@router.get("/")
def get_schedules(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "teacher", "student"))
):
    schedules = db.query(Schedule).filter(
        Schedule.university_id == current_user.university_id
    ).all()
    
    result = []
    for s in schedules:
        course = db.query(Course).filter(Course.id == s.course_id).first()
        class_room = db.query(ClassRoom).filter(ClassRoom.id == s.class_id).first()
        teacher = db.query(Teacher).filter(Teacher.id == s.teacher_id).first()
        
        result.append({
            "id": s.id,
            "course_id": s.course_id,
            "course_title": course.title if course else "",
            "class_id": s.class_id,
            "class_name": class_room.name if class_room else "",
            "teacher_id": s.teacher_id,
            "teacher_name": f"{teacher.first_name} {teacher.last_name}" if teacher else "",
            "room": s.room,
            "building": s.building,
            "day_of_week": s.day_of_week,
            "start_time": s.start_time,
            "end_time": s.end_time,
            "university_id": s.university_id
        })
    
    return result


@router.put("/{schedule_id}")
def update_schedule(
    schedule_id: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary"))
):
    schedule = db.query(Schedule).filter(
        Schedule.id == schedule_id,
        Schedule.university_id == current_user.university_id
    ).first()
    
    if not schedule:
        raise HTTPException(status_code=404, detail="Emploi du temps non trouvé")
    
    if "course_id" in data:
        schedule.course_id = data["course_id"]
    if "class_id" in data:
        schedule.class_id = data["class_id"]
    if "teacher_id" in data:
        schedule.teacher_id = data["teacher_id"]
    if "room" in data:
        schedule.room = data["room"]
    if "building" in data:
        schedule.building = data["building"]
    if "day_of_week" in data:
        schedule.day_of_week = data["day_of_week"]
    if "start_time" in data:
        schedule.start_time = data["start_time"]
    if "end_time" in data:
        schedule.end_time = data["end_time"]
    
    db.commit()
    db.refresh(schedule)
    
    return schedule


@router.delete("/{schedule_id}")
def delete_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary"))
):
    schedule = db.query(Schedule).filter(
        Schedule.id == schedule_id,
        Schedule.university_id == current_user.university_id
    ).first()
    
    if not schedule:
        raise HTTPException(status_code=404, detail="Emploi du temps non trouvé")
    
    db.delete(schedule)
    db.commit()
    
    return {"message": "Emploi du temps supprimé"}