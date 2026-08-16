from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.connection import SessionLocal
from app.models.class_room import ClassRoom
from app.models.announcement import Announcement
from app.models.filiere import Filiere
from app.models.teacher import Teacher
from app.models.user import User
from app.core.dependencies import get_current_user, require_role
from datetime import datetime

router = APIRouter(prefix="/classes", tags=["Classes"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/")
def create_class(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "censeur"))
):
    new_class = ClassRoom(
        name=data.get("name"),
        filiere_id=data.get("filiere_id"),
        level=data.get("level"),
        room=data.get("room"),
        building=data.get("building"),
        capacity=data.get("capacity"),
        academic_year=data.get("academic_year"),
        main_teacher_id=data.get("main_teacher_id"),
        university_id=current_user.university_id
    )
    
    db.add(new_class)
    db.commit()
    db.refresh(new_class)
    
    return new_class

@router.get("/")
def get_classes(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "teacher", "censeur"))
):
    classes = db.query(ClassRoom).filter(
        ClassRoom.university_id == current_user.university_id
    ).all()
    
    result = []
    for c in classes:
        filiere_name = ""
        if c.filiere_id:
            filiere = db.query(Filiere).filter(Filiere.id == c.filiere_id).first()
            if filiere:
                filiere_name = filiere.name
        
        teacher_name = ""
        if c.main_teacher_id:
            teacher = db.query(Teacher).filter(Teacher.id == c.main_teacher_id).first()
            if teacher:
                teacher_name = f"{teacher.first_name} {teacher.last_name}"
        
        result.append({
            "id": c.id,
            "name": c.name,
            "filiere_id": c.filiere_id,
            "filiere_name": filiere_name,
            "level": c.level,
            "room": c.room,
            "building": c.building,
            "capacity": c.capacity,
            "academic_year": c.academic_year,
            "main_teacher_id": c.main_teacher_id,
            "main_teacher_name": teacher_name,
            "university_id": c.university_id
        })
    
    return result

@router.get("/{class_id}")
def get_class(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "teacher", "censeur"))
):
    class_room = db.query(ClassRoom).filter(
        ClassRoom.id == class_id,
        ClassRoom.university_id == current_user.university_id
    ).first()
    
    if not class_room:
        raise HTTPException(status_code=404, detail="Classe non trouvée")
    
    filiere_name = ""
    if class_room.filiere_id:
        filiere = db.query(Filiere).filter(Filiere.id == class_room.filiere_id).first()
        if filiere:
            filiere_name = filiere.name
    
    teacher_name = ""
    if class_room.main_teacher_id:
        teacher = db.query(Teacher).filter(Teacher.id == class_room.main_teacher_id).first()
        if teacher:
            teacher_name = f"{teacher.first_name} {teacher.last_name}"
            
    return {
        "id": class_room.id,
        "name": class_room.name,
        "filiere_id": class_room.filiere_id,
        "filiere_name": filiere_name,
        "level": class_room.level,
        "room": class_room.room,
        "building": class_room.building,
        "capacity": class_room.capacity,
        "academic_year": class_room.academic_year,
        "main_teacher_id": class_room.main_teacher_id,
        "main_teacher_name": teacher_name,
        "university_id": class_room.university_id
    }

@router.put("/{class_id}")
def update_class(
    class_id: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary"))
):
    class_room = db.query(ClassRoom).filter(
        ClassRoom.id == class_id,
        ClassRoom.university_id == current_user.university_id
    ).first()
    
    if not class_room:
        raise HTTPException(status_code=404, detail="Classe non trouvée")
    
    old_room = class_room.room
    old_building = class_room.building
    new_room = data.get("room", class_room.room)
    new_building = data.get("building", class_room.building)
    
    if "name" in data:
        class_room.name = data["name"]
    if "filiere_id" in data:
        class_room.filiere_id = data["filiere_id"]
    if "level" in data:
        class_room.level = data["level"]
    if "room" in data:
        class_room.room = data["room"]
    if "building" in data:
        class_room.building = data["building"]
    if "capacity" in data:
        class_room.capacity = data["capacity"]
    if "academic_year" in data:
        class_room.academic_year = data["academic_year"]
    if "main_teacher_id" in data:
        class_room.main_teacher_id = data["main_teacher_id"]
    
    db.commit()
    db.refresh(class_room)
    
    # ✅ Annonce automatique si changement de salle
    if old_room != new_room or old_building != new_building:
        announcement = Announcement(
            title=f"📢 Changement de salle - {class_room.name}",
            content=f"La classe {class_room.name} change de salle.\n\nAncienne salle : {old_room or 'Non définie'} ({old_building or 'Non défini'})\nNouvelle salle : {new_room or 'Non définie'} ({new_building or 'Non défini'})\n\nDate effective : Dès maintenant",
            category="room_change",
            priority="high",
            target_audience="all",
            is_published=True,
            published_at=datetime.utcnow(),
            university_id=current_user.university_id,
            created_by=current_user.id
        )
        db.add(announcement)
        db.commit()
    
    return class_room

@router.delete("/{class_id}")
def delete_class(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "censeur", "teacher"))
):
    class_room = db.query(ClassRoom).filter(
        ClassRoom.id == class_id,
        ClassRoom.university_id == current_user.university_id
    ).first()
    
    if not class_room:
        raise HTTPException(status_code=404, detail="Classe non trouvée")
    
    db.delete(class_room)
    db.commit()
    
    return {"message": "Classe supprimée"}