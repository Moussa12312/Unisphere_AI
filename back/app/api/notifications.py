"""
============================================================
MODULE DE NOTIFICATIONS - UniSphere AI
============================================================
Système de notifications sécurisé avec filtrage strict par rôle.

RÈGLES DE SÉCURITÉ :
- ADMIN : voit TOUTES les notifications de son université (supervision)
- Autres rôles : voient UNIQUEMENT :
  1. Notifications personnelles (recipient_id = user.id)
  2. Notifications ciblant explicitement leur rôle (target_roles)

AUCUNE notification système sans cible n'est visible par les non-admins.
============================================================
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_, cast, String, desc
from datetime import datetime, timedelta, timezone
from typing import Optional, List
from pydantic import BaseModel

from app.database.connection import SessionLocal
from app.models.notification import Notification
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.course import Course
from app.models.user import User
from app.core.dependencies import require_role, get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ============================================================
# CONFIGURATION : Mapping des types de notifications par rôle
# ============================================================
NOTIFICATION_ROLE_MAPPING = {
    # Notifications pour ADMIN uniquement
    'teacher_no_course': ['admin'],
    'system_alert': ['admin'],
    
    # Notifications pour ADMIN + SECRETARY
    'student_enrolled': ['admin', 'secretary'],
    'course_created': ['admin', 'secretary'],
    'document_uploaded': ['admin', 'secretary'],
    
    # Notifications pour ADMIN + ACCOUNTANT
    'payment_received': ['admin', 'accountant'],
    'payment_overdue': ['admin', 'accountant'],
    
    # Notifications pour TEACHER
    'course_assigned': ['teacher'],
    'schedule_change': ['teacher'],
    
    # Notifications pour STUDENT
    'document_validated': ['student'],
    'document_rejected': ['student'],
    'grade_published': ['student'],
    
    # Notifications pour ALUMNI
    'alumni_validated': ['alumni'],
    'mentorship_request': ['alumni'],
    
    # Notifications pour TOUS
    'announcement': ['admin', 'secretary', 'censeur', 'accountant', 
                     'teacher', 'student', 'guard', 'alumni'],
    'maintenance': ['admin', 'secretary', 'censeur', 'accountant',
                    'teacher', 'student', 'guard', 'alumni'],
}


# ============================================================
# FONCTION CRITIQUE : Filtrage STRICT par rôle
# ============================================================
def filter_notifications_by_role(
    query, 
    user_role: str, 
    user_id: int,
    university_id: int
):
    """
    Filtre les notifications de manière STRICTE et SÉCURISÉE.
    
    Règles :
    - ADMIN : voit toutes les notifications de son université
    - Autres rôles : 
      * Notifications personnelles (recipient_id = user_id)
      * Notifications ciblant leur rôle dans target_roles
    
    Args:
        query: Requête SQLAlchemy de base
        user_role: Rôle de l'utilisateur connecté
        user_id: ID de l'utilisateur connecté
        university_id: ID de l'université
        
    Returns:
        Requête filtrée
    """
    # ✅ ADMIN voit tout (droit de supervision)
    if user_role == "admin":
        return query.filter(Notification.university_id == university_id)
    
    # ✅ Autres rôles : filtrage strict
    # Construction du pattern JSON pour le rôle
    # On cherche : ["student"] ou ["admin", "student", "teacher"]
    role_pattern = f'%"{user_role}"%'
    
    return query.filter(
        and_(
            Notification.university_id == university_id,
            or_(
                # 1. Notifications personnelles (envoyées directement à cet utilisateur)
                Notification.recipient_id == user_id,
                
                # 2. Notifications ciblant ce rôle spécifique (JSON)
                cast(Notification.target_roles, String).like(role_pattern)
                
                # ❌ PAS de condition target_roles == None
                # Cela empêcherait les fuites entre rôles
            )
        )
    )


# ============================================================
# ENDPOINT : Récupérer les notifications
# ============================================================
@router.get("", include_in_schema=False) 
@router.get("/")
def get_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = Query(50, ge=1, le=100)
):
    """
    Récupère les notifications de l'utilisateur connecté.
    Filtrage strict par rôle appliqué automatiquement.
    """
    query = db.query(Notification)
    
    # ✅ Application du filtre de sécurité
    filtered_query = filter_notifications_by_role(
        query,
        current_user.role,
        current_user.id,
        current_user.university_id
    )
    
    # Tri : non lues d'abord, puis par date décroissante
    notifications = (
        filtered_query
        .order_by(
            Notification.is_read.asc(),  # Non lues en premier
            Notification.created_at.desc()  # Plus récentes d'abord
        )
        .limit(limit)
        .all()
    )
    
    return [
        {
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "type": n.type or "info",
            "notification_type": n.notification_type or "general",
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat() if n.created_at else None,
            "time": n.created_at.strftime("%d/%m/%Y %H:%M") if n.created_at else "",
            "extra_data": n.extra_data
        }
        for n in notifications
    ]



# ============================================================
# ENDPOINT : Compter les notifications non lues
# ============================================================
@router.get("/unread")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Compte les notifications non lues pour l'utilisateur connecté."""
    query = db.query(Notification).filter(
        Notification.is_read == False
    )
    
    filtered_query = filter_notifications_by_role(
        query,
        current_user.role,
        current_user.id,
        current_user.university_id
    )
    
    count = filtered_query.count()
    return {"unread_count": count}


