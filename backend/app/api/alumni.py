from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta, timezone
import secrets

from app.database.connection import SessionLocal
from app.models.alumni import AlumniProfile, AlumniInvitation, AlumniConnection, AlumniMessage
from app.models.student import Student
from app.models.user import User
from app.models.university import University 
from app.models.notification import Notification
from app.models.grade import Grade
from app.models.attendance import Attendance
from app.models.course import Course
from app.models.notification import Notification
from app.core.dependencies import require_role
from app.utils.email_service import send_alumni_invitation_email, is_email_configured, FRONTEND_URL

router = APIRouter(prefix="/alumni", tags=["Alumni"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ==========================================
# SCHEMAS
# ==========================================
class AlumniRegister(BaseModel):
    first_name: str
    last_name: str
    email: str
    password: str
    phone: Optional[str] = None
    filiere: Optional[str] = None
    domain: Optional[str] = None
    level: Optional[str] = None
    graduation_year: Optional[int] = None
    promotion: Optional[str] = None
    current_position: Optional[str] = None
    company: Optional[str] = None
    activity_domain: Optional[str] = None
    location: Optional[str] = None
    linkedin_url: Optional[str] = None
    career_path: Optional[str] = None
    difficulties: Optional[str] = None
    advice: Optional[str] = None
    skills: Optional[str] = None
    is_open_to_mentoring: bool = False
    is_open_to_internship: bool = False
    accepted_conditions: bool = False


class AlumniProfileUpdate(BaseModel):
    current_position: Optional[str] = None
    company: Optional[str] = None
    activity_domain: Optional[str] = None
    location: Optional[str] = None
    linkedin_url: Optional[str] = None
    website: Optional[str] = None
    career_path: Optional[str] = None
    difficulties: Optional[str] = None
    advice: Optional[str] = None
    skills: Optional[str] = None
    is_visible: Optional[bool] = None
    is_open_to_mentoring: Optional[bool] = None
    is_open_to_internship: Optional[bool] = None


class ConnectionRequest(BaseModel):
    alumni_id: int
    connection_type: str = "mentor"  # mentor, directeur_memoire, ami
    message: Optional[str] = None


class ChatMessage(BaseModel):
    receiver_id: int
    content: str


# ==========================================
# 🔗 1. INVITATIONS (Admin)
# ==========================================

@router.post("/invite")
def create_invitation(
    max_uses: int = 100,
    expires_days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Générer un lien d'invitation partagé"""
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(days=expires_days)

    invitation = AlumniInvitation(
        university_id=current_user.university_id,
        token=token,
        created_by=current_user.id,
        max_uses=max_uses,
        expires_at=expires_at
    )
    db.add(invitation)
    db.commit()
    db.refresh(invitation)


    invitation_url = f"{FRONTEND_URL}/register-alumni?token={token}"

    return {
        "id": invitation.id,
        "token": token,
        "url": invitation_url,
        "max_uses": max_uses,
        "expires_at": expires_at.isoformat(),
        "message": "Lien d'invitation créé avec succès"
    }


@router.get("/invitations")
def list_invitations(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Liste des invitations générées"""
    invitations = db.query(AlumniInvitation).filter(
        AlumniInvitation.university_id == current_user.university_id
    ).order_by(desc(AlumniInvitation.created_at)).all()

    return [
        {
            "id": inv.id,
            "token": inv.token,
            "url": f"/alumni/register?token={inv.token}",
            "max_uses": inv.max_uses,
            "used_count": inv.used_count,
            "is_active": inv.is_active,
            "expires_at": inv.expires_at.isoformat() if inv.expires_at else None,
            "created_at": inv.created_at.isoformat() if inv.created_at else None
        }
        for inv in invitations
    ]

class SendInvitationByEmail(BaseModel):
    email: str
    first_name: str
    last_name: str
    token: str  # Le token d'invitation existant


@router.post("/invite/send-email")
def send_invitation_by_email(
    data: SendInvitationByEmail,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Envoie une invitation alumni directement par email"""
    
    # Vérifier que le token existe
    invitation = db.query(AlumniInvitation).filter(
        AlumniInvitation.token == data.token,
        AlumniInvitation.university_id == current_user.university_id,
        AlumniInvitation.is_active == True
    ).first()
    
    if not invitation:
        raise HTTPException(status_code=404, detail="Lien d'invitation invalide")
    
    if invitation.used_count >= invitation.max_uses:
        raise HTTPException(status_code=400, detail="Limite d'utilisations atteinte")
    
    # Récupérer le nom de l'université
    university = db.query(University).filter(
        University.id == current_user.university_id
    ).first()
    university_name = university.name if university else "UniSphere AI"
    
    # Calculer les heures restantes
    hours_left = int((invitation.expires_at - datetime.now(timezone.utc)).total_seconds() / 3600)
    
    # Construire l'URL d'inscription
    invitation_url = f"{FRONTEND_URL}/register-alumni?token={data.token}"
    
    # Envoyer l'email
    email_sent = send_alumni_invitation_email(
        to_email=data.email,
        recipient_name=f"{data.first_name} {data.last_name}",
        university_name=university_name,
        invitation_url=invitation_url,
        expires_hours=max(1, hours_left),
        session_type="invitation"
    )
    
    if not email_sent:
        if not is_email_configured():
            return {
                "email_sent": False,
                "invitation_url": invitation_url,
                "message": "⚠️ SMTP non configuré. Voici le lien à envoyer manuellement :",
            }
        raise HTTPException(status_code=500, detail="Erreur lors de l'envoi de l'email")
    
    return {
        "email_sent": True,
        "message": f"✅ Email d'invitation envoyé à {data.email}"
    }


@router.delete("/invitations/{invitation_id}")
def revoke_invitation(
    invitation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Révoquer un lien d'invitation"""
    invitation = db.query(AlumniInvitation).filter(
        AlumniInvitation.id == invitation_id,
        AlumniInvitation.university_id == current_user.university_id
    ).first()

    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation non trouvée")

    invitation.is_active = False
    db.commit()

    return {"message": "Invitation révoquée"}


# ==========================================
# 📝 2. INSCRIPTION ALUMNI (Public via lien)
# ==========================================

@router.get("/invite/{token}")
def validate_invitation(
    token: str,
    db: Session = Depends(get_db)
):
    """Valider un token d'invitation (public)"""
    invitation = db.query(AlumniInvitation).filter(
        AlumniInvitation.token == token,
        AlumniInvitation.is_active == True
    ).first()

    if not invitation:
        raise HTTPException(status_code=404, detail="Lien d'invitation invalide ou expiré")

    if invitation.expires_at and invitation.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Ce lien d'invitation a expiré")

    if invitation.used_count >= invitation.max_uses:
        raise HTTPException(status_code=403, detail="Ce lien d'invitation a atteint sa limite d'utilisations")

    return {
        "valid": True,
        "university_id": invitation.university_id
    }


@router.post("/register")
def register_alumni(
    data: AlumniRegister,
    token: str,
    db: Session = Depends(get_db)
):
    """Inscription d'un alumni via lien d'invitation"""
    from app.core.security import hash_password

    # 1. Valider le token
    invitation = db.query(AlumniInvitation).filter(
        AlumniInvitation.token == token,
        AlumniInvitation.is_active == True
    ).first()

    if not invitation:
        raise HTTPException(status_code=404, detail="Lien d'invitation invalide")

    if invitation.expires_at and invitation.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Ce lien d'invitation a expiré")

    if invitation.used_count >= invitation.max_uses:
        raise HTTPException(status_code=403, detail="Limite d'utilisations atteinte")

    # 2. Vérifier conditions acceptées
    if not data.accepted_conditions:
        raise HTTPException(status_code=400, detail="Vous devez accepter les conditions d'utilisation")

    # 3. Vérifier email unique
    existing_user = db.query(User).filter(User.email == data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Un compte existe déjà avec cet email")

    # 4. Créer le user
    new_user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        full_name=f"{data.first_name} {data.last_name}",
        role="alumni",
        university_id=invitation.university_id
    )
    db.add(new_user)
    db.flush()
    db.refresh(new_user)

    # 5. Créer le profil alumni (statut pending)
    new_alumni = AlumniProfile(
        user_id=new_user.id,
        university_id=invitation.university_id,
        first_name=data.first_name,
        last_name=data.last_name,
        email=data.email,
        phone=data.phone,
        filiere=data.filiere,
        domain=data.domain,
        level=data.level,
        graduation_year=data.graduation_year,
        promotion=data.promotion,
        current_position=data.current_position,
        company=data.company,
        activity_domain=data.activity_domain,
        location=data.location,
        linkedin_url=data.linkedin_url,
        career_path=data.career_path,
        difficulties=data.difficulties,
        advice=data.advice,
        skills=data.skills,
        is_open_to_mentoring=data.is_open_to_mentoring,
        is_open_to_internship=data.is_open_to_internship,
        accepted_conditions=True,
        status="pending"
    )
    db.add(new_alumni)

    # 6. Incrémenter le compteur d'utilisations
    invitation.used_count += 1

    # 7. Notifier l'admin
    admins = db.query(User).filter(
        User.university_id == invitation.university_id,
        User.role == "admin"
    ).all()
    for admin in admins:
        notification = Notification(
            title="🎓 Nouvelle inscription Alumni",
            message=f"{data.first_name} {data.last_name} ({data.email}) souhaite rejoindre la communauté alumni. Validation requise.",
            type="warning",
            notification_type="alumni_registration",
            recipient_id=admin.id,
            created_by=new_user.id,
            university_id=invitation.university_id,
            is_read=False
        )
        db.add(notification)

    db.commit()

    return {
        "message": "Inscription réussie ! Votre profil est en attente de validation par l'administration.",
        "user_id": new_user.id,
        "status": "pending"
    }


# ==========================================
# 🔧 3. ADMIN - Gestion Alumni
# ==========================================

@router.get("/admin/list")
def admin_list_alumni(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary"))
):
    """Liste tous les alumni"""
    alumni_list = db.query(AlumniProfile).filter(
        AlumniProfile.university_id == current_user.university_id
    ).order_by(desc(AlumniProfile.created_at)).all()

    return [
        {
            "id": a.id,
            "user_id": a.user_id,
            "first_name": a.first_name,
            "last_name": a.last_name,
            "email": a.email,
            "phone": a.phone,
            "filiere": a.filiere,
            "graduation_year": a.graduation_year,
            "promotion": a.promotion,
            "current_position": a.current_position,
            "company": a.company,
            "status": a.status,
            "is_verified": a.is_verified,
            "created_at": a.created_at.isoformat() if a.created_at else None
        }
        for a in alumni_list
    ]


@router.put("/admin/{alumni_id}/activate")
def admin_activate_alumni(
    alumni_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Activer/valider un alumni"""
    alumni = db.query(AlumniProfile).filter(
        AlumniProfile.id == alumni_id,
        AlumniProfile.university_id == current_user.university_id
    ).first()

    if not alumni:
        raise HTTPException(status_code=404, detail="Alumni non trouvé")

    alumni.status = "active"
    alumni.is_verified = True
    db.commit()

    # Notifier l'alumni
    notification = Notification(
        title="🎉 Bienvenue dans la communauté Alumni !",
        message=f"Félicitations {alumni.first_name} ! Votre profil a été validé. Vous pouvez maintenant accéder à votre espace alumni.",
        type="success",
        notification_type="alumni_activated",
        recipient_id=alumni.user_id,
        created_by=current_user.id,
        university_id=alumni.university_id,
        is_read=False
    )
    db.add(notification)
    db.commit()

    return {"message": f"{alumni.first_name} {alumni.last_name} activé avec succès"}


@router.put("/admin/{alumni_id}/reject")
def admin_reject_alumni(
    alumni_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Rejeter un alumni"""
    alumni = db.query(AlumniProfile).filter(
        AlumniProfile.id == alumni_id,
        AlumniProfile.university_id == current_user.university_id
    ).first()

    if not alumni:
        raise HTTPException(status_code=404, detail="Alumni non trouvé")

    alumni.status = "rejected"
    db.commit()

    return {"message": f"{alumni.first_name} {alumni.last_name} rejeté"}


@router.get("/admin/stats")
def admin_alumni_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary"))
):
    """Statistiques alumni"""
    university_id = current_user.university_id

    total = db.query(func.count(AlumniProfile.id)).filter(
        AlumniProfile.university_id == university_id
    ).scalar() or 0

    pending = db.query(func.count(AlumniProfile.id)).filter(
        AlumniProfile.university_id == university_id,
        AlumniProfile.status == "pending"
    ).scalar() or 0

    active = db.query(func.count(AlumniProfile.id)).filter(
        AlumniProfile.university_id == university_id,
        AlumniProfile.status == "active"
    ).scalar() or 0

    mentors = db.query(func.count(AlumniProfile.id)).filter(
        AlumniProfile.university_id == university_id,
        AlumniProfile.is_open_to_mentoring == True
    ).scalar() or 0

    # Connections actives
    active_connections = db.query(func.count(AlumniConnection.id)).join(
        AlumniProfile
    ).filter(
        AlumniProfile.university_id == university_id,
        AlumniConnection.status == "accepted"
    ).scalar() or 0

    return {
        "total": total,
        "pending": pending,
        "active": active,
        "mentors": mentors,
        "active_connections": active_connections
    }


# ==========================================
# 🎓 4. ESPACE ÉTUDIANT - Communauté
# ==========================================

@router.get("/community")
def get_alumni_community(
    promotion: Optional[str] = None,
    filiere: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student"))
):
    """Liste des alumni actifs et visibles"""
    query = db.query(AlumniProfile).filter(
        AlumniProfile.university_id == current_user.university_id,
        AlumniProfile.status == "active",
        AlumniProfile.is_visible == True
    )

    if promotion:
        query = query.filter(AlumniProfile.promotion == promotion)
    if filiere:
        query = query.filter(AlumniProfile.filiere == filiere)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                AlumniProfile.first_name.ilike(search_term),
                AlumniProfile.last_name.ilike(search_term),
                AlumniProfile.activity_domain.ilike(search_term),
                AlumniProfile.company.ilike(search_term)
            )
        )

    alumni_list = query.order_by(
        desc(AlumniProfile.graduation_year),
        AlumniProfile.last_name
    ).all()

    # Récupérer l'étudiant pour vérifier ses connections
    student = db.query(Student).filter(
        Student.user_id == current_user.id
    ).first()

    result = []
    for alumni in alumni_list:
        # Vérifier si l'étudiant a déjà une connection
        connection = None
        if student:
            connection = db.query(AlumniConnection).filter(
                AlumniConnection.student_id == student.id,
                AlumniConnection.alumni_id == alumni.id
            ).first()

        # Compter les mentorats actifs de cet alumni
        mentor_count = db.query(func.count(AlumniConnection.id)).filter(
            AlumniConnection.alumni_id == alumni.id,
            AlumniConnection.status == "accepted",
            AlumniConnection.connection_type.in_(["mentor", "directeur_memoire"])
        ).scalar() or 0

        result.append({
            "id": alumni.id,
            "user_id": alumni.user_id,
            "first_name": alumni.first_name,
            "last_name": alumni.last_name,
            "photo": alumni.photo,
            "filiere": alumni.filiere,
            "domain": alumni.domain,
            "level": alumni.level,
            "graduation_year": alumni.graduation_year,
            "promotion": alumni.promotion,
            "current_position": alumni.current_position,
            "company": alumni.company,
            "activity_domain": alumni.activity_domain,
            "location": alumni.location,
            "is_verified": alumni.is_verified,
            "is_open_to_mentoring": alumni.is_open_to_mentoring,
            "is_open_to_internship": alumni.is_open_to_internship,
            "skills": alumni.skills.split(",") if alumni.skills else [],
            "mentor_count": mentor_count,
            "mentor_slots_available": 5 - mentor_count,
            "connection_status": connection.status if connection else None,
            "connection_type": connection.connection_type if connection else None
        })

    return result


@router.get("/promotions")
def get_promotions(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student"))
):
    """Liste des promotions"""
    results = db.query(
        AlumniProfile.promotion,
        AlumniProfile.graduation_year,
        func.count(AlumniProfile.id).label('count')
    ).filter(
        AlumniProfile.university_id == current_user.university_id,
        AlumniProfile.status == "active",
        AlumniProfile.is_visible == True
    ).group_by(
        AlumniProfile.promotion,
        AlumniProfile.graduation_year
    ).order_by(desc(AlumniProfile.graduation_year)).all()

    return [
        {
            "promotion": r[0] or f"Promotion {r[1]}",
            "graduation_year": r[1],
            "count": r[2]
        }
        for r in results
    ]


@router.get("/{alumni_id}")
def get_alumni_profile(
    alumni_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student"))
):
    """Profil détaillé d'un alumni (visible par étudiant)"""
    alumni = db.query(AlumniProfile).filter(
        AlumniProfile.id == alumni_id,
        AlumniProfile.university_id == current_user.university_id,
        AlumniProfile.status == "active",
        AlumniProfile.is_visible == True
    ).first()

    if not alumni:
        raise HTTPException(status_code=404, detail="Alumni non trouvé")

    # Compter mentorats actifs
    mentor_count = db.query(func.count(AlumniConnection.id)).filter(
        AlumniConnection.alumni_id == alumni.id,
        AlumniConnection.status == "accepted",
        AlumniConnection.connection_type.in_(["mentor", "directeur_memoire"])
    ).scalar() or 0

    # Vérifier connection existante
    student = db.query(Student).filter(
        Student.user_id == current_user.id
    ).first()

    connection = None
    if student:
        connection = db.query(AlumniConnection).filter(
            AlumniConnection.student_id == student.id,
            AlumniConnection.alumni_id == alumni.id
        ).first()

    return {
        "id": alumni.id,
        "user_id": alumni.user_id,
        "first_name": alumni.first_name,
        "last_name": alumni.last_name,
        "photo": alumni.photo,
        "filiere": alumni.filiere,
        "domain": alumni.domain,
        "level": alumni.level,
        "graduation_year": alumni.graduation_year,
        "promotion": alumni.promotion,
        "current_position": alumni.current_position,
        "company": alumni.company,
        "activity_domain": alumni.activity_domain,
        "location": alumni.location,
        "linkedin_url": alumni.linkedin_url,
        "website": alumni.website,
        "career_path": alumni.career_path,
        "difficulties": alumni.difficulties,
        "advice": alumni.advice,
        "skills": alumni.skills.split(",") if alumni.skills else [],
        "is_verified": alumni.is_verified,
        "is_open_to_mentoring": alumni.is_open_to_mentoring,
        "is_open_to_internship": alumni.is_open_to_internship,
        "mentor_count": mentor_count,
        "mentor_slots_available": 5 - mentor_count,
        "connection_status": connection.status if connection else None,
        "connection_type": connection.connection_type if connection else None
    }


# ==========================================
# 🤝 5. CONNECTIONS (Mentor/Ami)
# ==========================================

@router.post("/connections/request")
def request_connection(
    data: ConnectionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student"))
):
    """Étudiant demande un alumni comme mentor/ami"""
    # Trouver l'étudiant
    student = db.query(Student).filter(
        Student.user_id == current_user.id
    ).first()

    if not student:
        raise HTTPException(status_code=404, detail="Profil étudiant non trouvé")

    # Vérifier l'alumni
    alumni = db.query(AlumniProfile).filter(
        AlumniProfile.id == data.alumni_id,
        AlumniProfile.status == "active"
    ).first()

    if not alumni:
        raise HTTPException(status_code=404, detail="Alumni non trouvé")

    # Vérifier si l'étudiant a déjà un mentor (pour type mentor/directeur)
    if data.connection_type in ["mentor", "directeur_memoire"]:
        existing_mentor = db.query(AlumniConnection).filter(
            AlumniConnection.student_id == student.id,
            AlumniConnection.connection_type.in_(["mentor", "directeur_memoire"]),
            AlumniConnection.status == "accepted"
        ).first()

        if existing_mentor:
            raise HTTPException(status_code=400, detail="Vous avez déjà un mentor. Un étudiant ne peut avoir qu'un seul mentor.")

    # Vérifier si l'alumni a atteint la limite de 5 mentorés
    if data.connection_type in ["mentor", "directeur_memoire"]:
        mentor_count = db.query(func.count(AlumniConnection.id)).filter(
            AlumniConnection.alumni_id == alumni.id,
            AlumniConnection.status == "accepted",
            AlumniConnection.connection_type.in_(["mentor", "directeur_memoire"])
        ).scalar() or 0

        if mentor_count >= 5:
            raise HTTPException(status_code=400, detail="Cet alumni a atteint sa limite de 5 mentorés.")

    # Vérifier si une connection existe déjà
    existing = db.query(AlumniConnection).filter(
        AlumniConnection.student_id == student.id,
        AlumniConnection.alumni_id == alumni.id
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Une demande existe déjà avec cet alumni")

    # Créer la connection
    connection = AlumniConnection(
        student_id=student.id,
        alumni_id=alumni.id,
        connection_type=data.connection_type,
        status="pending",
        message=data.message
    )
    db.add(connection)

    # Notifier l'alumni
    notification = Notification(
        title="🤝 Nouvelle demande de mentorat",
        message=f"{student.first_name} {student.last_name} ({student.matricule}) souhaite vous avoir comme {'mentor' if data.connection_type == 'mentor' else 'directeur de mémoire' if data.connection_type == 'directeur_memoire' else 'ami'}.",
        type="info",
        notification_type="connection_request",
        recipient_id=alumni.user_id,
        created_by=current_user.id,
        university_id=current_user.university_id,
        is_read=False
    )
    db.add(notification)

    db.commit()

    return {"message": "Demande envoyée ! L'alumni doit l'accepter."}


@router.put("/connections/{connection_id}/accept")
def accept_connection(
    connection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("alumni"))
):
    """Alumni accepte une demande"""
    # Trouver le profil alumni
    alumni = db.query(AlumniProfile).filter(
        AlumniProfile.user_id == current_user.id
    ).first()

    if not alumni:
        raise HTTPException(status_code=404, detail="Profil alumni non trouvé")

    connection = db.query(AlumniConnection).filter(
        AlumniConnection.id == connection_id,
        AlumniConnection.alumni_id == alumni.id,
        AlumniConnection.status == "pending"
    ).first()

    if not connection:
        raise HTTPException(status_code=404, detail="Demande non trouvée")

    # Vérifier la limite de 5
    if connection.connection_type in ["mentor", "directeur_memoire"]:
        mentor_count = db.query(func.count(AlumniConnection.id)).filter(
            AlumniConnection.alumni_id == alumni.id,
            AlumniConnection.status == "accepted",
            AlumniConnection.connection_type.in_(["mentor", "directeur_memoire"])
        ).scalar() or 0

        if mentor_count >= 5:
            raise HTTPException(status_code=400, detail="Vous avez atteint votre limite de 5 mentorés.")

    connection.status = "accepted"
    connection.accepted_at = datetime.now(timezone.utc)

    # Notifier l'étudiant
    student = db.query(Student).filter(Student.id == connection.student_id).first()
    if student and student.user_id:
        notification = Notification(
            title="🎉 Demande acceptée !",
            message=f"{alumni.first_name} {alumni.last_name} a accepté votre demande de {'mentorat' if connection.connection_type == 'mentor' else 'direction de mémoire' if connection.connection_type == 'directeur_memoire' else 'connexion'}. Vous pouvez maintenant discuter ensemble !",
            type="success",
            notification_type="connection_accepted",
            recipient_id=student.user_id,
            created_by=current_user.id,
            university_id=current_user.university_id,
            is_read=False
        )
        db.add(notification)

    db.commit()

    return {"message": "Demande acceptée ! Vous pouvez maintenant discuter."}


@router.put("/connections/{connection_id}/reject")
def reject_connection(
    connection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("alumni"))
):
    """Alumni rejette une demande"""
    alumni = db.query(AlumniProfile).filter(
        AlumniProfile.user_id == current_user.id
    ).first()

    if not alumni:
        raise HTTPException(status_code=404, detail="Profil alumni non trouvé")

    connection = db.query(AlumniConnection).filter(
        AlumniConnection.id == connection_id,
        AlumniConnection.alumni_id == alumni.id,
        AlumniConnection.status == "pending"
    ).first()

    if not connection:
        raise HTTPException(status_code=404, detail="Demande non trouvée")

    connection.status = "rejected"
    db.commit()

    return {"message": "Demande rejetée"}


# ==========================================
# 👤 6. ESPACE ALUMNI
# ==========================================

@router.get("/me/profile")
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("alumni"))
):
    """Mon profil alumni"""
    alumni = db.query(AlumniProfile).filter(
        AlumniProfile.user_id == current_user.id
    ).first()

    if not alumni:
        raise HTTPException(status_code=404, detail="Profil non trouvé")

    return alumni


