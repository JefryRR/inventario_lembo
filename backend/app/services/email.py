import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

def send_reset_email(to_email: str, token: str):
    reset_link = f"{settings.FRONTEND_URL}/resetPassword?token={token}"

    html = f"""
        <h2>Recuperar contraseña</h2>
        <p>Haz clic en el siguiente enlace para restablecer tu contraseña.
        El enlace expira en 1 hora.</p>
        <a href="{reset_link}">Restablecer contraseña</a>
        <p>Si no solicitaste esto, ignora este correo.</p>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Recuperar contraseña"
    msg["From"] = settings.GMAIL_USER
    msg["To"] = to_email
    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(settings.GMAIL_USER, settings.GMAIL_APP_PASSWORD)
        server.sendmail(settings.GMAIL_USER, to_email, msg.as_string())