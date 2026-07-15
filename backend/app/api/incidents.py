from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from datetime import datetime
from app.database.connection import SessionLocal
from app.models.incident import Incident
from app.models.notification import Notification
from app.models.user import User
from app.models.student import Student
from app.core.dependencies import require_role
import os
import time
import json

router = APIRouter(prefix="/incidents", tags=["Incidents"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ==========================================
# CRÉER UN INCIDENT (JSON ou Form-Data)
# ==========================================
@router.post("/")
async def create_incident(
    data: dict,  # ✅ Accepte JSON
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "teacher", "guard", "censeur"))
):
    """Créer un incident et notifier censeur + secretary"""
    
    # ✅ Extraire les champs (supporte plusieurs formats)
    title = data.get("title") or data.get("description", "")[:50]
    description = data.get("description", "")
    incident_type = data.get("incident_type") or data.get("type", "autre")
    severity = data.get("severity", "medium")
    location = data.get("location")
    student_matricule = data.get("student_matricule")
    student_id = data.get("student_id")
    
    if not description:
        raise HTTPException(status_code=400, detail="Description requise")
    
    # ✅ Trouver l'étudiant par matricule si fourni
    student = None
    if student_matricule:
        student = db.query(Student).filter(
            Student.matricule == student_matricule,
            Student.university_id == current_user.university_id
        ).first()
        if not student:
            raise HTTPException(
                status_code=404, 
                detail=f"Étudiant non trouvé avec le matricule: {student_matricule}"
            )
        student_id = student.id
    elif student_id:
        student = db.query(Student).filter(
            Student.id == student_id,
            Student.university_id == current_user.university_id
        ).first()
    
    # ✅ Générer un titre si non fourni
    if not title:
        student_name = f"{student.first_name} {student.last_name}" if student else "Étudiant"
        title = f"Incident {incident_type} - {student_name}"
    
    # 1. Créer l'incident
    incident = Incident(
        title=title,
        description=description,
        incident_type=incident_type,
        severity=severity,
        location=location,
        student_id=student_id,
        reported_by=current_user.id,
        university_id=current_user.university_id,
        status="open"
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)
    
    # 2. ✅ CRÉER DES NOTIFICATIONS
    severity_labels = {
        "low": "faible",
        "medium": "moyenne",
        "high": "élevée",
        "critical": "critique"
    }
    
    visual_type = {
        "low": "info",
        "medium": "warning",
        "high": "warning",
        "critical": "error"
    }.get(severity, "warning")
    
    # Récupérer les censeurs, secretaries et admins
    recipients = db.query(User).filter(
        User.university_id == current_user.university_id,
        User.role.in_(["censeur", "secretary", "admin"])
    ).all()
    
    student_info = ""
    if student:
        student_info = f"\nÉtudiant: {student.first_name} {student.last_name} ({student.matricule})"
    
    notified_count = 0
    for recipient in recipients:
        if recipient.id == current_user.id:
            continue
        
        notification = Notification(
            title=f"🚨 Nouvel incident: {incident_type}",
            message=f"Gravité: {severity_labels.get(severity, severity)}{student_info}\nSignalé par: {current_user.full_name}\n{description[:100]}",
            notification_type="incident",
            type=visual_type,
            target_roles=["censeur", "secretary", "admin"],
            recipient_id=recipient.id,
            created_by=current_user.id,
            university_id=current_user.university_id,
            is_read=False,
            extra_data=json.dumps({
                "incident_id": incident.id,
                "severity": severity,
                "incident_type": incident_type,
                "location": location,
                "student_id": student_id
            })
        )
        db.add(notification)
        notified_count += 1
    
    db.commit()
    
    # ✅ Retourner les données au format attendu par le frontend
    return {
        "id": incident.id,
        "title": incident.title,
        "description": incident.description,
        "incident_type": incident.incident_type,
        "type": incident.incident_type,  # ✅ Alias pour le frontend
        "severity": incident.severity,
        "location": incident.location,
        "status": incident.status,
        "student_id": student_id,
        "student_name": f"{student.first_name} {student.last_name}" if student else None,
        "student_matricule": student.matricule if student else student_matricule,
        "reported_by": current_user.full_name,
        "reported_by_role": current_user.role,
        "created_at": incident.created_at.isoformat() if incident.created_at else None,
        "message": f"Incident créé et {notified_count} notifications envoyées",
        "notified_count": notified_count
    }