@router.put("/me/profile")
def update_my_profile(
    data: AlumniProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("alumni"))
):
    """Mettre à jour mon profil"""
    alumni = db.query(AlumniProfile).filter(
        AlumniProfile.user_id == current_user.id
    ).first()

    if not alumni:
        raise HTTPException(status_code=404, detail="Profil non trouvé")

    update_data = data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(alumni, key, value)

    alumni.updated_at = datetime.now(timezone.utc)
    db.commit()

    return {"message": "Profil mis à jour"}


@router.get("/me/connections")
def get_my_connections(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("alumni"))
):
    """Mes connections (étudiants que je mentor)"""
    alumni = db.query(AlumniProfile).filter(
        AlumniProfile.user_id == current_user.id
    ).first()

    if not alumni:
        raise HTTPException(status_code=404, detail="Profil non trouvé")

    connections = db.query(AlumniConnection).filter(
        AlumniConnection.alumni_id == alumni.id
    ).order_by(desc(AlumniConnection.created_at)).all()

    result = []
    for conn in connections:
        student = db.query(Student).filter(Student.id == conn.student_id).first()
        if student:
            result.append({
                "id": conn.id,
                "connection_type": conn.connection_type,
                "status": conn.status,
                "message": conn.message,
                "created_at": conn.created_at.isoformat() if conn.created_at else None,
                "accepted_at": conn.accepted_at.isoformat() if conn.accepted_at else None,
                "student": {
                    "id": student.id,
                    "first_name": student.first_name,
                    "last_name": student.last_name,
                    "matricule": student.matricule,
                    "filiere": student.filiere,
                    "level": student.level,
                    "user_id": student.user_id
                }
            })

    return result


