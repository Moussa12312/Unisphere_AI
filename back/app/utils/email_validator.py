"""
✅ AJOUTÉ : vérification réelle qu'un email peut exister, avant toute création
de compte (register, étudiant, enseignant, censeur, personnel).

Deux niveaux de vérification, appliqués partout où un email est saisi :
1. Format valide (syntaxe standard d'un email)
2. Le domaine a bien des serveurs mail configurés (enregistrements MX) —
   ça bloque immédiatement les fautes de frappe comme "@gmial.com" ou les
   domaines inventés, sans envoyer de message.

Pour une vérification encore plus forte (confirmer que la BOÎTE existe
vraiment, pas juste le domaine), voir email_service.send_verification_email :
un lien de confirmation est envoyé et le compte reste inactif tant que la
personne n'a pas cliqué dessus. C'est la seule méthode fiable et éthique
pour confirmer qu'une boîte mail précise existe (une vérification SMTP
directe sans envoi est peu fiable et souvent bloquée par les serveurs mail).
"""
import re
import dns.resolver


EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")


def is_valid_email_format(email: str) -> bool:
    return bool(EMAIL_REGEX.match(email or ""))


def domain_has_mail_server(email: str) -> bool:
    """Vérifie que le domaine de l'email a bien des serveurs mail (MX) configurés."""
    try:
        domain = email.split("@")[1]
        answers = dns.resolver.resolve(domain, "MX", lifetime=5)
        return len(answers) > 0
    except Exception:
        # Domaine inexistant, pas de serveur mail configuré, ou timeout réseau
        return False


def validate_email_exists(email: str) -> tuple[bool, str]:
    """
    Retourne (valide, message_erreur). À utiliser dans chaque endpoint de
    création de compte pour bloquer les emails invalides ou inexistants.
    """
    if not is_valid_email_format(email):
        return False, "Format d'email invalide."

    if not domain_has_mail_server(email):
        return False, "Ce domaine email n'existe pas ou ne peut pas recevoir de messages. Vérifiez l'orthographe."

    return True, ""