# ==========================================
# LISTE DES INCIDENTS
# ==========================================
@router.get("/")
def get_incidents(
    status: str = None,
    severity: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "censeur", "guard", "teacher"))
):
    """Liste des incidents de l'université"""
    query = db.query(Incident).filter(
        Incident.university_id == current_user.university_id
    )
    
    if status:
        query = query.filter(Incident.status == status)
    if severity:
        query = query.filter(Incident.severity == severity)
    
    incidents = query.order_by(Incident.created_at.desc()).all()
    
    result = []
    for inc in incidents:
        reporter = db.query(User).filter(User.id == inc.reported_by).first()
        student = None
        if inc.student_id:
            student = db.query(Student).filter(Student.id == inc.student_id).first()
        
        result.append({
            "id": inc.id,
            "title": inc.title,
            "description": inc.description,
            "incident_type": inc.incident_type,
            "type": inc.incident_type,  # ✅ Alias
            "severity": inc.severity,
            "location": inc.location,
            "status": inc.status,
            "photo": inc.photo,
            "reported_by": reporter.full_name if reporter else "Inconnu",
            "reported_by_role": reporter.role if reporter else None,
            "student_id": inc.student_id,
            "student_name": f"{student.first_name} {student.last_name}" if student else None,
            "student_matricule": student.matricule if student else None,
            "created_at": inc.created_at.isoformat() if inc.created_at else None
        })
    
    return result


# ==========================================
# DÉTAIL D'UN INCIDENT
# ==========================================
@router.get("/{incident_id}")
def get_incident(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "censeur", "guard", "teacher"))
):
    """Détail d'un incident"""
    incident = db.query(Incident).filter(
        Incident.id == incident_id,
        Incident.university_id == current_user.university_id
    ).first()
    
    if not incident:
        raise HTTPException(status_code=404, detail="Incident non trouvé")
    
    reporter = db.query(User).filter(User.id == incident.reported_by).first()
    student = None
    if incident.student_id:
        student = db.query(Student).filter(Student.id == incident.student_id).first()
    
    return {
        "id": incident.id,
        "title": incident.title,
        "description": incident.description,
        "incident_type": incident.incident_type,
        "type": incident.incident_type,
        "severity": incident.severity,
        "location": incident.location,
        "status": incident.status,
        "photo": incident.photo,
        "reported_by": reporter.full_name if reporter else "Inconnu",
        "reported_by_role": reporter.role if reporter else None,
        "student_id": incident.student_id,
        "student_name": f"{student.first_name} {student.last_name}" if student else None,
        "student_matricule": student.matricule if student else None,
        "created_at": incident.created_at.isoformat() if incident.created_at else None
    }


# ==========================================
# METTRE À JOUR LE STATUT
# ==========================================
@router.put("/{incident_id}/status")
def update_incident_status(
    incident_id: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "censeur"))
):
    """Modifier le statut d'un incident"""
    incident = db.query(Incident).filter(
        Incident.id == incident_id,
        Incident.university_id == current_user.university_id
    ).first()
    
    if not incident:
        raise HTTPException(status_code=404, detail="Incident non trouvé")
    
    new_status = data.get("status")
    if new_status not in ["open", "in_progress", "resolved", "closed"]:
        raise HTTPException(status_code=400, detail="Statut invalide")
    
    old_status = incident.status
    incident.status = new_status
    db.commit()
    
    # ✅ Notifier le rapporteur
    if incident.reported_by:
        status_labels = {
            "open": "ouvert",
            "in_progress": "en cours de traitement",
            "resolved": "résolu",
            "closed": "fermé"
        }
        
        visual_type = {
            "open": "info",
            "in_progress": "warning",
            "resolved": "success",
            "closed": "info"
        }.get(new_status, "info")
        
        notification = Notification(
            title=f"📋 Incident mis à jour: {incident.title}",
            message=f"Statut: {status_labels.get(old_status, old_status)} → {status_labels.get(new_status, new_status)}\nPar: {current_user.full_name}",
            notification_type="incident_update",
            type=visual_type,
            target_roles=["teacher", "guard"],
            recipient_id=incident.reported_by,
            created_by=current_user.id,
            university_id=current_user.university_id,
            is_read=False,
            extra_data=json.dumps({
                "incident_id": incident.id,
                "old_status": old_status,
                "new_status": new_status
            })
        )
        db.add(notification)
        db.commit()
    
    return {"message": f"Statut modifié: {old_status} → {new_status}"}


# ==========================================
# SUPPRIMER
# ==========================================
@router.delete("/{incident_id}")
def delete_incident(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Supprimer un incident"""
    incident = db.query(Incident).filter(
        Incident.id == incident_id,
        Incident.university_id == current_user.university_id
    ).first()
    
    if not incident:
        raise HTTPException(status_code=404, detail="Incident non trouvé")
    
    if incident.photo:
        photo_path = os.path.join("uploads/incidents", incident.photo)
        if os.path.exists(photo_path):
            os.remove(photo_path)
    
    db.delete(incident)
    db.commit()
    
    return {"message": "Incident supprimé"}