@router.get("/me/requests")
def get_my_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("alumni"))
):
    """Mes demandes en attente"""
    alumni = db.query(AlumniProfile).filter(
        AlumniProfile.user_id == current_user.id
    ).first()

    if not alumni:
        raise HTTPException(status_code=404, detail="Profil non trouvé")

    requests = db.query(AlumniConnection).filter(
        AlumniConnection.alumni_id == alumni.id,
        AlumniConnection.status == "pending"
    ).order_by(desc(AlumniConnection.created_at)).all()

    result = []
    for conn in requests:
        student = db.query(Student).filter(Student.id == conn.student_id).first()
        if student:
            result.append({
                "id": conn.id,
                "connection_type": conn.connection_type,
                "message": conn.message,
                "created_at": conn.created_at.isoformat() if conn.created_at else None,
                "student": {
                    "id": student.id,
                    "first_name": student.first_name,
                    "last_name": student.last_name,
                    "matricule": student.matricule,
                    "filiere": student.filiere,
                    "level": student.level
                }
            })

    return result


# ==========================================
# 📊 7. ALUMNI - Accès données étudiant (Mentor)
# ==========================================

@router.get("/student/{student_id}")
def get_student_data(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("alumni"))
):
    """Données complètes d'un étudiant mentoré"""
    # Vérifier que l'alumni est bien mentor de cet étudiant
    alumni = db.query(AlumniProfile).filter(
        AlumniProfile.user_id == current_user.id
    ).first()

    if not alumni:
        raise HTTPException(status_code=404, detail="Profil alumni non trouvé")

    connection = db.query(AlumniConnection).filter(
        AlumniConnection.alumni_id == alumni.id,
        AlumniConnection.student_id == student_id,
        AlumniConnection.status == "accepted",
        AlumniConnection.connection_type.in_(["mentor", "directeur_memoire"])
    ).first()

    if not connection:
        raise HTTPException(status_code=403, detail="Vous n'êtes pas le mentor de cet étudiant")

    # Récupérer les données de l'étudiant
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Étudiant non trouvé")

    # Notes
    grades = db.query(Grade).filter(
        Grade.student_id == student_id,
        Grade.status == "validated"
    ).all()

    grades_data = []
    for grade in grades:
        course = db.query(Course).filter(Course.id == grade.course_id).first()
        grades_data.append({
            "course_name": course.name if course else "Cours inconnu",
            "cc_note": grade.cc_note,
            "exam_note": grade.exam_note,
            "final_note": grade.final_note,
            "session": grade.session
        })

    # Présences
    attendances = db.query(Attendance).filter(
        Attendance.student_id == student_id
    ).all()

    attendance_stats = {
        "total": len(attendances),
        "present": len([a for a in attendances if a.status == "present"]),
        "absent": len([a for a in attendances if a.status == "absent"]),
        "late": len([a for a in attendances if a.status == "late"]),
        "excused": len([a for a in attendances if a.status == "excused"])
    }

    # Moyenne générale
    valid_grades = [g for g in grades if g.final_note is not None]
    average = sum(g.final_note for g in valid_grades) / len(valid_grades) if valid_grades else 0

    return {
        "student": {
            "id": student.id,
            "first_name": student.first_name,
            "last_name": student.last_name,
            "matricule": student.matricule,
            "filiere": student.filiere,
            "level": student.level,
            "domain": student.domain,
            "email": student.email
        },
        "average": round(average, 2),
        "grades": grades_data,
        "attendance": attendance_stats,
        "connection_type": connection.connection_type,
        "since": connection.accepted_at.isoformat() if connection.accepted_at else None
    }


