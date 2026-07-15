from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, cast, String
from datetime import datetime, timedelta
from app.database.connection import SessionLocal
from app.models.notification import Notification
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.course import Course
from app.models.user import User
from app.core.dependencies import require_role
from app.core.dependencies import get_current_user  

router = APIRouter(prefix="/notifications", tags=["Notifications"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def generate_notifications(db: Session, university_id: int, user_role: str, user_id: int) -> list:
    """Génère et SAUVEGARDE des notifications dynamiques en BDD"""
    notifications = []
    now = datetime.utcnow()
    
    # ==========================================
    # NOTIFICATIONS POUR ADMIN
    # ==========================================
    if user_role == "admin":
        # 1. Nouveaux étudiants (dernières 24h)
        new_students = db.query(func.count(Student.id)).filter(
            Student.university_id == university_id,
            Student.created_at >= now - timedelta(hours=24)
        ).scalar() or 0
        
        if new_students > 0:
            notif_data = {
                "title": "🎓 Nouvelles inscriptions",
                "message": f"{new_students} nouvel{'s' if new_students > 1 else ''} étudiant{'s' if new_students > 1 else ''} inscrit{'s' if new_students > 1 else ''}",
                "type": "success",
                "notification_type": "student_enrolled",
                "university_id": university_id,
                "target_roles": ["admin"],
                "created_by": user_id
            }
            
            # ✅ Vérifier si cette notification existe déjà (dernières 24h)
            existing = db.query(Notification).filter(
                Notification.university_id == university_id,
                Notification.notification_type == "student_enrolled",
                Notification.created_at >= now - timedelta(hours=24)
            ).first()
            
            if not existing:
                new_notif = Notification(**notif_data)
                db.add(new_notif)
                db.commit()
                db.refresh(new_notif)
                notifications.append({
                    "id": new_notif.id,
                    "title": new_notif.title,
                    "message": new_notif.message,
                    "type": new_notif.type,
                    "is_read": new_notif.is_read,
                    "time": new_notif.created_at.strftime("%d/%m/%Y %H:%M"),
                    "notification_type": new_notif.notification_type
                })
        
        # 2. Enseignants sans cours
        teachers_with_courses = db.query(Course.teacher_id).filter(
            Course.university_id == university_id,
            Course.teacher_id.isnot(None)
        ).distinct().all()
        
        teachers_with_courses_ids = [t[0] for t in teachers_with_courses if t[0]]
        
        if teachers_with_courses_ids:
            teachers_without_courses = db.query(func.count(Teacher.id)).filter(
                Teacher.university_id == university_id,
                ~Teacher.id.in_(teachers_with_courses_ids)
            ).scalar() or 0
        else:
            total_teachers = db.query(func.count(Teacher.id)).filter(
                Teacher.university_id == university_id
            ).scalar() or 0
            teachers_without_courses = total_teachers
        
        if teachers_without_courses > 0:
            notif_data = {
                "title": "⚠️ Enseignants sans cours",
                "message": f"{teachers_without_courses} enseignant{'s' if teachers_without_courses > 1 else ''} sans cours assigné{'s' if teachers_without_courses > 1 else ''}",
                "type": "warning",
                "notification_type": "teacher_no_course",
                "university_id": university_id,
                "target_roles": ["admin"],
                "created_by": user_id
            }
            
            existing = db.query(Notification).filter(
                Notification.university_id == university_id,
                Notification.notification_type == "teacher_no_course",
                Notification.created_at >= now - timedelta(hours=24)
            ).first()
            
            if not existing:
                new_notif = Notification(**notif_data)
                db.add(new_notif)
                db.commit()
                db.refresh(new_notif)
                notifications.append({
                    "id": new_notif.id,
                    "title": new_notif.title,
                    "message": new_notif.message,
                    "type": new_notif.type,
                    "is_read": new_notif.is_read,
                    "time": new_notif.created_at.strftime("%d/%m/%Y %H:%M"),
                    "notification_type": new_notif.notification_type
                })
        
        # 3. Cours créés récemment
        new_courses = db.query(func.count(Course.id)).filter(
            Course.university_id == university_id,
            Course.created_at >= now - timedelta(hours=24)
        ).scalar() or 0
        
        if new_courses > 0:
            notif_data = {
                "title": "📚 Nouveaux cours",
                "message": f"{new_courses} nouveau{'x' if new_courses > 1 else ''} cours créé{'s' if new_courses > 1 else ''}",
                "type": "info",
                "notification_type": "course_created",
                "university_id": university_id,
                "target_roles": ["admin"],
                "created_by": user_id
            }
            
            existing = db.query(Notification).filter(
                Notification.university_id == university_id,
                Notification.notification_type == "course_created",
                Notification.created_at >= now - timedelta(hours=24)
            ).first()
            
            if not existing:
                new_notif = Notification(**notif_data)
                db.add(new_notif)
                db.commit()
                db.refresh(new_notif)
                notifications.append({
                    "id": new_notif.id,
                    "title": new_notif.title,
                    "message": new_notif.message,
                    "type": new_notif.type,
                    "is_read": new_notif.is_read,
                    "time": new_notif.created_at.strftime("%d/%m/%Y %H:%M"),
                    "notification_type": new_notif.notification_type
                })
    
    # ==========================================
    # NOTIFICATIONS POUR SECRETARY
    # ==========================================
    elif user_role == "secretary":
        new_students = db.query(func.count(Student.id)).filter(
            Student.university_id == university_id,
            Student.created_at >= now - timedelta(hours=24)
        ).scalar() or 0
        
        if new_students > 0:
            notif_data = {
                "title": "🎓 Nouvelles inscriptions",
                "message": f"{new_students} nouvel{'s' if new_students > 1 else ''} étudiant{'s' if new_students > 1 else ''} inscrit{'s' if new_students > 1 else ''}",
                "type": "success",
                "notification_type": "student_enrolled",
                "university_id": university_id,
                "target_roles": ["secretary"],
                "created_by": user_id
            }
            
            existing = db.query(Notification).filter(
                Notification.university_id == university_id,
                Notification.notification_type == "student_enrolled",
                Notification.created_at >= now - timedelta(hours=24)
            ).first()
            
            if not existing:
                new_notif = Notification(**notif_data)
                db.add(new_notif)
                db.commit()
                db.refresh(new_notif)
                notifications.append({
                    "id": new_notif.id,
                    "title": new_notif.title,
                    "message": new_notif.message,
                    "type": new_notif.type,
                    "is_read": new_notif.is_read,
                    "time": new_notif.created_at.strftime("%d/%m/%Y %H:%M"),
                    "notification_type": new_notif.notification_type
                })
    
    # ==========================================
    # NOTIFICATIONS POUR TEACHER
    # ==========================================
    elif user_role == "teacher":
        teacher = db.query(Teacher).filter(
            Teacher.user_id == user_id,
            Teacher.university_id == university_id
        ).first()
        
        if teacher:
            new_courses = db.query(func.count(Course.id)).filter(
                Course.teacher_id == teacher.id,
                Course.university_id == university_id,
                Course.created_at >= now - timedelta(hours=48)
            ).scalar() or 0
            
            if new_courses > 0:
                notif_data = {
                    "title": "📚 Nouveaux cours assignés",
                    "message": f"{new_courses} nouveau{'x' if new_courses > 1 else ''} cours vous ont été assigné{'s' if new_courses > 1 else ''}",
                    "type": "info",
                    "notification_type": "course_assigned",
                    "university_id": university_id,
                    "recipient_id": user_id,
                    "created_by": user_id
                }
                
                existing = db.query(Notification).filter(
                    Notification.university_id == university_id,
                    Notification.notification_type == "course_assigned",
                    Notification.recipient_id == user_id,
                    Notification.created_at >= now - timedelta(hours=48)
                ).first()
                
                if not existing:
                    new_notif = Notification(**notif_data)
                    db.add(new_notif)
                    db.commit()
                    db.refresh(new_notif)
                    notifications.append({
                        "id": new_notif.id,
                        "title": new_notif.title,
                        "message": new_notif.message,
                        "type": new_notif.type,
                        "is_read": new_notif.is_read,
                        "time": new_notif.created_at.strftime("%d/%m/%Y %H:%M"),
                        "notification_type": new_notif.notification_type
                    })
    
    return notifications


# ✅✅✅ FONCTION CRITIQUE : Filtrage par rôle compatible PostgreSQL
def filter_notifications_by_role(query, user_role: str, user_id: int):
    """Filtre les notifications par rôle - Compatible PostgreSQL JSON"""
    return query.filter(
        or_(
            # ✅ Utiliser cast pour convertir JSON en texte
            cast(Notification.target_roles, String).like(f'%"{user_role}"%'),
            # Notifications spécifiques à cet utilisateur
            Notification.recipient_id == user_id,
            # Notifications générales (pas de rôle ciblé)
            Notification.target_roles == None
        )
    )

@router.get("/")
def get_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "censeur", "accountant", "guard", "teacher", "student"))
):
    """Récupère les notifications pour l'utilisateur connecté"""
    university_id = current_user.university_id
    user_role = current_user.role
    user_id = current_user.id
    
    
    # ✅ ÉTAPE 2 : Récupérer TOUTES les notifications filtrées par rôle
    query = db.query(Notification).filter(
        Notification.university_id == university_id
    )
    
    query = filter_notifications_by_role(query, user_role, user_id)
    
    db_notifications = query.order_by(Notification.created_at.desc()).limit(20).all()
    
    # ✅ ÉTAPE 3 : Convertir en JSON
    notifications = [
        {
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "type": n.type or "info",
            "is_read": n.is_read,
            "time": n.created_at.strftime("%d/%m/%Y %H:%M") if n.created_at else "",
            "notification_type": n.notification_type or "general",
            "extra_data": n.extra_data
        }
        for n in db_notifications
    ]
    
    return notifications

