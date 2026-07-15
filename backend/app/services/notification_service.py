from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.notification import Notification
from datetime import datetime


def create_notification(
    db: Session,
    title: str,
    message: str,
    notification_type: str,
    target_roles: list[str] = None,
    created_by: int = None,
    recipient_id: int = None,
    extra_data: dict = None,
    university_id: int = None,
    type: str = "info"
):
    """Crée une notification ciblée"""
    notification = Notification(
        title=title,
        message=message,
        notification_type=notification_type,
        type=type,
        target_roles=target_roles,
        created_by=created_by,
        recipient_id=recipient_id,
        extra_data=extra_data,
        university_id=university_id
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


def get_user_notifications(
    db: Session,
    user_id: int,
    user_role: str,
    university_id: int = None,
    unread_only: bool = False
):
    """Récupère les notifications pour un utilisateur spécifique"""
    query = db.query(Notification)
    
    if university_id:
        query = query.filter(Notification.university_id == university_id)
    
    query = query.filter(
        or_(
            Notification.target_roles.contains([user_role]),
            Notification.recipient_id == user_id,
            Notification.target_roles == None
        )
    )
    
    if unread_only:
        query = query.filter(Notification.is_read == False)
    
    return query.order_by(Notification.created_at.desc()).limit(50).all()


def mark_as_read(db: Session, notification_id: int, user_id: int):
    """Marque une notification comme lue"""
    notification = db.query(Notification).filter(
        Notification.id == notification_id
    ).first()
    
    if notification:
        notification.is_read = True
        notification.read_at = datetime.now()
        db.commit()
    
    return notification


def mark_all_as_read(db: Session, user_id: int, user_role: str, university_id: int = None):
    """Marque toutes les notifications comme lues"""
    notifications = get_user_notifications(
        db, user_id, user_role, university_id, unread_only=True
    )
    
    for n in notifications:
        n.is_read = True
        n.read_at = datetime.now()
    
    db.commit()
    return len(notifications)


def get_unread_count(db: Session, user_id: int, user_role: str, university_id: int = None):
    """Compte les notifications non lues"""
    query = db.query(Notification).filter(
        or_(
            Notification.target_roles.contains([user_role]),
            Notification.recipient_id == user_id,
            Notification.target_roles == None
        ),
        Notification.is_read == False
    )
    
    if university_id:
        query = query.filter(Notification.university_id == university_id)
    
    return query.count()