# ==========================================
# 💬 8. CHAT DÉDIÉ ALUMNI
# ==========================================

@router.get("/chat/conversations")
def get_chat_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("alumni", "student"))
):
    """Liste des conversations"""
    if current_user.role == "alumni":
        alumni = db.query(AlumniProfile).filter(
            AlumniProfile.user_id == current_user.id
        ).first()
        if not alumni:
            raise HTTPException(status_code=404, detail="Profil non trouvé")

        connections = db.query(AlumniConnection).filter(
            AlumniConnection.alumni_id == alumni.id,
            AlumniConnection.status == "accepted"
        ).all()

        conversations = []
        for conn in connections:
            student = db.query(Student).filter(Student.id == conn.student_id).first()
            if student and student.user_id:
                # Dernier message
                last_message = db.query(AlumniMessage).filter(
                    AlumniMessage.connection_id == conn.id
                ).order_by(desc(AlumniMessage.created_at)).first()

                # Messages non lus
                unread = db.query(func.count(AlumniMessage.id)).filter(
                    AlumniMessage.connection_id == conn.id,
                    AlumniMessage.receiver_id == current_user.id,
                    AlumniMessage.is_read == False
                ).scalar() or 0

                conversations.append({
                    "connection_id": conn.id,
                    "user_id": student.user_id,
                    "name": f"{student.first_name} {student.last_name}",
                    "avatar": None,
                    "type": conn.connection_type,
                    "last_message": last_message.content if last_message else None,
                    "last_message_at": last_message.created_at.isoformat() if last_message else None,
                    "unread_count": unread
                })

        return conversations

    else:  # student
        student = db.query(Student).filter(
            Student.user_id == current_user.id
        ).first()
        if not student:
            raise HTTPException(status_code=404, detail="Profil non trouvé")

        connections = db.query(AlumniConnection).filter(
            AlumniConnection.student_id == student.id,
            AlumniConnection.status == "accepted"
        ).all()

        conversations = []
        for conn in connections:
            alumni = db.query(AlumniProfile).filter(AlumniProfile.id == conn.alumni_id).first()
            if alumni:
                last_message = db.query(AlumniMessage).filter(
                    AlumniMessage.connection_id == conn.id
                ).order_by(desc(AlumniMessage.created_at)).first()

                unread = db.query(func.count(AlumniMessage.id)).filter(
                    AlumniMessage.connection_id == conn.id,
                    AlumniMessage.receiver_id == current_user.id,
                    AlumniMessage.is_read == False
                ).scalar() or 0

                conversations.append({
                    "connection_id": conn.id,
                    "user_id": alumni.user_id,
                    "name": f"{alumni.first_name} {alumni.last_name}",
                    "avatar": alumni.photo,
                    "type": conn.connection_type,
                    "last_message": last_message.content if last_message else None,
                    "last_message_at": last_message.created_at.isoformat() if last_message else None,
                    "unread_count": unread
                })

        return conversations


