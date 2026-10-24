from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel

from app.database.connection import SessionLocal
from app.models.user import User
from app.core.dependencies import get_current_user, require_role
from app.core.subscription_service import get_status

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class CheckoutRequest(BaseModel):
    provider: str = "wave"
    months: int = 1


@router.get("/me")
def get_my_subscription(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Récupère l'état de l'abonnement de l'université connectée.
    """
    if not current_user.university_id:
        return {
            "status": "active",
            "plan": "Accès Administrateur",
            "is_active": True,
            "days_left": 99999,
            "university_id": None
        }
    
    return get_status(db, current_user.university_id)


@router.get("/plans")
def get_plans():
    """
    Retourne la liste des plans disponibles.
    """
    return [
        {
            "id": "enterprise",
            "name": "UniSphere Institutionnel",
            "price": 0,
            "period": "permanent",
            "description": "Accès complet et illimité à tous les modules",
            "features": [
                "Gestion académique LMD complète",
                "Comptabilité & Facturation temps réel",
                "Cartes étudiantes sécurisées avec QR code",
                "Assistant IA intégré",
                "Gestion des examens et délibérations",
                "Portail Alumni & Insertion professionnelle"
            ]
        }
    ]


@router.post("/checkout")
def checkout_subscription(
    payload: CheckoutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """
    Initiation d'une transaction de paiement ou renouvellement d'abonnement.
    """
    status = get_status(db, current_user.university_id)
    return {
        "success": True,
        "status": "active",
        "provider": payload.provider,
        "months": payload.months,
        "message": "Votre université bénéficie d'un accès institutionnel actif.",
        "checkout_url": None,
        "subscription": status
    }