# ============================================================
# ENDPOINT : Marquer une notification comme lue
# ============================================================
@router.put("/{notification_id}/read")
def mark_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Marque une notification spécifique comme lue."""
    # Récupérer la notification
    notification = db.query(Notification).filter(
        Notification.id == notification_id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification non trouvée")
    
    # ✅ Sécurité : vérifier que l'utilisateur a le droit de voir cette notification
    check_query = db.query(Notification).filter(
        Notification.id == notification_id
    )
    authorized_query = filter_notifications_by_role(
        check_query,
        current_user.role,
        current_user.id,
        current_user.university_id
    )
    
    if not authorized_query.first():
        raise HTTPException(
            status_code=403, 
            detail="Vous n'avez pas accès à cette notification"
        )
    
    # Marquer comme lue
    notification.is_read = True
    notification.read_at = datetime.now(timezone.utc)
    db.commit()
    
    return {
        "message": "Notification marquée comme lue",
        "notification_id": notification_id
    }


# ============================================================
# ENDPOINT : Marquer TOUTES les notifications comme lues
# ============================================================
@router.put("/mark-all-read")
def mark_all_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Marque toutes les notifications visibles par l'utilisateur comme lues."""
    query = db.query(Notification).filter(
        Notification.is_read == False
    )
    
    # ✅ Appliquer le même filtre que GET /
    filtered_query = filter_notifications_by_role(
        query,
        current_user.role,
        current_user.id,
        current_user.university_id
    )
    
    notifications = filtered_query.all()
    
    for notif in notifications:
        notif.is_read = True
        notif.read_at = datetime.now(timezone.utc)
    
    db.commit()
    
    return {
        "message": f"{len(notifications)} notification(s) marquée(s) comme lue(s)",
        "count": len(notifications)
    }


# ============================================================
# ENDPOINT : Créer une notification (ADMIN uniquement)
# ============================================================
class CreateNotificationRequest(BaseModel):
    title: str
    message: str
    type: Optional[str] = "info"
    notification_type: Optional[str] = "general"
    target_roles: Optional[List[str]] = None
    recipient_id: Optional[int] = None
    extra_data: Optional[dict] = None


