"""
✅ AJOUTÉ : utilitaire partagé pour obtenir l'année académique courante.

Avant, la valeur "2025-2026" était codée en dur dans plusieurs fichiers
(academic_fees.py, financials.py, students.py...). Cassait silencieusement
tout filtrage/étiquetage par année académique dès que l'année réelle changeait.

Maintenant, on lit AcademicConfig.current_academic_year (configurable par
l'admin via /settings), avec un calcul de secours basé sur la date du jour
si aucune config n'existe encore pour l'université.
"""
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.academic_config import AcademicConfig


def get_current_academic_year(db: Session, university_id: int) -> str:
    config = db.query(AcademicConfig).filter(
        AcademicConfig.university_id == university_id
    ).first()

    if config and config.current_academic_year:
        return config.current_academic_year

    # Secours : on suppose que l'année académique commence en septembre
    now = datetime.now()
    start_year = now.year if now.month >= 9 else now.year - 1
    return f"{start_year}-{start_year + 1}"