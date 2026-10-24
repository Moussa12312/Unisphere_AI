from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.connection import SessionLocal
from app.models.room import Room
from app.models.class_room import ClassRoom
from app.models.schedule import Schedule
from app.models.user import User
from app.core.dependencies import require_role

router = APIRouter(prefix="/rooms", tags=["Rooms"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/")
def get_rooms(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "teacher", "censeur"))
):
    """
    Récupère la liste de toutes les salles de l'université.
    Auto-initialise les salles existantes depuis les classes et emplois du temps
    si elles n'ont pas encore été enregistrées dans la table 'rooms'.
    """
    univ_id = current_user.university_id

    # 1. Synchroniser / Récupérer les salles uniques depuis class_rooms
    classes_with_rooms = db.query(ClassRoom.room, ClassRoom.building).filter(
        ClassRoom.university_id == univ_id,
        ClassRoom.room != None,
        ClassRoom.room != ""
    ).distinct().all()

    schedules_with_rooms = db.query(Schedule.room, Schedule.building).filter(
        Schedule.university_id == univ_id,
        Schedule.room != None,
        Schedule.room != ""
    ).distinct().all()

    existing_room_names = {
        r.name.strip().lower() for r in db.query(Room).filter(Room.university_id == univ_id).all()
    }

    # Auto-population des salles existantes non encore dans la table 'rooms'
    to_add = []
    seen = set()

    for r_name, b_name in list(classes_with_rooms) + list(schedules_with_rooms):
        if not r_name:
            continue
        cleaned_name = r_name.strip()
        key = cleaned_name.lower()
        if key not in existing_room_names and key not in seen:
            seen.add(key)
            to_add.append(Room(
                name=cleaned_name,
                building=b_name.strip() if b_name else None,
                room_type="amphitheater" if "amphi" in key else "lab" if "lab" in key else "classroom",
                is_available=True,
                university_id=univ_id
            ))

    if to_add:
        try:
            db.add_all(to_add)
            db.commit()
        except Exception:
            db.rollback()

    # 2. Renvoyer toutes les salles triées par bâtiment et nom
    rooms = db.query(Room).filter(
        Room.university_id == univ_id
    ).order_by(Room.building.asc().nullslast(), Room.name.asc()).all()

    return [
        {
            "id": r.id,
            "name": r.name,
            "building": r.building,
            "capacity": r.capacity,
            "room_type": r.room_type,
            "is_available": r.is_available,
            "display_name": f"{r.name} ({r.building})" if r.building else r.name
        }
        for r in rooms
    ]


@router.post("/")
def create_room(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "censeur"))
):
    """Crée une nouvelle salle pour l'université"""
    univ_id = current_user.university_id
    name = (data.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Le nom de la salle est obligatoire")

    building = (data.get("building") or "").strip() or None
    capacity = int(data["capacity"]) if data.get("capacity") else None
    room_type = data.get("room_type") or "classroom"

    # Vérifier l'unicité
    existing = db.query(Room).filter(
        Room.university_id == univ_id,
        Room.name.ilike(name)
    ).first()

    if existing:
        return {
            "id": existing.id,
            "name": existing.name,
            "building": existing.building,
            "capacity": existing.capacity,
            "room_type": existing.room_type,
            "is_available": existing.is_available,
            "display_name": f"{existing.name} ({existing.building})" if existing.building else existing.name,
            "message": "Salle déjà existante"
        }

    new_room = Room(
        name=name,
        building=building,
        capacity=capacity,
        room_type=room_type,
        is_available=True,
        university_id=univ_id
    )

    db.add(new_room)
    db.commit()
    db.refresh(new_room)

    return {
        "id": new_room.id,
        "name": new_room.name,
        "building": new_room.building,
        "capacity": new_room.capacity,
        "room_type": new_room.room_type,
        "is_available": new_room.is_available,
        "display_name": f"{new_room.name} ({new_room.building})" if new_room.building else new_room.name
    }


@router.delete("/{room_id}")
def delete_room(
    room_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "censeur"))
):
    """Supprime une salle"""
    room = db.query(Room).filter(
        Room.id == room_id,
        Room.university_id == current_user.university_id
    ).first()

    if not room:
        raise HTTPException(status_code=404, detail="Salle non trouvée")

    db.delete(room)
    db.commit()
    return {"message": "Salle supprimée avec succès"}
