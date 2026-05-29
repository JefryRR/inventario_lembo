from typing import Annotated
from fastapi import APIRouter, Depends,HTTPException
from sqlalchemy.orm import Session
from app.crud.users import get_user_by_email_for_login
from app.core.security import verify_password
from app.schemas.auth import ResponseLoggin
from app.core.security import create_access_token
from app.core.database import get_db
from fastapi.security import OAuth2PasswordRequestForm

router = APIRouter()

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
