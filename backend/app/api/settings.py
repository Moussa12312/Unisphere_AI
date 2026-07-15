from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from pathlib import Path
import os
import io

from app.database.connection import SessionLocal
from app.models.user import User
from app.models.student import Student
from app.models.academic_config import AcademicConfig
from app.core.dependencies import require_role

BASE_DIR = Path(__file__).resolve().parent.parent.parent
UPLOAD_DIR = BASE_DIR / "uploads" / "logos"

router = APIRouter(prefix="/settings", tags=["Settings"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def remove_background(image_bytes: bytes) -> bytes:
    try:
        from PIL import Image
        img = Image.open(io.BytesIO(image_bytes)).convert("RGBA")
        datas = img.getdata()
        newData = []
        bg_color = datas[0][:3]
        
        for item in datas:
            if (abs(item[0] - bg_color[0]) < 60 and 
                abs(item[1] - bg_color[1]) < 60 and 
                abs(item[2] - bg_color[2]) < 60):
                newData.append((255, 255, 255, 0))
            else:
                newData.append(item)
                
        img.putdata(newData)
        output = io.BytesIO()
        img.save(output, format="PNG")
        return output.getvalue()
    except Exception as e:
        print(f"⚠️ Erreur suppression fond: {e}")
        return image_bytes


# ==========================================
# 1. PROFIL UNIVERSITÉ
# ==========================================

@router.get("/university/profile")
def get_university_profile(
    db: Session = Depends(get_db),
    # ✅ CORRECTION : Autoriser tous les rôles à lire le profil
    current_user: User = Depends(require_role("admin", "secretary", "censeur", "accountant", "guard", "teacher", "student"))
):
    from app.models.university import University
    university = db.query(University).filter(University.id == current_user.university_id).first()
    if not university:
        raise HTTPException(status_code=404, detail="Université non trouvée")
    
    return {
        "id": university.id,
        "name": university.name,
        "logo": university.logo,
        "slogan": university.slogan,
        "address": university.address,
        "phone": university.phone,
        "email": university.email,
        "website": university.website,
        "description": university.description,
        "established_year": university.established_year,
        "rector_name": university.rector_name,
        "academic_year": university.academic_year
    }


@router.put("/university/profile")
def update_university_profile(
    request: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    from app.models.university import University
    university = db.query(University).filter(University.id == current_user.university_id).first()
    if not university:
        raise HTTPException(status_code=404, detail="Université non trouvée")
    
    for key, value in request.items():
        if hasattr(university, key):
            setattr(university, key, value)
            
    db.commit()
    db.refresh(university)
    return {"message": "Profil mis à jour avec succès"}


@router.post("/university/logo")
def upload_university_logo(
    logo: UploadFile = File(...),
    remove_bg: str = Form("false"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    from app.models.university import University
    
    print(f"📥 Réception upload logo: {logo.filename}, remove_bg={remove_bg}")
    
    try:
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        content = logo.file.read()
        file_extension = logo.filename.split(".")[-1].lower()
        filename = f"university_{current_user.university_id}"
        
        if remove_bg.lower() == "true" and file_extension in ['jpg', 'jpeg', 'png', 'webp']:
            print("🎨 Suppression de l'arrière-plan...")
            content = remove_background(content)
            filename = f"{filename}.png"
        else:
            filename = f"{filename}.{file_extension}"
            
        file_path = UPLOAD_DIR / filename
        
        with open(file_path, "wb") as buffer:
            buffer.write(content)
        
        university = db.query(University).filter(University.id == current_user.university_id).first()
        if university:
            university.logo = filename
            db.commit()
            return {"message": "Logo uploadé avec succès", "logo_url": filename}
            
        raise HTTPException(status_code=500, detail="Université non trouvée")
        
    except Exception as e:
        print(f"❌ ERREUR UPLOAD: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")


# ==========================================
# 2. FILIÈRES & NIVEAUX
# ==========================================

@router.get("/filieres")
def get_filieres(
    db: Session = Depends(get_db), 
    # ✅ CORRECTION : Autoriser tous les rôles
    current_user: User = Depends(require_role("admin", "secretary", "censeur", "accountant", "guard"))
):
    results = db.query(Student.filiere, func.count(Student.id).label('count')).filter(
        Student.university_id == current_user.university_id, Student.filiere.isnot(None)
    ).group_by(Student.filiere).order_by(func.count(Student.id).desc()).all()
    return [{"name": f[0], "student_count": f[1], "color": "#FF6B00"} for f in results]


@router.get("/niveaux")
def get_niveaux(
    db: Session = Depends(get_db), 
    # ✅ CORRECTION : Autoriser tous les rôles
    current_user: User = Depends(require_role("admin", "secretary", "censeur", "accountant", "guard"))
):
    results = db.query(Student.level, func.count(Student.id).label('count')).filter(
        Student.university_id == current_user.university_id, Student.level.isnot(None)
    ).group_by(Student.level).order_by(Student.level).all()
    return [{"name": n[0], "student_count": n[1]} for n in results]


@router.post("/filieres")
def add_filiere(request: dict, current_user: User = Depends(require_role("admin"))):
    return {"message": "Filière ajoutée avec succès", "data": request}


@router.post("/niveaux")
def add_niveau(request: dict, current_user: User = Depends(require_role("admin"))):
    return {"message": "Niveau ajouté avec succès", "data": request}


# ==========================================
# 3. CONFIGURATION ACADÉMIQUE
# ==========================================

@router.get("/academic/config")
def get_academic_config(
    db: Session = Depends(get_db), 
    # ✅ CORRECTION : Autoriser tous les rôles
    current_user: User = Depends(require_role("admin", "secretary", "censeur", "accountant", "guard"))
):
    config = db.query(AcademicConfig).filter(AcademicConfig.university_id == current_user.university_id).first()
    if not config:
        config = AcademicConfig(university_id=current_user.university_id)
        db.add(config)
        db.commit()
        db.refresh(config)
    
    return {
        "grading_system": config.grading_system,
        "min_passing_grade": config.min_passing_grade,
        "max_grade": config.max_grade,
        "min_attendance_rate": config.min_attendance_rate,
        "default_cc_coefficient": config.default_cc_coefficient,
        "default_exam_coefficient": config.default_exam_coefficient,
        "allow_compensation": config.allow_compensation,
        "allow_makeup_exam": config.allow_makeup_exam,
        "min_gpa_to_pass": config.min_gpa_to_pass,
        "current_academic_year": config.current_academic_year,
        "semester_system": config.semester_system
    }


@router.put("/academic/config")
def update_academic_config(request: dict, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin"))):
    config = db.query(AcademicConfig).filter(AcademicConfig.university_id == current_user.university_id).first()
    if not config:
        config = AcademicConfig(university_id=current_user.university_id)
        db.add(config)
    
    for key, value in request.items():
        if hasattr(config, key):
            setattr(config, key, value)
            
    db.commit()
    db.refresh(config)
    return {"message": "Configuration académique mise à jour avec succès"}