@router.post("/")
def create_notification(
    data: CreateNotificationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Crée une notification personnalisée (admin uniquement)."""
    # Validation
    if not data.title or not data.message:
        raise HTTPException(
            status_code=400, 
            detail="Titre et message sont obligatoires"
        )
    
    # Si ni target_roles ni recipient_id, cibler admin par défaut
    if not data.target_roles and not data.recipient_id:
        data.target_roles = ["admin"]
    
    notification = Notification(
        university_id=current_user.university_id,
        title=data.title,
        message=data.message,
        type=data.type,
        notification_type=data.notification_type,
        target_roles=data.target_roles,
        recipient_id=data.recipient_id,
        extra_data=data.extra_data,
        created_by=current_user.id,
        is_read=False
    )
    
    db.add(notification)
    db.commit()
    db.refresh(notification)
    
    return {
        "id": notification.id,
        "message": "Notification créée avec succès"
    }


# ============================================================
# ENDPOINT : Supprimer une notification
# ============================================================
@router.delete("/{notification_id}")
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Supprime une notification (l'utilisateur doit y avoir accès)."""
    notification = db.query(Notification).filter(
        Notification.id == notification_id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification non trouvée")
    
    # Vérifier l'accès
    check_query = db.query(Notification).filter(
        Notification.id == notification_id
    )
    authorized_query = filter_notifications_by_role(
        check_query,
        current_user.role,
        current_user.id,
        current_user.university_id
    )
    
    if not authorized_query.first():
        raise HTTPException(
            status_code=403, 
            detail="Vous n'avez pas accès à cette notification"
        )
    
    db.delete(notification)
    db.commit()
    
    return {"message": "Notification supprimée"}


# ============================================================
# ENDPOINT : Générer des notifications automatiques
# ============================================================
@router.post("/generate")
def generate_notifications_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Génère les notifications automatiques basées sur l'état du système.
    Appelé au login ou périodiquement.
    """
    generated = generate_dynamic_notifications(
        db,
        current_user.university_id,
        current_user.role,
        current_user.id
    )
    
    return {
        "message": f"{len(generated)} notification(s) générée(s)",
        "count": len(generated)
    }


# ============================================================
# FONCTION : Génération dynamique de notifications
# ============================================================
def generate_dynamic_notifications(
    db: Session,
    university_id: int,
    user_role: str,
    user_id: int
) -> list:
    """
    Génère des notifications automatiques selon l'état de la BDD.
    Évite les doublons en vérifiant les dernières 24h.
    """
    notifications_created = []
    now = datetime.now(timezone.utc)
    cutoff_24h = now - timedelta(hours=24)
    
    def create_if_not_exists(
        title: str,
        message: str,
        notification_type: str,
        notif_type: str,
        target_roles: list
    ):
        """Crée une notification si elle n'existe pas déjà dans les dernières 24h."""
        existing = db.query(Notification).filter(
            Notification.university_id == university_id,
            Notification.notification_type == notification_type,
            Notification.created_at >= cutoff_24h
        ).first()
        
        if not existing:
            notif = Notification(
                university_id=university_id,
                title=title,
                message=message,
                type=notif_type,
                notification_type=notification_type,
                target_roles=target_roles,
                created_by=user_id,
                is_read=False
            )
            db.add(notif)
            db.commit()
            db.refresh(notif)
            notifications_created.append(notif.id)
    
    # ==========================================
    # POUR ADMIN
    # ==========================================
    if user_role == "admin":
        # Nouveaux étudiants inscrits (24h)
        new_students = db.query(func.count(Student.id)).filter(
            Student.university_id == university_id,
            Student.created_at >= cutoff_24h
        ).scalar() or 0
        
        if new_students > 0:
            create_if_not_exists(
                title="🎓 Nouvelles inscriptions",
                message=f"{new_students} nouvel{'s' if new_students > 1 else ''} étudiant{'s' if new_students > 1 else ''} inscrit{'s' if new_students > 1 else ''} dans les dernières 24h",
                notification_type="student_enrolled",
                notif_type="success",
                target_roles=["admin", "secretary"]
            )
        
        # Enseignants sans cours
        teachers_assigned = db.query(Course.teacher_id).filter(
            Course.university_id == university_id,
            Course.teacher_id.isnot(None)
        ).distinct().all()
        
        assigned_ids = [t[0] for t in teachers_assigned if t[0]]
        
        if assigned_ids:
            teachers_without = db.query(func.count(Teacher.id)).filter(
                Teacher.university_id == university_id,
                ~Teacher.id.in_(assigned_ids)
            ).scalar() or 0
        else:
            teachers_without = db.query(func.count(Teacher.id)).filter(
                Teacher.university_id == university_id
            ).scalar() or 0
        
        if teachers_without > 0:
            create_if_not_exists(
                title="⚠️ Enseignants sans cours",
                message=f"{teachers_without} enseignant{'s' if teachers_without > 1 else ''} sans cours assigné",
                notification_type="teacher_no_course",
                notif_type="warning",
                target_roles=["admin"]
            )
    
    # ==========================================
    # POUR SECRETARY
    # ==========================================
    elif user_role == "secretary":
        new_students = db.query(func.count(Student.id)).filter(
            Student.university_id == university_id,
            Student.created_at >= cutoff_24h
        ).scalar() or 0
        
        if new_students > 0:
            create_if_not_exists(
                title="🎓 Nouvelles inscriptions",
                message=f"{new_students} nouvel{'s' if new_students > 1 else ''} étudiant{'s' if new_students > 1 else ''} à traiter",
                notification_type="student_enrolled",
                notif_type="info",
                target_roles=["admin", "secretary"]
            )
    
    # ==========================================
    # POUR TEACHER
    # ==========================================
    elif user_role == "teacher":
        teacher = db.query(Teacher).filter(
            Teacher.user_id == user_id,
            Teacher.university_id == university_id
        ).first()
        
        if teacher:
            new_courses = db.query(func.count(Course.id)).filter(
                Course.teacher_id == teacher.id,
                Course.created_at >= cutoff_24h
            ).scalar() or 0
            
            if new_courses > 0:
                # Notification personnelle pour cet enseignant
                notif = Notification(
                    university_id=university_id,
                    title="📚 Nouveaux cours assignés",
                    message=f"{new_courses} nouveau{'x' if new_courses > 1 else ''} cours vous ont été assigné{'s' if new_courses > 1 else ''}",
                    type="info",
                    notification_type="course_assigned",
                    recipient_id=user_id,
                    created_by=user_id,
                    is_read=False
                )
                db.add(notif)
                db.commit()
                notifications_created.append(notif.id)
    
    return notifications_created


# ============================================================
# FONCTION UTILITAIRE : Créer une notification (pour autres modules)
# ============================================================
def create_notification_util(
    db: Session,
    university_id: int,
    title: str,
    message: str,
    notification_type: str = "general",
    notif_type: str = "info",
    target_roles: Optional[List[str]] = None,
    recipient_id: Optional[int] = None,
    extra_data: Optional[dict] = None
) -> Notification:
    """
    Fonction utilitaire pour créer une notification depuis n'importe quel module.
    
    Exemple d'utilisation dans students.py :
        from app.api.notifications import create_notification_util
        
        create_notification_util(
            db=db,
            university_id=student.university_id,
            title="📄 Nouveau document",
            message=f"{student.first_name} a uploadé un document",
            notification_type="document_uploaded",
            target_roles=["admin", "secretary"]
        )
    """
    # Déterminer les rôles cibles
    if not target_roles and not recipient_id:
        target_roles = NOTIFICATION_ROLE_MAPPING.get(notification_type, ["admin"])
    
    notification = Notification(
        university_id=university_id,
        title=title,
        message=message,
        type=notif_type,
        notification_type=notification_type,
        target_roles=target_roles,
        recipient_id=recipient_id,
        extra_data=extra_data,
        is_read=False
    )
    
    db.add(notification)
    db.commit()
    db.refresh(notification)
    
    return notification