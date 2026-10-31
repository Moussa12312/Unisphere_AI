"""
UniSphere AI - Module de Clôture & Migration d'Année Académique
Permet la bascule sécurisée d'une année scolaire à la suivante (ex: 2026-2027 -> 2027-2028),
avec promotion automatique des étudiants admis (L1->L2, L2->L3, L3->Diplômé),
maintien des redoublants, archivage historique et initialisation de la nouvelle rentrée.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

from app.database.connection import get_db
from app.models.user import User
from app.models.university import University
from app.models.academic_config import AcademicConfig
from app.models.student import Student
from app.models.grade import Grade
from app.models.deliberation import DeliberationDecision, DeliberationSession
from app.models.student_academic_history import StudentAcademicHistory
from app.core.dependencies import require_role
from app.utils.academic_year import get_current_academic_year

router = APIRouter(prefix="/academic-year-transition", tags=["Transition Année Académique"])


def calculate_next_academic_year(current_year: str) -> str:
    """Calcule automatiquement l'année suivante (ex: '2026-2027' -> '2027-2028')."""
    try:
        if "-" in current_year:
            parts = current_year.split("-")
            y1 = int(parts[0].strip())
            y2 = int(parts[1].strip())
            return f"{y1 + 1}-{y2 + 1}"
    except Exception:
        pass
    # Secours basé sur l'année actuelle
    y = datetime.now().year
    return f"{y}-{y + 1}"


def get_next_level(current_level: str) -> tuple[str, str]:
    """Détermine le niveau supérieur selon le schéma LMD."""
    lvl = (current_level or "").strip().upper()
    
    # Mapping Licence
    if lvl in ["L1", "LICENCE 1", "LICENCE 1ÈRE ANNÉE", "1ÈRE ANNÉE", "1ERE ANNEE"]:
        return "L2", "promoted"
    elif lvl in ["L2", "LICENCE 2", "LICENCE 2ÈME ANNÉE", "2ÈME ANNÉE", "2EME ANNEE"]:
        return "L3", "promoted"
    elif lvl in ["L3", "LICENCE 3", "LICENCE 3ÈME ANNÉE", "3ÈME ANNÉE", "3EME ANNEE"]:
        return "Diplômé Licence", "graduated"
    
    # Mapping Master
    elif lvl in ["M1", "MASTER 1", "MASTER 1ÈRE ANNÉE"]:
        return "M2", "promoted"
    elif lvl in ["M2", "MASTER 2", "MASTER 2ÈME ANNÉE"]:
        return "Diplômé Master", "graduated"
    
    # Mapping Doctorat
    elif lvl in ["D1", "DOCTORAT 1"]:
        return "D2", "promoted"
    elif lvl in ["D2", "DOCTORAT 2"]:
        return "D3", "promoted"
    elif lvl in ["D3", "DOCTORAT 3"]:
        return "Docteur Diplômé", "graduated"
    
    # Défaut
    return lvl, "promoted"


class TransitionExecutionRequest(BaseModel):
    target_academic_year: str = Field(..., description="Année académique cible, ex: '2027-2028'")
    auto_promote_by_average: bool = Field(True, description="Si vrai, promeut les étudiants sans délibération formelle ayant moyenne >= 10")
    min_passing_average: float = Field(10.0, description="Moyenne minimale pour admission automatique")
    auto_promote_l3_to_m1: bool = Field(False, description="Si vrai, inscrit les diplômés de Licence directement en Master 1")
    notes: Optional[str] = Field(None, description="Notes explicatives de la bascule")


