import os
import uuid
import shutil
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database.connection import SessionLocal
from app.models.scan_session import ScanSession
from app.models.student import Student
from app.models.user import User
from app.models.university import University
from app.core.dependencies import require_role
from app.utils.email_service import send_email, FRONTEND_URL
from app.services.ocr_service import extract_text_from_image, extract_student_info

router = APIRouter(prefix="/scan-sessions", tags=["Scan Sessions"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ==========================================
# SCHEMAS
# ==========================================
class CreateSessionRequest(BaseModel):
    student_id: Optional[int] = None
    recipient_email: str
    recipient_name: Optional[str] = None
    student_name: Optional[str] = None
    student_level: Optional[str] = None
    student_filiere: Optional[str] = None
    expires_hours: int = 24


class SessionStatusResponse(BaseModel):
    status: str
    documents: list
    ocr_extracted_data: dict | None
    completed_at: str | None


# ==========================================
# 🔐 ENDPOINTS ADMIN/SECRÉTAIRE
# ==========================================

@router.post("/request")
def create_scan_session(
    data: CreateSessionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary"))
):
    """Crée une session de scan et envoie le lien par email"""
    
    # Vérifier l'université
    university = db.query(University).filter(
        University.id == current_user.university_id
    ).first()
    
    if not university:
        raise HTTPException(status_code=404, detail="Université non trouvée")
    
    # Si student_id fourni, vérifier qu'il existe
    student_name = data.student_name or "Nouvelle inscription"
    if data.student_id:
        student = db.query(Student).filter(
            Student.id == data.student_id,
            Student.university_id == current_user.university_id
        ).first()
        if not student:
            raise HTTPException(status_code=404, detail="Étudiant non trouvé")
        student_name = f"{student.first_name} {student.last_name}"
    
    # Générer le token
    token = str(uuid.uuid4()).replace("-", "")[:32]
    
    # Calculer l'expiration
    expires_at = datetime.now(timezone.utc) + timedelta(hours=data.expires_hours)
    
    # Créer la session
    session = ScanSession(
        token=token,
        university_id=current_user.university_id,
        student_id=data.student_id,
        created_by=current_user.id,
        recipient_email=data.recipient_email,
        recipient_name=data.recipient_name or current_user.full_name,
        student_name=student_name,
        student_level=data.student_level,
        student_filiere=data.student_filiere,
        expires_at=expires_at,
        status="pending"
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    
    # ✅ Utiliser FRONTEND_URL depuis email_service (pas os.environ)
    scan_url = f"{FRONTEND_URL}/scan-session/{token}"
    
    # ✅ Construire l'email HTML
    subject = f"📄 UniSphere AI — Session de scan pour {student_name}"
    
    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
      <div style="background: linear-gradient(135deg, #FF6B00 0%, #f59e0b 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 24px;">📄 Session de Scan</h1>
        <p style="margin: 10px 0 0; opacity: 0.9;">UniSphere AI — {university.name}</p>
      </div>
      
      <div style="border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px; padding: 30px;">
        <p>Bonjour <strong>{data.recipient_name or current_user.full_name}</strong>,</p>
        
        <p>Une session de scan de documents a été initiée pour :</p>
        
        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; font-size: 18px;"><strong>👤 {student_name}</strong></p>
          {f'<p style="margin: 5px 0 0; color: #6b7280;">{data.student_level or ""} — {data.student_filiere or ""}</p>' if data.student_level or data.student_filiere else ''}
        </div>
        
        <p>📱 Pour scanner les documents, cliquez sur le bouton ci-dessous <strong>depuis votre téléphone</strong> :</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="{scan_url}" style="background: linear-gradient(135deg, #FF6B00, #f59e0b); color: white; padding: 16px 40px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 12px rgba(255, 107, 0, 0.3);">
            📸 OUVRIR LE SCANNER
          </a>
        </div>
        
        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; color: #92400e;">
            <strong>⏰ Ce lien expire dans {data.expires_hours} heures.</strong><br>
            <small>Lien sécurisé à usage unique.</small>
          </p>
        </div>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        
        <p style="color: #64748b; font-size: 12px; text-align: center;">
          Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
          <code style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px; word-break: break-all; font-size: 11px;">{scan_url}</code>
        </p>
      </div>
    </div>
    """
    
    # ✅ Utiliser send_email de email_service.py
    email_sent = send_email(
        to_email=data.recipient_email,
        subject=subject,
        html_body=html_body
    )
    
    return {
        "id": session.id,
        "token": token,
        "scan_url": scan_url,
        "expires_at": expires_at.isoformat(),
        "email_sent": email_sent,
        "message": "Session de scan créée" + (" et email envoyé" if email_sent else " (email non envoyé - SMTP non configuré)")
    }


@router.get("/my-sessions")
def get_my_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary"))
):
    """Liste des sessions créées par l'utilisateur"""
    sessions = db.query(ScanSession).filter(
        ScanSession.created_by == current_user.id,
        ScanSession.university_id == current_user.university_id
    ).order_by(ScanSession.created_at.desc()).limit(50).all()
    
    return [
        {
            "id": s.id,
            "token": s.token,
            "student_name": s.student_name,
            "student_id": s.student_id,
            "recipient_email": s.recipient_email,
            "status": s.status,
            "documents_count": len(s.documents or []),
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "expires_at": s.expires_at.isoformat() if s.expires_at else None,
            "completed_at": s.completed_at.isoformat() if s.completed_at else None
        }
        for s in sessions
    ]


@router.get("/{token}/status")
def get_session_status(
    token: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary"))
):
    """Polling : récupère le statut d'une session (côté desktop)"""
    session = db.query(ScanSession).filter(
        ScanSession.token == token,
        ScanSession.created_by == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session non trouvée")
    
    return {
        "status": session.status,
        "documents": session.documents or [],
        "ocr_extracted_data": session.ocr_extracted_data,
        "completed_at": session.completed_at.isoformat() if session.completed_at else None
    }


@router.post("/{token}/cancel")
def cancel_session(
    token: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary"))
):
    """Annule une session"""
    session = db.query(ScanSession).filter(
        ScanSession.token == token,
        ScanSession.created_by == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session non trouvée")
    
    if session.status == "completed":
        raise HTTPException(status_code=400, detail="Session déjà complétée")
    
    session.status = "cancelled"
    db.commit()
    
    return {"message": "Session annulée"}


# ==========================================
# 📱 ENDPOINTS PUBLICS (ACCÈS MOBILE)
# ==========================================

@router.get("/{token}")
def get_session_public(token: str, db: Session = Depends(get_db)):
    """Récupère les infos publiques d'une session (pour la page mobile)"""
    session = db.query(ScanSession).filter(ScanSession.token == token).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session non trouvée")
    
    # Vérifier expiration
    if session.expires_at < datetime.now(timezone.utc):
        session.status = "expired"
        db.commit()
        raise HTTPException(status_code=410, detail="Cette session a expiré")
    
    # Vérifier statut
    if session.status in ["completed", "cancelled", "expired"]:
        raise HTTPException(
            status_code=400,
            detail=f"Cette session est {session.status}"
        )
    
    # Marquer comme active si première visite
    if session.status == "pending":
        session.status = "active"
        session.used_at = datetime.now(timezone.utc)
        db.commit()
    
    # Récupérer le nom de l'université
    university = db.query(University).filter(
        University.id == session.university_id
    ).first()
    
    return {
        "token": session.token,
        "university_name": university.name if university else "UniSphere AI",
        "university_logo": university.logo if university else None,
        "student_name": session.student_name,
        "student_level": session.student_level,
        "student_filiere": session.student_filiere,
        "student_id": session.student_id,
        "status": session.status,
        "documents": session.documents or [],
        "expires_at": session.expires_at.isoformat()
    }


@router.post("/{token}/upload")
async def upload_scanned_document(
    token: str,
    document_type: str = Form(...),  # cni, birth_certificate, photo, bac, other
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload un document scanné depuis le mobile"""
    
    # Vérifier la session
    session = db.query(ScanSession).filter(ScanSession.token == token).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session non trouvée")
    
    if session.status != "active":
        raise HTTPException(status_code=400, detail="Session non active")
    
    if session.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Session expirée")
    
    # Limiter à 10 documents
    if len(session.documents or []) >= 10:
        raise HTTPException(status_code=400, detail="Maximum 10 documents par session")
    
    # Valider le type de fichier
    allowed_types = ["image/jpeg", "image/png", "image/jpg", "application/pdf"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Format non supporté. Utilisez JPG, PNG ou PDF.")
    
    # Vérifier la taille (max 10 Mo)
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Fichier trop volumineux (max 10 Mo)")
    
    # Créer le dossier de destination
    if session.student_id:
        # Étudiant existant
        upload_dir = Path(f"uploads/dossier_etudiant/{session.student_id}")
    else:
        # Nouvelle inscription : stocker dans un dossier temporaire lié au token
        upload_dir = Path(f"uploads/temp_scans/{token}")
    
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Générer un nom de fichier unique
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    ext = Path(file.filename).suffix.lower()
    filename = f"{document_type}_{timestamp}{ext}"
    file_path = upload_dir / filename
    
    # Sauvegarder le fichier
    with open(file_path, "wb") as f:
        f.write(content)
    
    # OCR si c'est une image
    ocr_data = None
    if ext in [".jpg", ".jpeg", ".png"]:
        try:
            raw_text = extract_text_from_image(content)
            ocr_data = extract_student_info(raw_text)
            ocr_data["raw_text"] = raw_text[:500]
        except Exception as e:
            print(f"⚠️ Erreur OCR : {e}")
            ocr_data = {"error": str(e)}
    
    # Ajouter au tableau documents
    documents = session.documents or []
    documents.append({
        "type": document_type,
        "filename": filename,
        "path": str(file_path),
        "size": len(content),
        "content_type": file.content_type,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "ocr_data": ocr_data
    })
    
    # Mettre à jour les données OCR globales (fusionner)
    if ocr_data and "error" not in ocr_data:
        existing_ocr = session.ocr_extracted_data or {}
        for key, value in ocr_data.items():
            if value and key not in ["raw_text", "error"]:
                existing_ocr[key] = value
        session.ocr_extracted_data = existing_ocr
    
    session.documents = documents
    db.commit()
    
    return {
        "message": "Document uploadé avec succès",
        "filename": filename,
        "document_type": document_type,
        "ocr_data": ocr_data,
        "total_documents": len(documents)
    }


@router.post("/{token}/complete")
def complete_session(
    token: str,
    db: Session = Depends(get_db)
):
    """Finalise la session (tous les documents sont uploadés)"""
    session = db.query(ScanSession).filter(ScanSession.token == token).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session non trouvée")
    
    if session.status != "active":
        raise HTTPException(status_code=400, detail="Session non active")
    
    if not session.documents or len(session.documents) == 0:
        raise HTTPException(status_code=400, detail="Aucun document uploadé")
    
    session.status = "completed"
    session.completed_at = datetime.now(timezone.utc)
    
    # Si c'est une nouvelle inscription (pas de student_id), créer le dossier
    if not session.student_id:
        # Ici on pourrait créer l'étudiant automatiquement
        # Pour l'instant, on laisse les documents dans temp_scans
        pass
    
    db.commit()
    
    return {
        "message": "Session complétée avec succès",
        "documents_count": len(session.documents),
        "ocr_data": session.ocr_extracted_data
    }


@router.delete("/{token}/document/{doc_index}")
def delete_document(
    token: str,
    doc_index: int,
    db: Session = Depends(get_db)
):
    """Supprime un document d'une session"""
    session = db.query(ScanSession).filter(ScanSession.token == token).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session non trouvée")
    
    if session.status != "active":
        raise HTTPException(status_code=400, detail="Session non active")
    
    documents = session.documents or []
    if doc_index < 0 or doc_index >= len(documents):
        raise HTTPException(status_code=404, detail="Document non trouvé")
    
    # Supprimer le fichier physique
    try:
        file_path = Path(documents[doc_index]["path"])
        if file_path.exists():
            file_path.unlink()
    except Exception as e:
        print(f"⚠️ Erreur suppression fichier : {e}")
    
    # Retirer de la liste
    documents.pop(doc_index)
    session.documents = documents
    db.commit()
    
    return {"message": "Document supprimé", "total_documents": len(documents)}