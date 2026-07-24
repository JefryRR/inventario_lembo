from sqlalchemy.orm import Session 
from sqlalchemy import text 
import secrets
from datetime import datetime, timedelta, timezone

# Función para crear un token de restablecimiento de contraseña
def create_reset_token(user_id: int, db: Session) -> str:
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)

    # Marcar cualquier token anterior como usado y crear un nuevo token
    db.execute(
        text("UPDATE password_reset_tokens SET used = TRUE WHERE user_id = :uid AND used = FALSE"),
        {"uid": user_id}
    )

    # Insertar el nuevo token en la base de datos
    db.execute(
        text("""INSERT INTO password_reset_tokens (user_id, token, expires_at)
                VALUES (:user_id, :token, :expires_at)"""),
        {"user_id": user_id, "token": token, "expires_at": expires_at}
    )
    db.commit()
    return token

# Función para validar un token de restablecimiento de contraseña
def get_valid_token(token: str, db: Session):
    return db.execute(
        text("""SELECT user_id FROM password_reset_tokens
                WHERE token = :token AND used = FALSE AND expires_at > NOW()"""),
        {"token": token}
    ).fetchone()

# Función para marcar un token como usado
def mark_token_used(token: str, db: Session):
    db.execute(
        text("UPDATE password_reset_tokens SET used = TRUE WHERE token = :token"),
        {"token": token}
    )
    db.commit()