@router.get("/preview")
def preview_academic_year_transition(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "super_admin"))
):
    """
    Simule la clôture de l'année courante et la bascule vers la suivante.
    Retourne la liste des étudiants avec leur statut prévisionnel (Admis, Redouble, Diplômé).
    """
    univ_id = current_user.university_id or 1
    current_year = get_current_academic_year(db, univ_id)
    suggested_next_year = calculate_next_academic_year(current_year)

    # Récupérer tous les étudiants actifs
    students = db.query(Student).filter(
        Student.university_id == univ_id,
        Student.status == "active"
    ).all()

    total_students = len(students)
    
    # Statistiques par niveau
    levels_count: Dict[str, int] = {}
    for s in students:
        lvl = s.level or "Non défini"
        levels_count[lvl] = levels_count.get(lvl, 0) + 1

    # Analyse des délibérations et résultats de chaque étudiant
    promotions_summary = {
        "admis": 0,
        "redoublants": 0,
        "diplomes": 0,
        "a_deliberer": 0
    }

    students_preview = []

    for s in students:
        # 1. Vérifier si une délibération officielle existe pour cet étudiant
        last_decision = db.query(DeliberationDecision).join(DeliberationSession).filter(
            DeliberationDecision.student_id == s.id,
            DeliberationSession.academic_year == current_year
        ).order_by(DeliberationDecision.id.desc()).first()

        decision_type = "pending"
        avg_score = None

        if last_decision and last_decision.decision:
            decision_type = last_decision.decision.lower()
            avg_score = last_decision.average
        else:
            # Calculer la moyenne des notes de l'étudiant s'il y en a
            student_grades = db.query(Grade).filter(Grade.student_id == s.id).all()
            if student_grades:
                scores = [g.score for g in student_grades if g.score is not None]
                if scores:
                    avg_score = round(sum(scores) / len(scores), 2)
                    decision_type = "admis" if avg_score >= 10.0 else "redouble"

        # Déterminer la projection future
        current_lvl = s.level or "L1"
        target_lvl, status_kind = get_next_level(current_lvl)

        future_level = current_lvl
        future_status = "active"

        if decision_type in ["admis", "admis(e)", "validé"]:
            if status_kind == "graduated":
                future_level = current_lvl
                future_status = "graduated"
                promotions_summary["diplomes"] += 1
            else:
                future_level = target_lvl
                promotions_summary["admis"] += 1
        elif decision_type in ["redouble", "ajourné", "échec"]:
            promotions_summary["redoublants"] += 1
            future_level = current_lvl
        else:
            promotions_summary["a_deliberer"] += 1

        students_preview.append({
            "id": s.id,
            "matricule": s.matricule,
            "name": f"{s.last_name or ''} {s.first_name or ''}".strip(),
            "filiere": s.filiere,
            "current_level": current_lvl,
            "average": avg_score,
            "decision": decision_type,
            "projected_level": future_level,
            "projected_status": future_status
        })

    return {
        "current_academic_year": current_year,
        "suggested_next_year": suggested_next_year,
        "total_active_students": total_students,
        "levels_distribution": levels_count,
        "promotions_summary": promotions_summary,
        "students": students_preview[:50]  # Échantillon des 50 premiers pour fluidité
    }


