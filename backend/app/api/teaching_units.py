from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.database.connection import SessionLocal
from app.models.teaching_unit import TeachingUnit
from app.models.course import Course
from app.models.filiere import Filiere
from app.models.user import User
from app.core.dependencies import require_role

router = APIRouter(prefix="/teaching-units", tags=["Teaching Units (UE LMD)"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ==========================================
# SCHEMAS PYDANTIC
# ==========================================
class TeachingUnitCreate(BaseModel):
    code: str
    name: str
    credits: int = 6
    category: str = "Fondamentale"  # Fondamentale, Méthodologique, Transversale, Découverte
    semester: str = "S1"            # S1, S2, S3, S4, S5, S6
    level: str = "L1"               # L1, L2, L3, M1, M2, Doctorat
    description: Optional[str] = None
    filiere_id: Optional[int] = None
    course_ids: Optional[List[int]] = None


class TeachingUnitUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    credits: Optional[int] = None
    category: Optional[str] = None
    semester: Optional[str] = None
    level: Optional[str] = None
    description: Optional[str] = None
    filiere_id: Optional[int] = None
    course_ids: Optional[List[int]] = None


# ==========================================
# ENDPOINTS
# ==========================================

@router.get("/")
def list_teaching_units(
    filiere_id: Optional[int] = None,
    level: Optional[str] = None,
    semester: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "censeur", "secretary", "teacher", "student"))
):
    """Liste toutes les Unités d'Enseignement (UE) avec filtres académiques"""
    query = db.query(TeachingUnit).filter(
        TeachingUnit.university_id == current_user.university_id
    )

    if filiere_id:
        query = query.filter(TeachingUnit.filiere_id == filiere_id)
    if level:
        query = query.filter(TeachingUnit.level == level)
    if semester:
        query = query.filter(TeachingUnit.semester == semester)

    units = query.order_by(TeachingUnit.semester, TeachingUnit.code).all()

    result = []
    for u in units:
        courses = db.query(Course).filter(Course.teaching_unit_id == u.id).all()
        result.append({
            "id": u.id,
            "code": u.code,
            "name": u.name,
            "credits": u.credits,
            "category": u.category,
            "semester": u.semester,
            "level": u.level,
            "description": u.description,
            "filiere_id": u.filiere_id,
            "filiere_name": u.filiere.name if u.filiere else None,
            "courses_count": len(courses),
            "courses": [{
                "id": c.id,
                "code": c.code,
                "title": c.title,
                "credits": c.credits,
                "hours": c.hours,
                "teacher_id": c.teacher_id,
                "teacher_name": f"{c.teacher.first_name} {c.teacher.last_name}" if c.teacher else None
            } for c in courses]
        })

    return result


