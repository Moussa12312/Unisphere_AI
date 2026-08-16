from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.database.connection import SessionLocal
from app.models.university import University
from app.models.user import User
from app.core.dependencies import get_current_user, require_role
import os
import time

router = APIRouter(prefix="/settings/university", tags=["University Settings"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Configuration par défaut complète
DEFAULT_CARD_CONFIG = {
    "width": 85.6,
    "height": 54,
    "border_radius": 12,
    "border_width": 0,
    "border_color": "#000000",
    "border_style": "none",
    
    "background_type": "gradient",
    "background_color": "#ffffff",
    "background_gradient_start": "#031B63",
    "background_gradient_end": "#FF6B00",
    "background_gradient_angle": 135,
    "background_image_url": "",
    "background_image_opacity": 0.1,
    
    "header_enabled": True,
    "header_height": 30,
    "header_background_color": "#031B63",
    "header_text_color": "#ffffff",
    "header_font_size": 10,
    "header_font_weight": "bold",
    "header_show_logo": True,
    "header_logo_position": "left",
    "header_logo_size": 24,
    "header_show_university_name": True,
    "header_show_academic_year": True,
    "header_show_slogan": False,
    
    "photo_enabled": True,
    "photo_position": "top-left",
    "photo_size": 40,
    "photo_shape": "circle",
    "photo_border_width": 2,
    "photo_border_color": "#FF6B00",
    "photo_background_color": "#f1f5f9",
    
    "student_name_font_size": 14,
    "student_name_font_weight": "bold",
    "student_name_color": "#1e293b",
    "student_name_text_transform": "uppercase",
    
    "matricule_font_size": 9,
    "matricule_color": "#FF6B00",
    "matricule_background_color": "#fff7ed",
    "matricule_show_badge": True,
    
    "filiere_font_size": 9,
    "filiere_color": "#64748b",
    
    "level_font_size": 9,
    "level_color": "#64748b",
    
    "qr_enabled": True,
    "qr_position": "bottom-right",
    "qr_size": 40,
    "qr_background_color": "#ffffff",
    "qr_border_radius": 4,
    
    "footer_enabled": True,
    "footer_height": 20,
    "footer_background_color": "#f8fafc",
    "footer_text_color": "#64748b",
    "footer_show_signature": True,
    "footer_show_id": True,
    "footer_font_size": 7,
    
    "show_birth_date": False,
    "birth_date_font_size": 8,
    "birth_date_color": "#94a3b8",
    
    "font_family": "Inter, sans-serif",
    "text_color": "#1e293b"
}

@router.get("/profile")
def get_university_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    university = db.query(University).filter(University.id == current_user.university_id).first()
    if not university:
        raise HTTPException(status_code=404, detail="Université non trouvée")
    
    return {
        "id": university.id,
        "name": university.name,
        "slogan": university.slogan,
        "address": university.address,
        "phone": university.phone,
        "email": university.email,
        "website": university.website,
        "description": university.description,
        "established_year": university.established_year,
        "rector_name": university.rector_name,
        "academic_year": university.academic_year,
        "logo": university.logo,
        "card_config": university.card_config or DEFAULT_CARD_CONFIG
    }

@router.put("/profile")
def update_university_profile(
    profile_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary"))
):
    university = db.query(University).filter(University.id == current_user.university_id).first()
    if not university:
        raise HTTPException(status_code=404, detail="Université non trouvée")
    
    for key, value in profile_data.items():
        if hasattr(university, key) and key not in ["id", "card_config"]:
            setattr(university, key, value)
            
    db.commit()
    return {"message": "Profil mis à jour avec succès"}

@router.post("/logo")
async def upload_university_logo(
    logo: UploadFile = File(...),
    remove_bg: str = "false",
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary"))
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
    
    return {"message": "Logo uploadé avec succès", "logo_url": f"/uploads/logos/{logo_filename}"}

@router.get("/card-config")
def get_card_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary"))
):
    university = db.query(University).filter(University.id == current_user.university_id).first()
    if not university:
        raise HTTPException(status_code=404, detail="Université non trouvée")
    
    return university.card_config or DEFAULT_CARD_CONFIG

@router.put("/card-config")
def update_card_config(
    config: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "student"))
):
    university = db.query(University).filter(University.id == current_user.university_id).first()
    if not university:
        raise HTTPException(status_code=404, detail="Université non trouvée")
    
    # Fusionner avec la config par défaut pour éviter les clés manquantes
    merged_config = {**DEFAULT_CARD_CONFIG, **config}
    university.card_config = merged_config
    db.commit()
    
    return {"message": "Configuration sauvegardée", "config": merged_config}