@router.get("/chat/{connection_id}")
def get_chat_messages(
    connection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("alumni", "student"))
):
    """Messages d'une conversation"""
    # Vérifier que l'utilisateur fait partie de cette connection
    connection = db.query(AlumniConnection).filter(
        AlumniConnection.id == connection_id,
        AlumniConnection.status == "accepted"
    ).first()

    if not connection:
        raise HTTPException(status_code=404, detail="Conversation non trouvée")

    # Vérifier l'accès
    if current_user.role == "alumni":
        alumni = db.query(AlumniProfile).filter(
            AlumniProfile.user_id == current_user.id
        ).first()
        if not alumni or connection.alumni_id != alumni.id:
            raise HTTPException(status_code=403, detail="Accès refusé")
    else:
        student = db.query(Student).filter(
            Student.user_id == current_user.id
        ).first()
        if not student or connection.student_id != student.id:
            raise HTTPException(status_code=403, detail="Accès refusé")

    messages = db.query(AlumniMessage).filter(
        AlumniMessage.connection_id == connection_id
    ).order_by(AlumniMessage.created_at).all()

    # Marquer comme lus
    db.query(AlumniMessage).filter(
        AlumniMessage.connection_id == connection_id,
        AlumniMessage.receiver_id == current_user.id,
        AlumniMessage.is_read == False
    ).update({"is_read": True})
    db.commit()

    return [
        {
            "id": m.id,
            "sender_id": m.sender_id,
            "receiver_id": m.receiver_id,
            "content": m.content,
            "is_read": m.is_read,
            "created_at": m.created_at.isoformat() if m.created_at else None
        }
        for m in messages
    ]


