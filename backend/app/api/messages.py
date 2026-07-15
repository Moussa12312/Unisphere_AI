from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from datetime import datetime
from app.database.connection import SessionLocal
from app.models.message import Message
from app.models.user import User
from app.core.dependencies import require_role
import os
import uuid

router = APIRouter(prefix="/messages", tags=["Messages"])

ALL_ROLES = ("admin", "secretary", "teacher", "student", "censeur", "accountant", "guard")
STAFF_ROLES = ("admin", "secretary", "teacher", "censeur", "accountant")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ==========================================
# ENVOYER UN MESSAGE
# ==========================================
@router.post("/")
def send_message(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*ALL_ROLES))
):
    recipient_id = data.get("recipient_id")
    subject = data.get("subject")
    content = data.get("content")
    message_type = data.get("message_type", "direct")
    parent_id = data.get("parent_id")
    attachment_url = data.get("attachment_url")
    attachment_name = data.get("attachment_name")
    
    if not subject or not content:
        raise HTTPException(status_code=400, detail="Sujet et contenu requis")
    
    if recipient_id:
        recipient = db.query(User).filter(
            User.id == recipient_id,
            User.university_id == current_user.university_id
        ).first()
        if not recipient:
            raise HTTPException(status_code=404, detail="Destinataire non trouvé")
    
    if parent_id:
        parent = db.query(Message).filter(Message.id == parent_id).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Message parent non trouvé")
    
    new_message = Message(
        sender_id=current_user.id,
        recipient_id=recipient_id,
        subject=subject,
        content=content,
        message_type=message_type,
        parent_id=parent_id,
        university_id=current_user.university_id
    )
    
    # ✅ Support des pièces jointes si les colonnes existent
    if attachment_url and hasattr(new_message, 'attachment_url'):
        new_message.attachment_url = attachment_url
    if attachment_name and hasattr(new_message, 'attachment_name'):
        new_message.attachment_name = attachment_name
    
    db.add(new_message)
    db.commit()
    db.refresh(new_message)
    
    return {
        "id": new_message.id,
        "message": "Message envoyé avec succès",
        "created_at": new_message.created_at.isoformat() if new_message.created_at else None
    }


# ==========================================
# BOÎTE DE RÉCEPTION
# ==========================================
@router.get("/inbox")
def get_inbox(
    page: int = 1,
    per_page: int = 100,
    unread_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*ALL_ROLES))
):
    query = db.query(Message).filter(
        Message.recipient_id == current_user.id,
        Message.is_deleted_recipient == False,
        Message.university_id == current_user.university_id
    )
    
    if unread_only:
        query = query.filter(Message.is_read == False)
    
    query = query.order_by(Message.created_at.desc())
    
    total = query.count()
    messages = query.offset((page - 1) * per_page).limit(per_page).all()
    
    result = []
    for msg in messages:
        sender = db.query(User).filter(User.id == msg.sender_id).first()
        recipient = db.query(User).filter(User.id == msg.recipient_id).first() if msg.recipient_id else None
        
        msg_data = {
            "id": msg.id,
            "sender_id": msg.sender_id,
            "sender_name": sender.full_name if sender else "Inconnu",
            "sender_role": sender.role if sender else None,
            "recipient_id": msg.recipient_id,
            "recipient_name": recipient.full_name if recipient else None,
            "recipient_role": recipient.role if recipient else None,
            "subject": msg.subject,
            "content": msg.content,
            "message_type": msg.message_type,
            "is_read": msg.is_read,
            "is_starred": getattr(msg, 'is_starred', False),
            "parent_id": getattr(msg, 'parent_id', None),
            "created_at": msg.created_at.isoformat() if msg.created_at else None,
            "read_at": msg.read_at.isoformat() if msg.read_at else None
        }
        
        # ✅ Ajouter les pièces jointes si elles existent
        if hasattr(msg, 'attachment_url'):
            msg_data['attachment_url'] = msg.attachment_url
        if hasattr(msg, 'attachment_name'):
            msg_data['attachment_name'] = msg.attachment_name
        
        result.append(msg_data)
    
    return {
        "data": result,
        "total": total,
        "page": page,
        "per_page": per_page
    }


