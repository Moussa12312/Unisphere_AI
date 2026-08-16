"""
Service d'envoi d'email pour UniSphere AI.
Transmet les identifiants, liens de réinitialisation et invitations.
Optimisé pour la délivrabilité (évite le dossier Spam).
"""
import smtplib
import os
import re
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formatdate, make_msgid

SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_FROM = os.getenv("SMTP_FROM", "noreply@unisphere.ai")

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000").split(",")[0].strip()


def is_email_configured() -> bool:
    """Vérifie si les identifiants SMTP sont bien renseignés dans .env."""
    return bool(SMTP_HOST and SMTP_USER and SMTP_PASSWORD)


def send_email(to_email: str, subject: str, html_body: str) -> bool:
    """
    Envoie un email HTML + Plaintext optimisé pour la délivrabilité (évite le dossier Spam).
    """
    if not is_email_configured():
        print(f"⚠️ SMTP non configuré (.env) — email à {to_email} non envoyé.")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        
        # ✅ Forcer l'en-tête From avec le vrai compte SMTP authentifié pour éviter le flag Phishing/Spoofing
        from_display_name = "UniSphere AI"
        sender_email = SMTP_USER if SMTP_USER and "@" in SMTP_USER else SMTP_FROM
        msg["From"] = f"{from_display_name} <{sender_email}>"
        msg["Reply-To"] = SMTP_FROM if SMTP_FROM else sender_email
        msg["To"] = to_email
        msg["Date"] = formatdate(localtime=True)
        domain = sender_email.split('@')[-1] if '@' in sender_email else 'unisphere.ai'
        msg["Message-ID"] = make_msgid(domain=domain)
        msg["X-Mailer"] = "UniSphere AI Mailer v2.0"
        msg["Auto-Submitted"] = "auto-generated"

        # ✅ Alternative Texte brut pour passer les filtres anti-spam (SpamAssassin / Gmail AI)
        clean_text = re.sub('<[^<]+?>', '', html_body)
        clean_text = re.sub(r'\s+', ' ', clean_text).strip()
        
        text_part = MIMEText(clean_text, "plain", "utf-8")
        html_part = MIMEText(html_body, "html", "utf-8")

        msg.attach(text_part)
        msg.attach(html_part)

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(sender_email, to_email, msg.as_string())

        print(f"✅ Email délivré avec succès à {to_email}")
        return True
    except Exception as e:
        print(f"❌ Échec de l'envoi d'email à {to_email}: {str(e)}")
        return False


ROLE_LABELS = {
    "student": "étudiant(e)",
    "teacher": "enseignant(e)",
    "censeur": "censeur/censeure",
    "admin": "administrateur/administratrice",
    "secretary": "secrétaire",
    "accountant": "comptable",
    "guard": "gardien(ne)",
}