@router.get("/curriculum/{filiere_id}/{level}")
def get_lmd_curriculum(
    filiere_id: int,
    level: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "censeur", "secretary", "teacher", "student"))
):
    """
    Maquette académique LMD officielle :
    Organise les UE par semestre (ex: S1 et S2 pour L1), calcule le total des crédits ECTS
    et détaille les éléments constitutifs (ECUE).
    """
    filiere = db.query(Filiere).filter(
        Filiere.id == filiere_id,
        Filiere.university_id == current_user.university_id
    ).first()

    if not filiere:
        raise HTTPException(status_code=404, detail="Filière non trouvée")

    units = db.query(TeachingUnit).filter(
        TeachingUnit.university_id == current_user.university_id,
        TeachingUnit.filiere_id == filiere_id,
        TeachingUnit.level == level
    ).order_by(TeachingUnit.semester, TeachingUnit.code).all()

    # Grouper par semestre
    semesters = {}
    total_year_credits = 0

    for u in units:
        sem = u.semester or "S1"
        if sem not in semesters:
            semesters[sem] = {
                "semester": sem,
                "total_credits": 0,
                "is_valid_30_ects": False,
                "units_count": 0,
                "units": [],
                "teaching_units": []
            }

        courses = db.query(Course).filter(Course.teaching_unit_id == u.id).all()
        semesters[sem]["total_credits"] += u.credits
        total_year_credits += u.credits

        unit_data = {
            "id": u.id,
            "code": u.code,
            "name": u.name,
            "credits": u.credits,
            "category": u.category,
            "semester": u.semester,
            "level": u.level,
            "description": u.description,
            "filiere_id": u.filiere_id,
            "courses_count": len(courses),
            "courses": [{
                "id": c.id,
                "code": c.code,
                "title": c.title,
                "credits": c.credits,
                "hours": c.hours,
                "teacher_id": c.teacher_id,
                "teacher_name": (
                    c.teacher.full_name
                    if c.teacher and hasattr(c.teacher, "full_name") and c.teacher.full_name
                    else (f"{c.teacher.first_name} {c.teacher.last_name}" if c.teacher else None)
                )
            } for c in courses]
        }
        semesters[sem]["units"].append(unit_data)
        semesters[sem]["teaching_units"].append(unit_data)

    for sem, sdata in semesters.items():
        sdata["units_count"] = len(sdata["units"])
        sdata["is_valid_30_ects"] = (sdata["total_credits"] == 30)

    return {
        "filiere": {
            "id": filiere.id,
            "name": filiere.name,
            "domain": filiere.domain,
            "level": level
        },
        "level": level,
        "target_credits_per_semester": 30,
        "target_credits_per_year": 60,
        "total_year_credits": total_year_credits,
        "is_valid_60_ects": total_year_credits == 60,
        "is_lmd_compliant": total_year_credits == 60,
        "semesters": semesters,
        "semesters_list": list(semesters.values())
    }


@router.get("/{id}")
def get_teaching_unit(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "censeur", "secretary", "teacher", "student"))
):
    """Détails d'une UE avec ses cours associés"""
    unit = db.query(TeachingUnit).filter(
        TeachingUnit.id == id,
        TeachingUnit.university_id == current_user.university_id
    ).first()

    if not unit:
        raise HTTPException(status_code=404, detail="Unité d'enseignement non trouvée")

    courses = db.query(Course).filter(Course.teaching_unit_id == unit.id).all()

    return {
        "id": unit.id,
        "code": unit.code,
        "name": unit.name,
        "credits": unit.credits,
        "category": unit.category,
        "semester": unit.semester,
        "level": unit.level,
        "description": unit.description,
        "filiere_id": unit.filiere_id,
        "filiere_name": unit.filiere.name if unit.filiere else None,
        "courses": [{
            "id": c.id,
            "code": c.code,
            "title": c.title,
            "credits": c.credits,
            "hours": c.hours,
            "teacher_id": c.teacher_id,
            "teacher_name": f"{c.teacher.first_name} {c.teacher.last_name}" if c.teacher else None
        } for c in courses]
    }


@router.get("/{id}/courses")
def get_teaching_unit_courses(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "censeur", "secretary", "teacher", "student"))
):
    """Liste des cours appartenant à une Unité d'Enseignement"""
    unit = db.query(TeachingUnit).filter(
        TeachingUnit.id == id,
        TeachingUnit.university_id == current_user.university_id
    ).first()

    if not unit:
        raise HTTPException(status_code=404, detail="Unité d'enseignement non trouvée")

    courses = db.query(Course).filter(Course.teaching_unit_id == unit.id).all()
    return [{
        "id": c.id,
        "code": c.code,
        "title": c.title,
        "credits": c.credits,
        "hours": c.hours,
        "teacher_id": c.teacher_id,
        "teacher_name": f"{c.teacher.first_name} {c.teacher.last_name}" if c.teacher else None
    } for c in courses]


@router.post("/")
def create_teaching_unit(
    data: TeachingUnitCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "censeur"))
):
    """Créer une nouvelle Unité d'Enseignement (UE)"""
    new_unit = TeachingUnit(
        code=data.code.strip().upper(),
        name=data.name.strip(),
        credits=data.credits,
        category=data.category,
        semester=data.semester,
        level=data.level,
        description=data.description,
        filiere_id=data.filiere_id,
        university_id=current_user.university_id
    )
    db.add(new_unit)
    db.flush()

    # Rattacher les cours si fournis
    if data.course_ids:
        for cid in data.course_ids:
            course = db.query(Course).filter(
                Course.id == cid,
                Course.university_id == current_user.university_id
            ).first()
            if course:
                course.teaching_unit_id = new_unit.id

    db.commit()
    db.refresh(new_unit)

    return {
        "message": "Unité d'Enseignement créée avec succès",
        "id": new_unit.id,
        "code": new_unit.code,
        "name": new_unit.name,
        "credits": new_unit.credits
    }