# ==========================================
# BOÎTE D'ENVOI
# ==========================================
@router.get("/sent")
def get_sent_messages(
    page: int = 1,
    per_page: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*ALL_ROLES))
):
    query = db.query(Message).filter(
        Message.sender_id == current_user.id,
        Message.is_deleted_sender == False,
        Message.university_id == current_user.university_id
    ).order_by(Message.created_at.desc())
    
    total = query.count()
    messages = query.offset((page - 1) * per_page).limit(per_page).all()
    
    result = []
    for msg in messages:
        recipient_name = "Tous"
        recipient_role = None
        if msg.recipient_id:
            recipient = db.query(User).filter(User.id == msg.recipient_id).first()
            if recipient:
                recipient_name = recipient.full_name
                recipient_role = recipient.role
        
        msg_data = {
            "id": msg.id,
            "sender_id": msg.sender_id,
            "recipient_id": msg.recipient_id,
            "recipient_name": recipient_name,
            "recipient_role": recipient_role,
            "subject": msg.subject,
            "content": msg.content,
            "message_type": msg.message_type,
            "is_read": msg.is_read,
            "created_at": msg.created_at.isoformat() if msg.created_at else None
        }
        
        if hasattr(msg, 'attachment_url'):
            msg_data['attachment_url'] = msg.attachment_url
        if hasattr(msg, 'attachment_name'):
            msg_data['attachment_name'] = msg.attachment_name
        
        result.append(msg_data)
    
    return {
        "data": result,
        "total": total,
        "page": page,
        "per_page": per_page
    }


# ==========================================
# ✅ UN SEUL ENDPOINT /unread (CORRIGÉ)
# ==========================================
@router.get("/unread")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*ALL_ROLES))
):
    """Retourne le nombre de messages non lus pour l'utilisateur connecté"""
    unread_count = db.query(func.count(Message.id)).filter(
        Message.recipient_id == current_user.id,
        Message.is_read == False,
        Message.is_deleted_recipient == False,
        Message.university_id == current_user.university_id
    ).scalar() or 0
    
    return {"unread_count": unread_count}


# ==========================================
# MARQUER COMME LU
# ==========================================
@router.put("/{message_id}/read")
def mark_as_read(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*ALL_ROLES))
):
    message = db.query(Message).filter(
        Message.id == message_id,
        Message.recipient_id == current_user.id
    ).first()
    
    if not message:
        raise HTTPException(status_code=404, detail="Message non trouvé")
    
    message.is_read = True
    message.read_at = datetime.now()
    db.commit()
    
    return {"message": "Message marqué comme lu"}


# ==========================================
# MARQUER TOUS COMME LUS
# ==========================================
@router.put("/mark-all-read")
def mark_all_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*ALL_ROLES))
):
    db.query(Message).filter(
        Message.recipient_id == current_user.id,
        Message.is_read == False
    ).update({
        Message.is_read: True,
        Message.read_at: datetime.now()
    })
    db.commit()
    return {"message": "Tous les messages marqués comme lus"}


# ==========================================
# STAR/UNSTAR
# ==========================================
@router.put("/{message_id}/star")
def toggle_star(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*ALL_ROLES))
):
    message = db.query(Message).filter(
        Message.id == message_id,
        or_(Message.recipient_id == current_user.id, Message.sender_id == current_user.id)
    ).first()
    
    if not message:
        raise HTTPException(status_code=404, detail="Message non trouvé")
    
    message.is_starred = not message.is_starred
    db.commit()
    return {"is_starred": message.is_starred}


# ==========================================
# SUPPRIMER
# ==========================================
@router.delete("/{message_id}")
def delete_message(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*ALL_ROLES))
):
    message = db.query(Message).filter(Message.id == message_id).first()
    
    if not message:
        raise HTTPException(status_code=404, detail="Message non trouvé")
    
    if message.sender_id == current_user.id:
        message.is_deleted_sender = True
    elif message.recipient_id == current_user.id:
        message.is_deleted_recipient = True
    else:
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    db.commit()
    return {"message": "Message supprimé"}