def send_credentials_email(to_email: str, full_name: str, password: str, role: str, university_name: str = "") -> bool:
    """Envoie les identifiants de connexion (email + mot de passe) à un nouveau compte créé."""
    role_label = ROLE_LABELS.get(role, role)
    subject = f"Bienvenue sur UniSphere AI{' — ' + university_name if university_name else ''}"

    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b;">
      <div style="background: #0a1628; padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="color: #FF6B00; margin: 0; font-size: 20px;">UniSphere AI</h1>
      </div>
      <div style="border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px; padding: 24px;">
        <p>Bonjour {full_name},</p>
        <p>Votre compte <strong>{role_label}</strong>{' à ' + university_name if university_name else ''} a été créé. Voici vos identifiants de connexion :</p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>Email :</strong> {to_email}</p>
          <p style="margin: 4px 0;"><strong>Mot de passe temporaire :</strong> <code style="background: #fff; padding: 2px 6px; border-radius: 4px; border: 1px solid #e2e8f0;">{password}</code></p>
        </div>
        <p style="font-size: 13px; color: #64748b;">⚠️ Pour votre sécurité, changez ce mot de passe dès votre première connexion, depuis votre page de profil.</p>
        <a href="{FRONTEND_URL}/login" style="display: inline-block; margin-top: 12px; background: #FF6B00; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: 600;">Se connecter</a>
      </div>
    </div>
    """
    return send_email(to_email, subject, html_body)


def send_password_reset_email(to_email: str, full_name: str, new_password: str) -> bool:
    """Envoie le nouveau mot de passe après une réinitialisation par l'admin."""
    subject = "UniSphere AI — Votre mot de passe a été réinitialisé"
    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b;">
      <div style="background: #0a1628; padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="color: #FF6B00; margin: 0; font-size: 20px;">UniSphere AI</h1>
      </div>
      <div style="border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px; padding: 24px;">
        <p>Bonjour {full_name},</p>
        <p>Votre mot de passe a été réinitialisé. Voici votre nouveau mot de passe temporaire :</p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>Mot de passe temporaire :</strong> <code style="background: #fff; padding: 2px 6px; border-radius: 4px; border: 1px solid #e2e8f0;">{new_password}</code></p>
        </div>
        <p style="font-size: 13px; color: #64748b;">⚠️ Si vous n'êtes pas à l'origine de cette demande, contactez immédiatement votre administrateur.</p>
        <a href="{FRONTEND_URL}/login" style="display: inline-block; margin-top: 12px; background: #FF6B00; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: 600;">Se connecter</a>
      </div>
    </div>
    """
    return send_email(to_email, subject, html_body)


def send_verification_email(to_email: str, full_name: str, token: str) -> bool:
    """Envoie un lien de confirmation d'email."""
    subject = "UniSphere AI — Confirmez votre adresse email"
    verify_url = f"{FRONTEND_URL}/verify-email?token={token}"

    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b;">
      <div style="background: #0a1628; padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="color: #FF6B00; margin: 0; font-size: 20px;">UniSphere AI</h1>
      </div>
      <div style="border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px; padding: 24px;">
        <p>Bonjour {full_name},</p>
        <p>Merci de créer votre espace sur UniSphere AI. Pour activer votre compte, confirmez que cette adresse email vous appartient bien :</p>
        <a href="{verify_url}" style="display: inline-block; margin-top: 12px; background: #FF6B00; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: 600;">Confirmer mon email</a>
        <p style="font-size: 13px; color: #64748b; margin-top: 20px;">
          Tant que vous n'avez pas cliqué sur ce lien, la connexion à votre compte reste bloquée.
        </p>
        <p style="color: #94a3b8; font-size: 11px; margin-top: 20px;">
          Si le bouton ne fonctionne pas, copiez ce lien : <br>
          <code style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px; word-break: break-all; font-size: 11px;">{verify_url}</code>
        </p>
      </div>
    </div>
    """
    return send_email(to_email, subject, html_body)


def send_alumni_invitation_email(
    to_email: str,
    recipient_name: str,
    university_name: str,
    invitation_url: str,
    expires_hours: int = 720,
    session_type: str = "invitation"
) -> bool:
    """Envoie un email d'invitation à la communauté Alumni."""
    subject = f"Invitation à rejoindre la communauté Alumni — {university_name}"
    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b;">
      <div style="background: #0a1628; padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="color: #FF6B00; margin: 0; font-size: 20px;">UniSphere AI</h1>
      </div>
      <div style="border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px; padding: 24px;">
        <p>Bonjour {recipient_name},</p>
        <p>Vous êtes invité(e) à rejoindre la plateforme de la communauté Alumni de <strong>{university_name}</strong>.</p>
        <p>Ce lien vous permet de créer votre compte et de compléter votre profil alumni :</p>
        <a href="{invitation_url}" style="display: inline-block; margin-top: 12px; background: #FF6B00; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: 600;">Rejoindre la communauté Alumni</a>
        <p style="font-size: 13px; color: #64748b; margin-top: 20px;">
          ⚠️ Ce lien d'invitation restera valide pendant {expires_hours} heures.
        </p>
      </div>
    </div>
    """
    return send_email(to_email, subject, html_body)