@router.put("/{id}")
def update_teaching_unit(
    id: int,
    data: TeachingUnitUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "censeur"))
):
    """Modifier une Unité d'Enseignement existante"""
    unit = db.query(TeachingUnit).filter(
        TeachingUnit.id == id,
        TeachingUnit.university_id == current_user.university_id
    ).first()

    if not unit:
        raise HTTPException(status_code=404, detail="Unité d'enseignement non trouvée")

    if data.code is not None:
        unit.code = data.code.strip().upper()
    if data.name is not None:
        unit.name = data.name.strip()
    if data.credits is not None:
        unit.credits = data.credits
    if data.category is not None:
        unit.category = data.category
    if data.semester is not None:
        unit.semester = data.semester
    if data.level is not None:
        unit.level = data.level
    if data.description is not None:
        unit.description = data.description
    if data.filiere_id is not None:
        unit.filiere_id = data.filiere_id

    # Mettre à jour les cours rattachés si fournis
    if data.course_ids is not None:
        # Détacher les anciens cours
        db.query(Course).filter(
            Course.teaching_unit_id == unit.id,
            Course.university_id == current_user.university_id
        ).update({"teaching_unit_id": None})

        # Rattacher les nouveaux
        for cid in data.course_ids:
            c = db.query(Course).filter(
                Course.id == cid,
                Course.university_id == current_user.university_id
            ).first()
            if c:
                c.teaching_unit_id = unit.id

    db.commit()
    db.refresh(unit)

    return {"message": "Unité d'Enseignement mise à jour avec succès", "id": unit.id}


@router.delete("/{id}")
def delete_teaching_unit(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "censeur"))
):
    """Supprimer une Unité d'Enseignement (détache automatiquement les cours)"""
    unit = db.query(TeachingUnit).filter(
        TeachingUnit.id == id,
        TeachingUnit.university_id == current_user.university_id
    ).first()

    if not unit:
        raise HTTPException(status_code=404, detail="Unité d'enseignement non trouvée")

    # Détacher les cours
    db.query(Course).filter(
        Course.teaching_unit_id == unit.id
    ).update({"teaching_unit_id": None})

    db.delete(unit)
    db.commit()

    return {"message": "Unité d'Enseignement supprimée avec succès"}

@router.get("/{id}/courses")
def get_teaching_unit_courses(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "censeur", "teacher", "student", "secretary"))
):
    unit = db.query(TeachingUnit).filter(
        TeachingUnit.id == id,
        TeachingUnit.university_id == current_user.university_id
    ).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Unité d'enseignement non trouvée")
    courses = db.query(Course).filter(Course.teaching_unit_id == unit.id).all()
    return [
        {
            "id": c.id,
            "code": c.code,
            "title": c.title,
            "credits": c.credits or 3,
            "hours": c.hours or 30,
            "teacher_id": c.teacher_id,
            "teacher_name": f"{c.teacher.first_name} {c.teacher.last_name}" if c.teacher else None
        }
        for c in courses
    ]

@router.get("/curriculum/{filiere_id}/{level}")
def get_curriculum(
    filiere_id: int,
    level: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "censeur", "teacher", "student", "secretary"))
):
    units = db.query(TeachingUnit).filter(
        TeachingUnit.filiere_id == filiere_id,
        TeachingUnit.level == level,
        TeachingUnit.university_id == current_user.university_id
    ).all()
    return [
        {
            "id": u.id,
            "code": u.code,
            "name": u.name,
            "credits": u.credits,
            "category": u.category,
            "semester": u.semester,
            "courses_count": len(u.courses) if hasattr(u, 'courses') else 0
        }
        for u in units
    ]

