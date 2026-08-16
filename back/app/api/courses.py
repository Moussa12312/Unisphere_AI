from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.connection import SessionLocal
from app.models.course import Course
from app.models.teacher import Teacher
from app.models.filiere import Filiere 
from app.models.user import User
from app.models.course_history import CourseHistory
from datetime import datetime
from app.schemas.course_schema import CourseCreate, CourseUpdate
from app.core.dependencies import get_current_user, require_role
import re
import unicodedata

router = APIRouter(prefix="/courses", tags=["Courses"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

import re
import unicodedata

def generate_course_code(title: str, department: str, level: str) -> str:
    """Génère un code de cours automatique : DPT-NIV-TITRE"""
    # 1. Préfixe du département (3 premières lettres en majuscules)
    dept_prefix = re.sub(r'[^A-Za-z]', '', department)[:3].upper() or "COURS"
    
    # 2. Normaliser le titre (enlever accents et caractères spéciaux)
    normalized = unicodedata.normalize('NFKD', title)
    normalized = ''.join(c for c in normalized if not unicodedata.combining(c))
    normalized = re.sub(r'[^A-Za-z0-9\s]', '', normalized)
    
    # 3. Prendre les mots significatifs (exclure les petits mots)
    stop_words = {'de', 'du', 'des', 'le', 'la', 'les', 'un', 'une', 'et', 'a', 'au', 'aux', 'en', 'pour', 'par', 'sur'}
    words = [w for w in normalized.split() if w.lower() not in stop_words and len(w) > 1]
    
    # 4. Construire l'abréviation du titre (max 6 caractères)
    if words:
        title_abbr = ''.join(w[:3].upper() for w in words[:3])
    else:
        title_abbr = "COURS"
    
    # 5. Assembler le code final
    return f"{dept_prefix}-{level}-{title_abbr}"


@router.post("/")
def create_course(
    course: CourseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "censeur", "teacher"))
):
    # ✅ Validation
    if not course.filiere_id and not course.department:
        raise HTTPException(status_code=400, detail="Vous devez sélectionner une filière ou un département")
    
    # ✅ Récupérer le département depuis la filière
    department = course.department
    if course.filiere_id:
        filiere = db.query(Filiere).filter(
            Filiere.id == course.filiere_id,
            Filiere.university_id == current_user.university_id
        ).first()
        if not filiere:
            raise HTTPException(status_code=404, detail="Filière non trouvée")
        department = filiere.name
    
    # Générer le code
    code = course.code
    if not code or code.strip() == "":
        code = generate_course_code(course.title, department, course.level)
    
    # Vérifier unicité
    existing = db.query(Course).filter(
        Course.code == code,
        Course.university_id == current_user.university_id
    ).first()
    
    if existing:
        suffix = 2
        while db.query(Course).filter(
            Course.code == f"{code}-{suffix}",
            Course.university_id == current_user.university_id
        ).first():
            suffix += 1
        code = f"{code}-{suffix}"
    
    new_course = Course(
        title=course.title,
        code=code,
        department=department,
        level=course.level,
        teacher_id=course.teacher_id,
        credits=course.credits,
        hours=course.hours,
        university_id=current_user.university_id,
        filiere_id=course.filiere_id  # ✅ NOUVEAU
    )
    
    db.add(new_course)
    db.commit()

        # ✅ Enregistrer dans l'historique
    history_entry = CourseHistory(
        course_id=new_course.id,
        action="created",
        field_changed=None,
        old_value=None,
        new_value=f"Cours '{new_course.title}' créé",
        user_name=current_user.full_name,
        created_at=datetime.utcnow()
    )
    db.add(history_entry)
    db.commit()

    db.refresh(new_course)
    
    return new_course

@router.get("/")
def get_courses(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary", "censeur", "teacher"))
):
    courses = db.query(Course).filter(
        Course.university_id == current_user.university_id
    ).all()
    
    result = []
    for c in courses:
        teacher_name = "Non assigné"
        if c.teacher_id:
            teacher = db.query(Teacher).filter(Teacher.id == c.teacher_id).first()
            if teacher:
                teacher_name = f"{teacher.first_name} {teacher.last_name}"
        
        result.append({
            "id": c.id,
            "title": c.title,
            "code": c.code,
            "department": c.department,
            "level": c.level,
            "credits": c.credits,
            "hours": c.hours,
            "teacher_id": c.teacher_id,
            "teacher_name": teacher_name,
            "filiere_id": c.filiere_id
        })
    return result

