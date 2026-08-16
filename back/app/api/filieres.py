from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database.connection import SessionLocal
from app.models.filiere import Filiere
from app.models.user import User
from app.core.dependencies import require_role
from pydantic import BaseModel

router = APIRouter(prefix="/filieres", tags=["Filières"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ✅ Schéma SANS le champ code (qui n'existe pas dans le modèle)
class FiliereCreate(BaseModel):
    name: str
    domain: str
    levels: str  # Ex: "L1,L2,L3"

class FiliereUpdate(BaseModel):
    name: Optional[str] = None
    domain: Optional[str] = None
    levels: Optional[str] = None

# ==========================================
# ✅ LISTER LES FILIÈRES
# ==========================================
@router.get("/")
def get_filieres(
    domain: Optional[str] = None,
    level: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "censeur", "teacher", "student"))
):
    """Récupérer toutes les filières"""
    query = db.query(Filiere).filter(
        Filiere.university_id == current_user.university_id
    )
    
    if domain:
        query = query.filter(Filiere.domain == domain)
    if level:
        query = query.filter(Filiere.levels.contains(level))
    
    filieres = query.order_by(Filiere.domain, Filiere.name).all()
    return filieres

# ==========================================
# ✅ DÉTAIL D'UNE FILIÈRE
# ==========================================
@router.get("/{filiere_id}")
def get_filiere(
    filiere_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "censeur", "teacher", "student"))
):
    """Récupérer les détails d'une filière"""
    filiere = db.query(Filiere).filter(
        Filiere.id == filiere_id,
        Filiere.university_id == current_user.university_id
    ).first()
    
    if not filiere:
        raise HTTPException(status_code=404, detail="Filière non trouvée")
    
    return filiere

# ==========================================
# ✅ CRÉER UNE FILIÈRE (admin uniquement)
# ==========================================
@router.post("/")
def create_filiere(
    data: FiliereCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Créer une nouvelle filière"""
    # ✅ Vérifier si la filière existe déjà (même nom + même domaine)
    existing = db.query(Filiere).filter(
        Filiere.name == data.name,
        Filiere.domain == data.domain,
        Filiere.university_id == current_user.university_id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400, 
            detail=f"La filière '{data.name}' existe déjà dans le domaine '{data.domain}'"
        )
    
    # ✅ Créer la filière SANS le champ code
    new_filiere = Filiere(
        name=data.name,
        domain=data.domain,
        levels=data.levels,
        university_id=current_user.university_id
    )
    
    db.add(new_filiere)
    db.commit()
    db.refresh(new_filiere)
    
    return {"message": "Filière créée avec succès", "filiere": new_filiere}

# ==========================================
# ✅ METTRE À JOUR UNE FILIÈRE
# ==========================================
@router.put("/{filiere_id}")
def update_filiere(
    filiere_id: int,
    data: FiliereUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Modifier une filière"""
    filiere = db.query(Filiere).filter(
        Filiere.id == filiere_id,
        Filiere.university_id == current_user.university_id
    ).first()
    
    if not filiere:
        raise HTTPException(status_code=404, detail="Filière non trouvée")
    
    if data.name is not None:
        filiere.name = data.name
    if data.domain is not None:
        filiere.domain = data.domain
    if data.levels is not None:
        filiere.levels = data.levels
    
    db.commit()
    db.refresh(filiere)
    
    return {"message": "Filière mise à jour", "filiere": filiere}

# ==========================================
# ✅ SUPPRIMER UNE FILIÈRE
# ==========================================
@router.delete("/{filiere_id}")
def delete_filiere(
    filiere_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Supprimer une filière"""
    filiere = db.query(Filiere).filter(
        Filiere.id == filiere_id,
        Filiere.university_id == current_user.university_id
    ).first()
    
    if not filiere:
        raise HTTPException(status_code=404, detail="Filière non trouvée")
    
    db.delete(filiere)
    db.commit()
    
    return {"message": "Filière supprimée"}

# ==========================================
# ✅ LISTE DES DOMAINES UNIQUES
# ==========================================
@router.get("/meta/domains")
def get_domains(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "censeur", "teacher", "student"))
):
    """Récupérer la liste des domaines uniques"""
    filieres = db.query(Filiere).filter(
        Filiere.university_id == current_user.university_id
    ).all()
    
    domains = sorted(list(set(f.domain for f in filieres if f.domain)))
    return {"domains": domains}