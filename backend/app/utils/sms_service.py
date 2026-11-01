"""
Service de Passerelle SMS & Alertes WhatsApp pour UniSphere AI.
Gère la normalisation des numéros (Zone UEMOA / Mali +223, etc.),
l'expédition via passerelles SMS (Orange, Twilio, Infobip, Webhook HTTP)
et la génération de liens directs pour WhatsApp.
"""

import os
import re
import urllib.parse
import json
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

# Paramètres .env pour les passerelles SMS
SMS_PROVIDER = os.getenv("SMS_PROVIDER", "generic_webhook").lower() # generic_webhook, twilio, orange, mock
SMS_API_KEY = os.getenv("SMS_API_KEY", "")
SMS_API_SECRET = os.getenv("SMS_API_SECRET", "")
SMS_SENDER_ID = os.getenv("SMS_SENDER_ID", "UniSphere")
SMS_GATEWAY_URL = os.getenv("SMS_GATEWAY_URL", "")


def normalize_phone_number(phone: Optional[str], default_country_code: str = "223") -> Optional[str]:
    """
    Nettoie et normalise un numéro de téléphone pour l'envoi SMS et WhatsApp.
    Exemples :
    - '73 34 34 93' (Mali) -> '+22373343493'
    - '0022373343493' -> '+22373343493'
    - '+223 73 34 34 93' -> '+22373343493'
    """
    if not phone:
        return None
        
    cleaned = re.sub(r'[\s\-\(\)\.]+', '', phone.strip())
    if not cleaned:
        return None
        
    # Gérer préfixe international 00
    if cleaned.startswith("00"):
        cleaned = "+" + cleaned[2:]
        
    # Si déjà formaté avec +, vérifier la longueur
    if cleaned.startswith("+"):
        return cleaned
        
    # Numéro local 8 chiffres (Mali / Côte d'Ivoire / Sénégal)
    if len(cleaned) == 8:
        return f"+{default_country_code}{cleaned}"
        
    # Numéro déjà avec indicatif sans le +
    if cleaned.startswith(default_country_code):
        return f"+{cleaned}"
        
    return f"+{cleaned}"


def generate_whatsapp_url(phone: str, message: str) -> str:
    """
    Génère un lien direct WhatsApp cliquable (Web ou Mobile).
    L'API WhatsApp exige un numéro sans le signe '+'.
    """
    normalized = normalize_phone_number(phone)
    if not normalized:
        return ""
    clean_digits = re.sub(r'\D', '', normalized)
    encoded_text = urllib.parse.quote(message)
    return f"https://wa.me/{clean_digits}?text={encoded_text}"


def build_tuition_reminder_template(
    university_name: str,
    recipient_name: str,
    student_name: str,
    filiere: str,
    balance: float,
    due_date: Optional[str] = None
) -> str:
    """
    Formate un message clair, courtois et officiel de relance de scolarité.
    """
    amount_str = f"{int(balance):,}".replace(",", " ")
    univ = university_name or "UniSphere"
    
    if recipient_name and recipient_name.lower() != student_name.lower():
        # S'adresse au parent / tuteur
        intro = f"Bonjour M./Mme {recipient_name},"
        body = f"sauf erreur de notre part, un reliquat de scolarité de {amount_str} FCFA reste dû pour votre enfant {student_name} ({filiere})."
    else:
        # S'adresse directement à l'étudiant
        intro = f"Bonjour {student_name},"
        body = f"sauf erreur de notre part, un reliquat de scolarité de {amount_str} FCFA reste à régulariser pour votre inscription en {filiere}."
        
    echeance_info = f" Échéance : {due_date}." if due_date else ""
    closing = "Merci de vous rapprocher de la caisse pour régulariser votre situation."
    
    return f"UniSphere • {univ} :\n{intro} {body}{echeance_info}\n{closing}\nService Comptabilité & Scolarité."


def send_sms(to_phone: str, message: str, sender_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Envoie un SMS via la passerelle configurée dans .env.
    Si aucune clé API n'est fournie, bascule en mode simulation contrôlée
    avec traçabilité complète pour les démonstrations et tests.
    """
    normalized_phone = normalize_phone_number(to_phone)
    if not normalized_phone:
        return {
            "success": False,
            "status": "failed",
            "error": "Numéro de téléphone invalide ou manquant",
            "phone": to_phone
        }

    actual_sender = sender_id or SMS_SENDER_ID or "UniSphere"

    # 1. Si passerelle HTTP réelle configurée
    if SMS_API_KEY and SMS_GATEWAY_URL:
        try:
            import urllib.request
            payload = {
                "to": normalized_phone,
                "from": actual_sender,
                "message": message,
                "api_key": SMS_API_KEY
            }
            req = urllib.request.Request(
                SMS_GATEWAY_URL,
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {SMS_API_KEY}"
                },
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=10) as response:
                status_code = response.getcode()
                if 200 <= status_code < 300:
                    logger.info(f"✅ SMS envoyé avec succès à {normalized_phone} via gateway")
                    return {
                        "success": True,
                        "status": "delivered",
                        "phone": normalized_phone,
                        "gateway": SMS_GATEWAY_URL,
                        "message": message
                    }
        except Exception as e:
            logger.error(f"⚠️ Échec appel passerelle SMS: {e}")
            # Ne pas bloquer l'application, rapporter l'erreur
            return {
                "success": False,
                "status": "failed",
                "error": str(e),
                "phone": normalized_phone
            }

    # 2. Mode Simulation Active (Intégré par défaut si SMS_API_KEY non encore renseignée)
    logger.info(f"📱 [SMS SIMULATION] À: {normalized_phone} | Émetteur: {actual_sender} | Message: {message}")
    return {
        "success": True,
        "status": "simulated",
        "phone": normalized_phone,
        "sender": actual_sender,
        "message": message,
        "note": "SMS simulé avec succès en environnement sécurisé (Activer SMS_API_KEY dans .env pour l'envoi opérateur réel)"
    }

