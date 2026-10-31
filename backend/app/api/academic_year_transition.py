"""
UniSphere AI - Module de Clôture & Migration d'Année Académique
Permet la bascule d'une année scolaire à la suivante (ex: 2026-2027 -> 2027-2028),
avec choix de politique de promotion :
1. "admitted_only" : Seuls les admis passent (les redoublants restent dans leur classe)
2. "conditional"   : Passage conditionnel LMD (les admis passent, et les étudiants avec moyenne >= 8/20 ou rattrapage passent avec dettes)
3. "all_pass"      : Passage généralisé (décision rectorale exceptionnelle : tout le monde passe)
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
    
    return lvl, "promoted"


class TransitionExecutionRequest(BaseModel):
    target_academic_year: str = Field(..., description="Année académique cible, ex: '2027-2028'")
    promotion_policy: str = Field(
        "admitted_only",
        description="Politique de promotion : 'admitted_only' (admis seuls), 'conditional' (passage conditionnel avec crédits), ou 'all_pass' (passage généralisé de tous)"
    )
    conditional_min_average: float = Field(8.0, description="Moyenne min pour passage conditionnel")
    auto_promote_by_average: bool = Field(True, description="Si vrai, promeut les étudiants sans délibération formelle ayant moyenne >= 10")
    min_passing_average: float = Field(10.0, description="Moyenne minimale pour admission automatique")
    auto_promote_l3_to_m1: bool = Field(False, description="Si vrai, inscrit les diplômés de Licence directement en Master 1")
    notes: Optional[str] = Field(None, description="Notes explicatives de la bascule")


@router.get("/preview")
def preview_academic_year_transition(
    policy: str = Query("admitted_only", description="Politique de promotion simulée"),
    conditional_min_avg: float = Query(8.0, description="Moyenne min pour passage conditionnel"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "super_admin"))
):
    """
    Simule la clôture de l'année courante selon la politique choisie :
    - admitted_only : seuls les admis passent
    - conditional   : admis + rattrapage/notes >= conditional_min_avg passent
    - all_pass      : tout le monde passe, y compris les redoublants
    """
    univ_id = current_user.university_id or 1
    current_year = get_current_academic_year(db, univ_id)
    suggested_next_year = calculate_next_academic_year(current_year)

    students = db.query(Student).filter(
        Student.university_id == univ_id,
        Student.status == "active"
    ).all()

    total_students = len(students)
    
    levels_count: Dict[str, int] = {}
    for s in students:
        lvl = s.level or "Non défini"
        levels_count[lvl] = levels_count.get(lvl, 0) + 1

    promotions_summary = {
        "admis": 0,
        "redoublants": 0,
        "diplomes": 0,
        "a_deliberer": 0
    }

    students_preview = []

    for s in students:
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
            student_grades = db.query(Grade).filter(Grade.student_id == s.id).all()
            if student_grades:
                scores = [g.score for g in student_grades if g.score is not None]
                if scores:
                    avg_score = round(sum(scores) / len(scores), 2)
                    decision_type = "admis" if avg_score >= 10.0 else "redouble"

        current_lvl = s.level or "L1"
        target_lvl, status_kind = get_next_level(current_lvl)

        # Application de la politique
        should_promote = False
        promotion_reason = "Maintien au niveau"

        if policy == "all_pass":
            should_promote = True
            promotion_reason = "Passage généralisé autorisé"
        elif policy == "conditional":
            if decision_type in ["admis", "admis(e)", "validé"]:
                should_promote = True
                promotion_reason = "Admis direct"
            elif avg_score is not None and avg_score >= conditional_min_avg:
                should_promote = True
                promotion_reason = f"Passage conditionnel (Moyenne {avg_score:.2f} >= {conditional_min_avg})"
            elif decision_type in ["rattrapage", "compensation"]:
                should_promote = True
                promotion_reason = "Passage conditionnel avec dettes"
        else:  # admitted_only
            if decision_type in ["admis", "admis(e)", "validé"]:
                should_promote = True
                promotion_reason = "Admis au jury"

        future_level = current_lvl
        future_status = "active"

        if should_promote:
            if status_kind == "graduated":
                future_level = current_lvl
                future_status = "graduated"
                promotions_summary["diplomes"] += 1
            else:
                future_level = target_lvl
                promotions_summary["admis"] += 1
        else:
            if decision_type == "pending":
                promotions_summary["a_deliberer"] += 1
            else:
                promotions_summary["redoublants"] += 1

        students_preview.append({
            "id": s.id,
            "matricule": s.matricule,
            "name": f"{s.last_name or ''} {s.first_name or ''}".strip(),
            "filiere": s.filiere,
            "current_level": current_lvl,
            "average": avg_score,
            "decision": decision_type,
            "should_promote": should_promote,
            "promotion_reason": promotion_reason,
            "projected_level": future_level,
            "projected_status": future_status
        })

    return {
        "current_academic_year": current_year,
        "suggested_next_year": suggested_next_year,
        "applied_policy": policy,
        "total_active_students": total_students,
        "levels_distribution": levels_count,
        "promotions_summary": promotions_summary,
        "students": students_preview[:60]
    }


@router.post("/execute")
def execute_academic_year_transition(
    payload: TransitionExecutionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "super_admin"))
):
    """
    Exécute la bascule d'année académique de façon atomique et sécurisée.
    Applique la politique choisie (Admis uniquement, Conditionnel, ou Tous).
    """
    univ_id = current_user.university_id or 1
    current_year = get_current_academic_year(db, univ_id)
    target_year = payload.target_academic_year.strip()

    if target_year == current_year:
        raise HTTPException(
            status_code=400,
            detail=f"L'année cible ({target_year}) doit être différente de l'année actuelle ({current_year})."
        )

    univ = db.query(University).filter(University.id == univ_id).first()
    config = db.query(AcademicConfig).filter(AcademicConfig.university_id == univ_id).first()
    if not config:
        config = AcademicConfig(university_id=univ_id)
        db.add(config)

    students = db.query(Student).filter(
        Student.university_id == univ_id,
        Student.status == "active"
    ).all()

    promoted_count = 0
    repeated_count = 0
    graduated_count = 0
    archived_count = 0

    for s in students:
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

        # 1. Vérifier si l'étudiant doit être promu selon la politique sélectionnée
        should_promote = False
        if payload.promotion_policy == "all_pass":
            should_promote = True
        elif payload.promotion_policy == "conditional":
            if decision in ["admis", "admis(e)", "validé"]:
                should_promote = True
            elif avg_score is not None and avg_score >= payload.conditional_min_average:
                should_promote = True
            elif decision in ["rattrapage", "compensation"]:
                should_promote = True
        else:  # admitted_only
            if decision in ["admis", "admis(e)", "validé"]:
                should_promote = True

        # 2. Archiver dans l'historique académique de l'étudiant
        history_entry = StudentAcademicHistory(
            student_id=s.id,
            university_id=univ_id,
            academic_year=current_year,
            filiere=s.filiere or "Tronc Commun",
            level=current_lvl,
            annual_average=avg_score,
            decision=decision,
            promoted_to_level=next_lvl if should_promote else current_lvl,
            notes=f"Clôture de l'année {current_year} (Politique : {payload.promotion_policy})"
        )
        db.add(history_entry)
        archived_count += 1

        # 3. Mettre à jour l'étudiant
        if should_promote:
            if status_kind == "graduated":
                if current_lvl in ["L3", "Licence 3"] and payload.auto_promote_l3_to_m1:
                    s.level = "M1"
                    s.student_type = "returning"
                    promoted_count += 1
                else:
                    s.status = "graduated"
                    graduated_count += 1
            else:
                s.level = next_lvl
                s.student_type = "returning"
                promoted_count += 1
        else:
            s.student_type = "returning"
            repeated_count += 1

    # 4. Mettre à jour l'année académique active
    config.current_academic_year = target_year
    config.grades_locked = False
    if univ:
        univ.academic_year = target_year

    db.commit()

    policy_labels = {
        "admitted_only": "Seuls les Admis",
        "conditional": "Passage Conditionnel LMD",
        "all_pass": "Passage Généralisé"
    }

    return {
        "success": True,
        "message": f"Bascule académique réussie : {current_year} ➔ {target_year} ({policy_labels.get(payload.promotion_policy, payload.promotion_policy)})",
        "previous_year": current_year,
        "new_academic_year": target_year,
        "applied_policy": payload.promotion_policy,
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
