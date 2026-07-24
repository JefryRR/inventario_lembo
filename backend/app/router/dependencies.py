from fastapi import Depends, HTTPException, Response
from sqlalchemy.orm import Session
from app.crud.users import get_user_by_email_for_login, get_user_by_id
from app.core.security import create_access_token, verify_password, verify_token
from app.core.database import get_db
from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/access/token")

# Obtenemos el usuario actual a partir del token de acceso proporcionado en la solicitud.
def get_current_user(
        response: Response,
        token: str = Depends(oauth2_scheme),
        db: Session = Depends(get_db)
):
    user = verify_token(token)
    if user is None:
        raise HTTPException(status_code=401, detail="Token Invalido")
    user_db = get_user_by_id(db, user)
    if user_db is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if not user_db.estado:
        raise HTTPException(status_code=403, detail="Usuario inactivo. No autorizado")
    
    nuevo_token = create_access_token(data={"sub": str(user_db.id_user), "rol": user_db.rol_id})
    response.headers["X-New-Token"] = nuevo_token

    return user_db

# Función para autenticar al usuario verificando su nombre de usuario y contraseña.
def authenticate_user(username: str, password: str, db: Session):
    user = get_user_by_email_for_login(db, username)
    if not user:
        return False
    if not verify_password(password, user.pass_hash):
        return False
    return user