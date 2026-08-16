from fastapi import APIRouter, Depends, HTTPException, Response, UploadFile, File
from sqlalchemy.orm import Session
from app.database.connection import SessionLocal
from app.models.student import Student
from app.models.user import User
from app.models.certificate_request import CertificateRequest
from app.core.dependencies import require_role
import os
import time

router = APIRouter(prefix="/certificates", tags=["Certificates"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ==========================================
# 🎓 ROUTES ÉTUDIANT
# ==========================================

@router.get("/me")
def get_my_certificates(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student"))
):
    """Récupère toutes les attestations de l'étudiant connecté"""
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Profil étudiant non trouvé")
    
    requests = db.query(CertificateRequest).filter(
        CertificateRequest.student_id == student.id
    ).order_by(CertificateRequest.created_at.desc()).all()
    
    return [{
        "id": req.id,
        "type": req.request_type,
        "status": req.status,
        "created_at": req.created_at.isoformat() if req.created_at else None,
        "file_path": req.file_path,
        "rejection_reason": req.rejection_reason
    } for req in requests]

@router.post("/me")
def request_certificate(
    request_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student"))
):
    """Crée une nouvelle demande d'attestation"""
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Profil étudiant non trouvé")
    
    req_type = request_data.get("type")
    if not req_type:
        raise HTTPException(status_code=400, detail="Type d'attestation requis")
    
    new_req = CertificateRequest(
        student_id=student.id,
        request_type=req_type,
        status="pending"
    )
    db.add(new_req)
    db.commit()
    db.refresh(new_req)
    
    return {
        "message": "Demande envoyée",
        "certificate": {
            "id": new_req.id,
            "type": new_req.request_type,
            "status": new_req.status
        }
    }

@router.get("/me/{request_id}/download")
def download_certificate(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student"))
):
    """Télécharge une attestation validée"""
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    req = db.query(CertificateRequest).filter(
        CertificateRequest.id == request_id,
        CertificateRequest.student_id == student.id
    ).first()
    
    if not req:
        raise HTTPException(status_code=404, detail="Demande non trouvée")
    if req.status != "approved":
        raise HTTPException(status_code=400, detail="Attestation non encore validée")
    if not req.file_path or not os.path.exists(req.file_path):
        raise HTTPException(status_code=404, detail="Fichier non trouvé")
    
    with open(req.file_path, "rb") as f:
        content = f.read()
    
    return Response(
        content=content,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={req.request_type.replace(' ', '_')}.pdf"}
    )

# ==========================================
# 🛡️ ROUTES SECRÉTAIRE / ADMIN
# ==========================================

@router.get("/secretary/requests")
def get_all_certificate_requests(
    status: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "secretaire", "censeur"))
):
    """Liste toutes les demandes d'attestations"""
    query = db.query(CertificateRequest).join(Student).filter(
        Student.university_id == current_user.university_id
    )
    
    if status:
        query = query.filter(CertificateRequest.status == status)
        
    requests = query.order_by(CertificateRequest.created_at.desc()).all()
    
    result = []
    for req in requests:
        result.append({
            "id": req.id,
            "student_name": f"{req.student.first_name} {req.student.last_name}",
            "matricule": req.student.matricule,
            "type": req.request_type,
            "status": req.status,
            "created_at": req.created_at.isoformat() if req.created_at else None,
            "file_path": req.file_path,
            "rejection_reason": req.rejection_reason
        })
    return result

@router.put("/secretary/requests/{request_id}/status")
def update_request_status(
    request_id: int,
    status_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "secretaire", "censeur"))
):
    """Met à jour le statut d'une demande (approuver/refuser)"""
    req = db.query(CertificateRequest).join(Student).filter(
        CertificateRequest.id == request_id,
        Student.university_id == current_user.university_id
    ).first()
    
    if not req:
        raise HTTPException(status_code=404, detail="Demande non trouvée")
    
    req.status = status_data.get("status")
    if status_data.get("status") == "rejected":
        req.rejection_reason = status_data.get("rejection_reason", "")
        
    db.commit()
    return {"message": "Statut mis à jour"}

@router.post("/secretary/requests/{request_id}/upload")
async def upload_certificate_file(
    request_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "secretaire", "censeur"))
):
    """Upload le PDF d'une attestation et valide automatiquement la demande"""
    req = db.query(CertificateRequest).join(Student).filter(
        CertificateRequest.id == request_id,
        Student.university_id == current_user.university_id
    ).first()
    
    if not req:
        raise HTTPException(status_code=404, detail="Demande non trouvée")
    
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Seuls les fichiers PDF sont acceptés")
    
    os.makedirs("uploads/certificates", exist_ok=True)
    filename = f"cert_{req.id}_{int(time.time())}.pdf"
    filepath = os.path.join("uploads/certificates", filename)
    
    content = await file.read()
    with open(filepath, "wb") as buffer:
        buffer.write(content)
    
    req.file_path = filepath
    req.status = "approved"  # Validation automatique lors de l'upload
    
    db.commit()
    return {"message": "Fichier uploadé et demande validée", "file_path": filepath}