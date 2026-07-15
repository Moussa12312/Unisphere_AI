from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from app.database.connection import SessionLocal
from app.models.announcement import Announcement
from app.models.user import User
from app.schemas.announcement import AnnouncementCreate, AnnouncementUpdate, AnnouncementResponse
from app.core.dependencies import require_role

router = APIRouter(prefix="/announcements", tags=["Announcements"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/")
def create_announcement(
    announcement_data: AnnouncementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary"))
):
    """Créer une nouvelle annonce."""
    new_announcement = Announcement(
        title=announcement_data.title,
        content=announcement_data.content,
        category=announcement_data.category,
        priority=announcement_data.priority,
        target_audience=announcement_data.target_audience,
        event_date=announcement_data.event_date,
        is_published=True,
        published_at=datetime.utcnow(),
        expires_at=announcement_data.expires_at,
        university_id=current_user.university_id,
        created_by=current_user.id
    )
    db.add(new_announcement)
    db.commit()
    db.refresh(new_announcement)
    return new_announcement


@router.get("/")
def get_announcements(
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=100),
    search: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "teacher", "student"))
):
    """Récupérer toutes les annonces (accessible à tous les rôles)."""
    query = db.query(Announcement).filter(
        Announcement.university_id == current_user.university_id,
        Announcement.is_published == True
    )
    
    if search:
        query = query.filter(
            (Announcement.title.ilike(f"%{search}%")) |
            (Announcement.content.ilike(f"%{search}%"))
        )
    
    if category:
        query = query.filter(Announcement.category == category)
    
    query = query.order_by(Announcement.published_at.desc())
    announcements = query.all()
    
    return {
        "data": announcements,
        "total": len(announcements),
        "page": page,
        "page_size": page_size,
        "total_pages": 1
    }


@router.put("/{announcement_id}")
def update_announcement(
    announcement_id: int,
    announcement_data: AnnouncementUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary"))
):
    """Modifier une annonce."""
    announcement = db.query(Announcement).filter(
        Announcement.id == announcement_id,
        Announcement.university_id == current_user.university_id
    ).first()
    
    if not announcement:
        raise HTTPException(status_code=404, detail="Annonce non trouvée")

    for field, value in announcement_data.dict(exclude_unset=True).items():
        setattr(announcement, field, value)

    db.commit()
    db.refresh(announcement)
    return announcement


@router.delete("/{announcement_id}")
def delete_announcement(
    announcement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary"))
):
    """Supprimer une annonce."""
    announcement = db.query(Announcement).filter(
        Announcement.id == announcement_id,
        Announcement.university_id == current_user.university_id
    ).first()
    
    if not announcement:
        raise HTTPException(status_code=404, detail="Annonce non trouvée")
    
    db.delete(announcement)
    db.commit()
    return {"message": "Annonce supprimée"}