@router.post("/generate")
def generate_new_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "teacher"))
):
    """Génère les nouvelles notifications (à appeler manuellement ou via cron)"""
    university_id = current_user.university_id
    user_role = current_user.role
    user_id = current_user.id
    
    new_notifications = generate_notifications(db, university_id, user_role, user_id)
    
    return {
        "message": f"{len(new_notifications)} nouvelle(s) notification(s) générée(s)",
        "notifications": new_notifications
    }


@router.get("/unread")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "censeur", "accountant", "guard", "teacher", "student"))
):
    """Compte les notifications non lues"""
    university_id = current_user.university_id
    user_role = current_user.role
    user_id = current_user.id
    
    query = db.query(Notification).filter(
        Notification.university_id == university_id,
        Notification.is_read == False
    )
    
    # ✅ Utiliser la fonction de filtrage compatible PostgreSQL
    query = filter_notifications_by_role(query, user_role, user_id)
    
    count = query.count()
    return {"unread_count": count}


@router.post("/")
def create_notification(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Crée une notification (admin uniquement)"""
    title = data.get("title")
    message = data.get("message")
    type = data.get("type", "info")
    target_roles = data.get("target_roles", ["admin"])
    recipient_id = data.get("recipient_id")
    extra_data = data.get("extra_data")
    
    if not title or not message:
        raise HTTPException(status_code=400, detail="Titre et message requis")
    
    notification = Notification(
        university_id=current_user.university_id,
        title=title,
        message=message,
        type=type,
        notification_type="general",
        target_roles=target_roles,
        recipient_id=recipient_id,
        extra_data=extra_data,
        created_by=current_user.id
    )
    
    db.add(notification)
    db.commit()
    db.refresh(notification)
    
    return {"id": notification.id, "message": "Notification créée"}


# ✅ MARQUER UNE NOTIFICATION COMME LUE (Version unique et propre)
@router.put("/{notification_id}/read")
def mark_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Marque une notification comme lue"""
    # On vérifie que la notification appartient bien à l'université de l'utilisateur
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.university_id == current_user.university_id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification non trouvée")
    
    # Sécurité : on vérifie que l'utilisateur a le droit de la lire
    query = db.query(Notification).filter(Notification.id == notification_id)
    if not filter_notifications_by_role(query, current_user.role, current_user.id).first():
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    notification.is_read = True
    notification.read_at = datetime.now()
    db.commit()
    
    return {"message": "Notification marquée comme lue"}


# ✅ MARQUER TOUTES LES NOTIFICATIONS COMME LUES (CORRIGÉ)
@router.put("/mark-all-read")
def mark_all_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Marque toutes les notifications VISIBLES par l'utilisateur comme lues"""
    university_id = current_user.university_id
    user_role = current_user.role
    user_id = current_user.id
    
    # ✅ UTILISER LE MÊME FILTRE QUE LE GET /
    query = db.query(Notification).filter(
        Notification.university_id == university_id,
        Notification.is_read == False
    )
    
    # On applique le filtre par rôle (qui gère à la fois recipient_id ET target_roles)
    query = filter_notifications_by_role(query, user_role, user_id)
    
    notifications = query.all()
    
    for notif in notifications:
        notif.is_read = True
        notif.read_at = datetime.now()
    
    db.commit()
    
    return {"message": f"{len(notifications)} notifications marquées comme lues"}