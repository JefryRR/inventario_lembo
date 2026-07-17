import smtplib
from datetime import date
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

def send_email(to_email: str, subject: str, html: str):
    """Función genérica de envío. Todo lo demás se apoya en esta."""
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.GMAIL_USER
    msg["To"] = to_email
    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(settings.GMAIL_USER, settings.GMAIL_APP_PASSWORD)
        server.sendmail(settings.GMAIL_USER, to_email, msg.as_string())


def send_reset_email(to_email: str, token: str):
    reset_link = f"{settings.FRONTEND_URL}/resetPassword?token={token}"
    html = f"""
        <h2>Recuperar contraseña</h2>
        <p>Haz clic en el siguiente enlace para restablecer tu contraseña.
        El enlace expira en 1 hora.</p>
        <a href="{reset_link}">Restablecer contraseña</a>
        <p>Si no solicitaste esto, ignora este correo.</p>
    """
    send_email(to_email, "Recuperar contraseña", html)


def send_solicitud_creada_email(to_email: str, solicitante: str, insumo: str, cantidad: float, solicitud_id: int):
    html = f"""
        <h2>Nueva solicitud de insumo</h2>
        <p><strong>{solicitante}</strong> ha creado una nueva solicitud (#{solicitud_id}).</p>
        <ul>
            <li><strong>Insumo:</strong> {insumo}</li>
            <li><strong>Cantidad:</strong> {cantidad}</li>
        </ul>
        <p>Ingresa al sistema para revisarla y autorizarla.</p>
    """
    send_email(to_email, f"Nueva solicitud #{solicitud_id}", html)


MENSAJES_ESTADO_SOLICITUD = {
    "autorizado": {
        "asunto": "Solicitud #{id} autorizada",
        "titulo": "Solicitud autorizada",
        "cuerpo": "Tu solicitud ha sido autorizada.",
    },
    "cancelado": {
        "asunto": "Solicitud #{id} cancelada",
        "titulo": "Solicitud cancelada",
        "cuerpo": "Tu solicitud ha sido cancelada.",
    },
    "entregado": {
        "asunto": "Solicitud #{id} entregada",
        "titulo": "Solicitud entregada",
        "cuerpo": "Tu solicitud fue entregada el {fecha}.",
    },
    "devuelto": {
        "asunto": "Solicitud #{id} devuelta",
        "titulo": "Devolución registrada",
        "cuerpo": "Se registró la devolución de tu solicitud el {fecha}.",
    },
}

def send_solicitud_estado_email(
    to_email: str,
    estado: str,
    insumo: str,
    cantidad: float,
    solicitud_id: int,
    fecha: date | None = None,
):
    info = MENSAJES_ESTADO_SOLICITUD.get(estado)
    if not info:
        return

    fecha_str = fecha.strftime("%d/%m/%Y") if fecha else ""
    cuerpo = info["cuerpo"].format(fecha=fecha_str)

    html = f"""
        <h2>{info['titulo']}</h2>
        <p>{cuerpo}</p>
        <ul>
            <li><strong>Solicitud:</strong> #{solicitud_id}</li>
            <li><strong>Insumo:</strong> {insumo}</li>
            <li><strong>Cantidad solicitada:</strong> {cantidad}</li>
        </ul>
    """
    send_email(to_email, info["asunto"].format(id=solicitud_id), html)