@router.post("/execute")
def execute_academic_year_transition(
    payload: TransitionExecutionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "super_admin"))
):
    """
    Exécute la bascule d'année académique de façon atomique et sécurisée.
    Archive l'année passée, promeut les étudiants admis et met à jour l'année active.
    """
    univ_id = current_user.university_id or 1
    current_year = get_current_academic_year(db, univ_id)
    target_year = payload.target_academic_year.strip()

    if target_year == current_year:
        raise HTTPException(
            status_code=400,
            detail=f"L'année cible ({target_year}) doit être différente de l'année actuelle ({current_year})."
        )

    # Récupérer l'université et sa configuration
    univ = db.query(University).filter(University.id == univ_id).first()
    config = db.query(AcademicConfig).filter(AcademicConfig.university_id == univ_id).first()
    if not config:
        config = AcademicConfig(university_id=univ_id)
        db.add(config)

    # Récupérer tous les étudiants actifs
    students = db.query(Student).filter(
        Student.university_id == univ_id,
        Student.status == "active"
    ).all()

    promoted_count = 0
    repeated_count = 0
    graduated_count = 0
    archived_count = 0

    for s in students:
        # Vérifier s'il y a une délibération enregistrée
        last_decision = db.query(DeliberationDecision).join(DeliberationSession).filter(
            DeliberationDecision.student_id == s.id,
            DeliberationSession.academic_year == current_year
        ).order_by(DeliberationDecision.id.desc()).first()

        avg_score = None
        decision = "admis"

        if last_decision and last_decision.decision:
            decision = last_decision.decision.lower()
            avg_score = last_decision.average
        elif payload.auto_promote_by_average:
            student_grades = db.query(Grade).filter(Grade.student_id == s.id).all()
            if student_grades:
                scores = [g.score for g in student_grades if g.score is not None]
                if scores:
                    avg_score = round(sum(scores) / len(scores), 2)
                    decision = "admis" if avg_score >= payload.min_passing_average else "redouble"

        current_lvl = s.level or "L1"
        next_lvl, status_kind = get_next_level(current_lvl)

        # 1. Archiver dans l'historique académique de l'étudiant
        history_entry = StudentAcademicHistory(
            student_id=s.id,
            university_id=univ_id,
            academic_year=current_year,
            filiere=s.filiere or "Tronc Commun",
            level=current_lvl,
            annual_average=avg_score,
            decision=decision,
            promoted_to_level=next_lvl if decision == "admis" else current_lvl,
            notes=f"Clôture officielle de l'année {current_year}"
        )
        db.add(history_entry)
        archived_count += 1

        # 2. Appliquer la promotion / maintien
        if decision in ["admis", "admis(e)", "validé"]:
            if status_kind == "graduated":
                # Étudiant ayant terminé son cycle (ex: Licence 3 ou Master 2)
                if current_lvl in ["L3", "Licence 3"] and payload.auto_promote_l3_to_m1:
                    s.level = "M1"
                    s.student_type = "returning"
                    promoted_count += 1
                else:
                    s.status = "graduated"
                    graduated_count += 1
            else:
                s.level = next_lvl
                s.student_type = "returning"  # Marqué comme réinscription
                promoted_count += 1
        else:
            # Redoublement : maintien au même niveau
            s.student_type = "returning"
            repeated_count += 1

    # 3. Mettre à jour l'année académique active
    config.current_academic_year = target_year
    config.grades_locked = False  # Déverrouiller la saisie des notes pour la nouvelle année
    if univ:
        univ.academic_year = target_year

    db.commit()

    return {
        "success": True,
        "message": f"Bascule académique réussie : {current_year} ➔ {target_year}",
        "previous_year": current_year,
        "new_academic_year": target_year,
        "promoted_students": promoted_count,
        "repeated_students": repeated_count,
        "graduated_students": graduated_count,
        "total_archived": archived_count,
        "executed_at": datetime.now().strftime("%d/%m/%Y à %H:%M:%S")
    }


@router.get("/history")
def get_transition_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "super_admin"))
):
    """Retourne l'historique des clôtures et bascules passées."""
    univ_id = current_user.university_id or 1
    
    # Années archivées distinctes
    years = db.query(StudentAcademicHistory.academic_year).filter(
        StudentAcademicHistory.university_id == univ_id
    ).distinct().all()

    results = []
    for (yr,) in years:
        total = db.query(StudentAcademicHistory).filter(
            StudentAcademicHistory.university_id == univ_id,
            StudentAcademicHistory.academic_year == yr
        ).count()

        admis = db.query(StudentAcademicHistory).filter(
            StudentAcademicHistory.university_id == univ_id,
            StudentAcademicHistory.academic_year == yr,
            StudentAcademicHistory.decision == "admis"
        ).count()

        results.append({
            "academic_year": yr,
            "total_students": total,
            "admitted_students": admis,
            "success_rate": f"{(admis / total * 100):.1f}%" if total > 0 else "0%"
        })

    return results
