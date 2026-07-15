from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.database.connection import SessionLocal
from app.models.university import University
from app.models.user import User
from app.core.dependencies import get_current_user
import os
import time

router = APIRouter(prefix="/university", tags=["University"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/info")
def get_university_info(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    university = db.query(University).filter(University.id == current_user.university_id).first()
    if not university:
        raise HTTPException(status_code=404, detail="Université non trouvée")
    
    return {
        "id": university.id,
        "name": university.name,
        "email": university.email,
        "country": university.country,
        "institution_type": university.institution_type,
        "address": university.address,
        "phone": university.phone,
        "logo": university.logo
    }

@router.post("/upload-logo")
async def upload_logo(
    logo: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    university = db.query(University).filter(University.id == current_user.university_id).first()
    if not university:
        raise HTTPException(status_code=404, detail="Université non trouvée")
    
    if not logo.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="Le fichier doit être une image")
    
    os.makedirs("uploads/logos", exist_ok=True)
    logo_filename = f"university_{university.id}_{int(time.time())}.png"
    logo_path = os.path.join("uploads/logos", logo_filename)
    
    content = await logo.read()
    with open(logo_path, "wb") as buffer:
        buffer.write(content)
    
    if university.logo:
        old_logo_path = os.path.join("uploads/logos", university.logo)
        if os.path.exists(old_logo_path):
            os.remove(old_logo_path)
    
    university.logo = logo_filename
    db.commit()
    
    return {"message": "Logo uploadé avec succès", "logo": logo_filename}