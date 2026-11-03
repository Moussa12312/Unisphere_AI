from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.database.connection import SessionLocal
from app.models.university import University
from app.models.user import User
from app.core.dependencies import get_current_user, require_role, get_current_user_optional
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
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    # ✅ Le Super-Admin gère la plateforme globale et ne doit JAMAIS voir les données d'une université cliente
    if current_user and getattr(current_user, "role", None) in ["super_admin", "superadmin"]:
        return {
            "id": 0,
            "name": "UniSphere AI",
            "slogan": "Administration Plateforme SaaS",
            "address": "Siège UniSphere AI",
            "phone": "+223 70 00 00 00",
            "email": "contact@unisphere.ai",
            "website": "https://unisphere.ai",
            "description": "Plateforme Centrale de Gestion Universitaire",
            "established_year": "2026",
            "rector_name": "Administration Générale",
            "academic_year": "2026-2027",
            "logo": None,
            "card_config": DEFAULT_CARD_CONFIG
        }

    university = None
    if current_user and getattr(current_user, "university_id", None):
        university = db.query(University).filter(University.id == current_user.university_id).first()
    
    if not university:
        university = db.query(University).first()
        
    if not university:
        return {
            "id": 0,
            "name": "UniSphere AI",
            "slogan": "Plateforme Intelligente Universitaire",
            "address": "",
            "phone": "",
            "email": "",
            "website": "",
            "description": "",
            "established_year": "",
            "rector_name": "",
            "academic_year": "",
            "logo": None,
            "card_config": DEFAULT_CARD_CONFIG
        }
    
    return {
        "id": university.id,
        "name": university.name or "UniSphere AI",
        "slogan": university.slogan or "",
        "address": university.address or "",
        "phone": university.phone or "",
        "email": university.email or "",
        "website": university.website or "",
        "description": university.description or "",
        "established_year": str(university.established_year or ""),
        "rector_name": university.rector_name or "",
        "academic_year": university.academic_year or "",
        "logo": university.logo,
        "card_config": university.card_config or DEFAULT_CARD_CONFIG
    }

# NOTE : PUT /profile et POST /logo sont gérés par app/api/settings.py
# (même préfixe /settings/university). Les doublons ici masquaient la version
# tolérante (JSON + multipart) et provoquaient des erreurs 422 sur mobile.

@router.get("/card-config")
def get_card_config(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    university = None
    if current_user and getattr(current_user, "university_id", None):
        university = db.query(University).filter(University.id == current_user.university_id).first()
    if not university:
        university = db.query(University).first()

    if not university:
        return DEFAULT_CARD_CONFIG
    
    return university.card_config or DEFAULT_CARD_CONFIG

@router.put("/card-config")
def update_card_config(
    config: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "student", "super_admin"))
):
    target_id = getattr(current_user, "university_id", None)
    if not target_id:
        first_univ = db.query(University).first()
        target_id = first_univ.id if first_univ else None

    university = db.query(University).filter(University.id == target_id).first()
    if not university:
        raise HTTPException(status_code=404, detail="Université non trouvée")
    
    merged_config = {**DEFAULT_CARD_CONFIG, **config}
    university.card_config = merged_config
    db.commit()
    
    return {"message": "Configuration sauvegardée", "config": merged_config}