# ==========================================
# STATISTIQUES
# ==========================================
@router.get("/stats")
def get_message_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*ALL_ROLES))
):
    inbox_total = db.query(Message).filter(
        Message.recipient_id == current_user.id,
        Message.is_deleted_recipient == False
    ).count()
    
    inbox_unread = db.query(Message).filter(
        Message.recipient_id == current_user.id,
        Message.is_read == False,
        Message.is_deleted_recipient == False
    ).count()
    
    sent_total = db.query(Message).filter(
        Message.sender_id == current_user.id,
        Message.is_deleted_sender == False
    ).count()
    
    starred = db.query(Message).filter(
        Message.is_starred == True,
        or_(Message.recipient_id == current_user.id, Message.sender_id == current_user.id)
    ).count()
    
    return {
        "inbox_total": inbox_total,
        "inbox_unread": inbox_unread,
        "sent_total": sent_total,
        "starred": starred
    }


# ==========================================
# LISTE DES UTILISATEURS
# ==========================================
@router.get("/users")
def get_users_for_messaging(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*ALL_ROLES))
):
    users = db.query(User).filter(
        User.university_id == current_user.university_id,
        User.id != current_user.id
    ).order_by(User.role, User.full_name).all()
    
    return [
        {
            "id": u.id,
            "name": u.full_name,
            "role": u.role,
            "email": u.email
        }
        for u in users
    ]


# ==========================================
# ENVOI GROUPÉ (BROADCAST)
# ==========================================
@router.post("/broadcast")
def broadcast_message(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*STAFF_ROLES))
):
    target_type = data.get("target_type")
    recipient_id = data.get("recipient_id")
    subject = data.get("subject")
    content = data.get("content")
    
    if not subject or not content:
        raise HTTPException(status_code=400, detail="Sujet et contenu requis")
    
    if not target_type:
        raise HTTPException(status_code=400, detail="Type de cible requis")
    
    recipients = []
    
    if target_type == "all_students":
        recipients = db.query(User).filter(
            User.university_id == current_user.university_id,
            User.role == "student"
        ).all()
    elif target_type == "all_staff":
        recipients = db.query(User).filter(
            User.university_id == current_user.university_id,
            User.role.in_(STAFF_ROLES)
        ).all()
    elif target_type == "all_teachers":
        recipients = db.query(User).filter(
            User.university_id == current_user.university_id,
            User.role == "teacher"
        ).all()
    elif target_type == "all_secretaries":
        recipients = db.query(User).filter(
            User.university_id == current_user.university_id,
            User.role == "secretary"
        ).all()
    elif target_type == "all_admins":
        recipients = db.query(User).filter(
            User.university_id == current_user.university_id,
            User.role == "admin"
        ).all()
    elif target_type == "individual":
        if not recipient_id:
            raise HTTPException(status_code=400, detail="Destinataire requis")
        recipient = db.query(User).filter(
            User.id == recipient_id,
            User.university_id == current_user.university_id
        ).first()
        if not recipient:
            raise HTTPException(status_code=404, detail="Destinataire non trouvé")
        recipients = [recipient]
    else:
        raise HTTPException(status_code=400, detail=f"Type invalide: {target_type}")
    
    if not recipients:
        raise HTTPException(status_code=404, detail="Aucun destinataire trouvé")
    
    created_count = 0
    for recipient in recipients:
        new_message = Message(
            sender_id=current_user.id,
            recipient_id=recipient.id,
            subject=subject,
            content=content,
            message_type="broadcast" if target_type != "individual" else "direct",
            university_id=current_user.university_id
        )
        db.add(new_message)
        created_count += 1
    
    db.commit()
    
    return {
        "message": f"Message envoyé à {created_count} destinataire(s)",
        "sent_count": created_count,
        "target_type": target_type
    }


# ==========================================
# UPLOAD PIÈCE JOINTE
# ==========================================
@router.post("/upload")
async def upload_attachment(
    file: UploadFile = File(...),
    current_user: User = Depends(require_role(*ALL_ROLES))
):
    """Upload une pièce jointe"""
    os.makedirs("uploads/messages", exist_ok=True)
    
    ext = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4()}{ext}"
    filepath = os.path.join("uploads/messages", filename)
    
    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)
    
    return {
        "url": f"/uploads/messages/{filename}",
        "filename": file.filename
    }