@router.post("/chat/send")
def send_chat_message(
    data: ChatMessage,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("alumni", "student"))
):
    """Envoyer un message"""
    # Trouver la connection entre les deux utilisateurs
    if current_user.role == "alumni":
        alumni = db.query(AlumniProfile).filter(
            AlumniProfile.user_id == current_user.id
        ).first()
        if not alumni:
            raise HTTPException(status_code=404, detail="Profil non trouvé")

        student_user = db.query(User).filter(User.id == data.receiver_id).first()
        if not student_user:
            raise HTTPException(status_code=404, detail="Destinataire non trouvé")

        student = db.query(Student).filter(Student.user_id == data.receiver_id).first()
        if not student:
            raise HTTPException(status_code=404, detail="Étudiant non trouvé")

        connection = db.query(AlumniConnection).filter(
            AlumniConnection.alumni_id == alumni.id,
            AlumniConnection.student_id == student.id,
            AlumniConnection.status == "accepted"
        ).first()
    else:
        student = db.query(Student).filter(
            Student.user_id == current_user.id
        ).first()
        if not student:
            raise HTTPException(status_code=404, detail="Profil non trouvé")

        alumni_user = db.query(User).filter(User.id == data.receiver_id).first()
        if not alumni_user:
            raise HTTPException(status_code=404, detail="Destinataire non trouvé")

        alumni = db.query(AlumniProfile).filter(
            AlumniProfile.user_id == data.receiver_id
        ).first()
        if not alumni:
            raise HTTPException(status_code=404, detail="Alumni non trouvé")

        connection = db.query(AlumniConnection).filter(
            AlumniConnection.student_id == student.id,
            AlumniConnection.alumni_id == alumni.id,
            AlumniConnection.status == "accepted"
        ).first()

    if not connection:
        raise HTTPException(status_code=403, detail="Aucune connection active avec cet utilisateur")

    message = AlumniMessage(
        connection_id=connection.id,
        sender_id=current_user.id,
        receiver_id=data.receiver_id,
        content=data.content
    )
    db.add(message)

    # Notification
    notification = Notification(
        title="💬 Nouveau message",
        message=f"{current_user.full_name} vous a envoyé un message",
        type="info",
        notification_type="alumni_message",
        recipient_id=data.receiver_id,
        created_by=current_user.id,
        university_id=current_user.university_id,
        is_read=False
    )
    db.add(notification)

    db.commit()

    return {"message": "Message envoyé", "id": message.id}