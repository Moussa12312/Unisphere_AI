import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM


def send_scan_session_email(
    recipient_email: str,
    recipient_name: str,
    student_name: str,
    scan_url: str,
    expires_hours: int = 24
) -> bool:
    """
    Envoie l'email avec le lien de scan.
    Retourne True si succès, False sinon.
    """
    try:
        # Si SMTP non configuré, afficher le lien dans la console (mode dev)
        if not SMTP_HOST:
            print("=" * 60)
            print("📧 EMAIL DE SCAN (MODE DEV)")
            print(f"À : {recipient_email}")
            print(f"Lien : {scan_url}")
            print("=" * 60)
            return True
        
        # Créer le message
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"📄 UniSphere AI - Session de scan pour {student_name}"
        msg["From"] = SMTP_FROM
        msg["To"] = recipient_email
        
        # Version texte
        text_content = f"""
Bonjour {recipient_name},

Une session de scan de documents a été initiée pour :
👤 {student_name}

Pour scanner les documents, ouvrez ce lien depuis votre téléphone :
{scan_url}

⏰ Ce lien expire dans {expires_hours} heures.

— UniSphere AI
"""
        
        # Version HTML
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #FF6B00 0%, #f59e0b 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 24px;">📄 Session de Scan</h1>
        <p style="margin: 10px 0 0; opacity: 0.9;">UniSphere AI</p>
    </div>
    
    <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 12px 12px;">
        <p>Bonjour <strong>{recipient_name}</strong>,</p>
        
        <p>Une session de scan de documents a été initiée pour :</p>
        
        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-size: 18px;"><strong>👤 {student_name}</strong></p>
        </div>
        
        <p>📱 Pour scanner les documents, cliquez sur le bouton ci-dessous <strong>depuis votre téléphone</strong> :</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{scan_url}" style="background: linear-gradient(135deg, #FF6B00, #f59e0b); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
                📸 OUVRIR LE SCANNER
            </a>
        </div>
        
        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #92400e;">
                <strong>⏰ Ce lien expire dans {expires_hours} heures.</strong><br>
                <small>Lien sécurisé à usage unique.</small>
            </p>
        </div>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        
        <p style="color: #6b7280; font-size: 12px;">
            Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.<br>
            — UniSphere AI
        </p>
    </div>
</body>
</html>
"""
        
        msg.attach(MIMEText(text_content, "plain"))
        msg.attach(MIMEText(html_content, "html"))
        
        # Envoyer l'email
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            if SMTP_USER and SMTP_PASSWORD:
                server.starttls()
                server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)
        
        print(f"✅ Email envoyé à {recipient_email}")
        return True
        
    except Exception as e:
        print(f"❌ Erreur envoi email : {e}")
        return False