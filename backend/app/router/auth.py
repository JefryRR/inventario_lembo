from typing import Annotated
from fastapi import APIRouter, Depends,HTTPException #type: ignore
from sqlalchemy.orm import Session #type: ignore
from sqlalchemy import text #type: ignore
from app.crud.users import get_user_by_email_for_login
from app.crud.password_reset import create_reset_token, get_valid_token, mark_token_used
from app.services.email import send_reset_email
from app.core.security import verify_password
from app.schemas.auth import ResponseLoggin
from app.schemas.password_reset import ForgotPasswordRequest, ResetPasswordRequest
from app.core.security import create_access_token
from app.core.database import get_db
from passlib.context import CryptContext #type: ignore
from fastapi.security import OAuth2PasswordRequestForm #type: ignore

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

@router.post("/token", response_model=ResponseLoggin)
async def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Session = Depends(get_db)
):
    username = (form_data.username or "").strip()
    password = (form_data.password or "").strip()

    if not username and not password:
        raise HTTPException(status_code=400, detail="Debe ingresar el correo y la contraseña")
    if not username:
        raise HTTPException(status_code=400, detail="Debe ingresar el correo")
    if not password:
        raise HTTPException(status_code=400, detail="Debe ingresar la contraseña")

    # Obtener usuario directamente para poder diferenciar errores
    user = get_user_by_email_for_login(db, username)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Correo o contraseña incorrecta",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if user.correo != username or not user.pass_hash:
        raise HTTPException(
            status_code=401,
            detail="Correo o contraseña incorrecta",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.estado:
        raise HTTPException(
            status_code=403,
            detail="Usuario inactivo",
        )

    if not verify_password(password, user.pass_hash):
        raise HTTPException(
            status_code=401,
            detail="Contraseña incorrecta",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(
        data={"sub": str(user.id_user), "rol": user.rol_id}
    )

    return ResponseLoggin(
        user=user,
        access_token=access_token
    )

@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.execute(
        text("SELECT id_user FROM users WHERE correo = :email"),
        {"email": data.email}
    ).fetchone()

    if user:
        token = create_reset_token(user[0], db)  # pasamos db
        send_reset_email(data.email, token)

    return {"message": "Si el correo existe, recibirás un enlace en breve."}

@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    row = get_valid_token(data.token, db)  # pasamos db
    if not row:
        raise HTTPException(status_code=400, detail="Token inválido o expirado.")

    user_id = row[0]
    hashed = pwd_context.hash(data.new_password)

    db.execute(
        text("UPDATE users SET pass_hash = :password WHERE id_user = :id"),
        {"password": hashed, "id": user_id}
    )
    db.commit()

    mark_token_used(data.token, db)  # pasamos db
    return {"message": "Contraseña actualizada correctamente."}