@router.get("/{course_id}")
def get_course(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    course = db.query(Course).filter(
        Course.id == course_id,
        Course.university_id == current_user.university_id
    ).first()
    if not course:
        raise HTTPException(status_code=404, detail="Cours non trouvé")
    
    teacher_name = "Non assigné"
    if course.teacher_id:
        teacher = db.query(Teacher).filter(Teacher.id == course.teacher_id).first()
        if teacher:
            teacher_name = f"{teacher.first_name} {teacher.last_name}"
    
    return {
        "id": course.id,
        "title": course.title,
        "code": course.code,
        "department": course.department,
        "level": course.level,
        "credits": course.credits,
        "hours": course.hours,
        "teacher_id": course.teacher_id,
        "teacher_name": teacher_name,
        "filiere_id": course.filiere_id,
        "university_id": course.university_id
    }

@router.put("/{course_id}")
def update_course(
    course_id: int,
    course: CourseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary"))
):
    existing_course = db.query(Course).filter(
        Course.id == course_id,
        Course.university_id == current_user.university_id
    ).first()
    if not existing_course:
        raise HTTPException(status_code=404, detail="Cours non trouvé")

    # ✅ ENREGISTRER DANS L'HISTORIQUE UNIQUEMENT SI CHANGEMENT RÉEL
    from app.models.course_history import CourseHistory
    from datetime import datetime
    
    # 1. Titre (seulement si fourni ET différent)
    if course.title is not None and course.title != existing_course.title:
        db.add(CourseHistory(
            course_id=existing_course.id,
            action="updated",
            field_changed="title",
            old_value=existing_course.title,
            new_value=course.title,
            user_name=current_user.full_name,
            created_at=datetime.utcnow()
        ))
        existing_course.title = course.title
    
    # 2. Niveau (seulement si fourni ET différent)
    if course.level is not None and course.level != existing_course.level:
        db.add(CourseHistory(
            course_id=existing_course.id,
            action="updated",
            field_changed="level",
            old_value=existing_course.level,
            new_value=course.level,
            user_name=current_user.full_name,
            created_at=datetime.utcnow()
        ))
        existing_course.level = course.level
    
    # 3. Enseignant (seulement si fourni ET différent)
    if course.teacher_id is not None and course.teacher_id != existing_course.teacher_id:
        old_teacher_name = "Non assigné"
        new_teacher_name = "Non assigné"
        
        if existing_course.teacher_id:
            old_teacher = db.query(Teacher).filter(Teacher.id == existing_course.teacher_id).first()
            if old_teacher:
                old_teacher_name = f"{old_teacher.first_name} {old_teacher.last_name}"
        
        if course.teacher_id:  # Seulement si un nouvel enseignant est assigné
            new_teacher = db.query(Teacher).filter(Teacher.id == course.teacher_id).first()
            if new_teacher:
                new_teacher_name = f"{new_teacher.first_name} {new_teacher.last_name}"
        
        db.add(CourseHistory(
            course_id=existing_course.id,
            action="updated",
            field_changed="teacher_id",
            old_value=old_teacher_name,
            new_value=new_teacher_name,
            user_name=current_user.full_name,
            created_at=datetime.utcnow()
        ))
        existing_course.teacher_id = course.teacher_id
    
    # 4. Volume horaire (seulement si fourni ET différent)
    if course.hours is not None and course.hours != existing_course.hours:
        db.add(CourseHistory(
            course_id=existing_course.id,
            action="updated",
            field_changed="hours",
            old_value=f"{existing_course.hours}h",
            new_value=f"{course.hours}h",
            user_name=current_user.full_name,
            created_at=datetime.utcnow()
        ))
        existing_course.hours = course.hours
    
    # 5. Crédits (seulement si fourni ET différent)
    if course.credits is not None and course.credits != existing_course.credits:
        db.add(CourseHistory(
            course_id=existing_course.id,
            action="updated",
            field_changed="credits",
            old_value=str(existing_course.credits),
            new_value=str(course.credits),
            user_name=current_user.full_name,
            created_at=datetime.utcnow()
        ))
        existing_course.credits = course.credits
    
    # 6. Filière
    if course.filiere_id is not None and course.filiere_id != existing_course.filiere_id:
        from app.models.filiere import Filiere
        filiere = db.query(Filiere).filter(
            Filiere.id == course.filiere_id,
            Filiere.university_id == current_user.university_id
        ).first()
        if filiere:
            db.add(CourseHistory(
                course_id=existing_course.id,
                action="updated",
                field_changed="filiere",
                old_value=existing_course.department,
                new_value=filiere.name,
                user_name=current_user.full_name,
                created_at=datetime.utcnow()
            ))
            existing_course.department = filiere.name
            existing_course.filiere_id = course.filiere_id

    # ✅ Valider TOUT
    db.commit()
    db.refresh(existing_course)
    
    return existing_course


@router.get("/{course_id}/history")
def get_course_history(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Vérifier que le cours existe et appartient à l'université
    course = db.query(Course).filter(
        Course.id == course_id,
        Course.university_id == current_user.university_id
    ).first()
    if not course:
        raise HTTPException(status_code=404, detail="Cours non trouvé")
    
    # Récupérer l'historique
    history = db.query(CourseHistory).filter(
        CourseHistory.course_id == course_id
    ).order_by(CourseHistory.created_at.desc()).all()
    
    return [
        {
            "id": h.id,
            "action": h.action,
            "field_changed": h.field_changed,
            "old_value": h.old_value,
            "new_value": h.new_value,
            "user_name": h.user_name,
            "created_at": h.created_at.isoformat()
        }
        for h in history
    ]


@router.delete("/{course_id}")
def delete_course(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "secretary"))
):
    course = db.query(Course).filter(
        Course.id == course_id,
        Course.university_id == current_user.university_id
    ).first()
    if not course:
        raise HTTPException(status_code=404, detail="Cours non trouvé")
    
    db.delete(course)
    db.commit()
    return {"message": "Cours supprimé"}