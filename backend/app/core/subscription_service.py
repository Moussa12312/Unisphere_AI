"""
Service de gestion des accès UniSphere AI (Mode Facturation Directe - Sans Restriction).
Toutes les universités bénéficient d'un accès complet et illimité à l'ensemble des fonctionnalités.
"""
from typing import Dict, Any
from sqlalchemy.orm import Session


def get_status(db: Session, university_id: int) -> Dict[str, Any]:
    """
    Retourne un statut d'accès illimité permanent sans restriction d'abonnement.
    """
    return {
        "status": "active",
        "plan": "Accès Illimité",
        "is_active": True,
        "days_left": 99999,
        "university_id": university_id
    }


def ensure_subscription_exists(db: Session, university_id: int) -> Dict[str, Any]:
    """
    Assure l'accès immédiat et gratuit à toutes les fonctionnalités.
    """
    print(f"[OK] Accès illimité actif pour l'université ID={university_id}")
    return get_status(db, university_id)
