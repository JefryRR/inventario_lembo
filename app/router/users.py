from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.router.dependencies import get_current_user
from app.crud.permisos import verify_permissions
from app.schemas.users import UserCreate, UserUpdate, UserOut
from app.crud import users as crud_users

router = APIRouter()
modulo = 3 # ID del módulo de usuarios para verificar permisos

@router.post("/create", status_code=status.HTTP_201_CREATED)
def create_user(user: UserCreate, db: Session = Depends(get_db),
                user_token: UserOut = Depends(get_current_user)
                ):
    try:
        id_rol = user_token.rol_id
        print(f"ID del rol del usuario autenticado: {id_rol}")
        if not verify_permissions(db, id_rol, modulo, 'insertar'):
           raise HTTPException(status_code=401, detail= 'Usuario no autorizado')
        crud_users.create_user(db, user)
        return {"message": "Usuario creado correctamente"}
    
    except Exception as e:
      raise HTTPException(status_code=500, detail=str(e))
  
@router.get("/by-email")
def get_user(email: str, db: Session = Depends(get_db)):
  try:
      user = crud_users.get_user_by_email(db, email)
      if not user:
          raise HTTPException(status_code=404, detail="Usuario no encontrado")
      return user
  except Exception as e:
      raise HTTPException(status_code=500, detail=str(e))

@router.put("/by-id/{user_id}")
def update_user(user_id: int, user: UserUpdate, db: Session = Depends(get_db)):
  try:
      success = crud_users.update_user(db, user_id, user)
      if not success:
          raise HTTPException(status_code=400, detail="No se pudo actualizar el usuario")
      return {"message": "Usuario actualizado correctamente"}
  except Exception as e:
      raise HTTPException(status_code=500, detail=str(e))
  
@router.put("/by-id/{user_id}/status")
def change_status_user(user_id: int, estado: bool, db: Session = Depends(get_db)):
  try:
      success = crud_users.change_status_user(db, user_id, estado)
      if not success:
          raise HTTPException(status_code=400, detail="No se pudo cambiar el estado del usuario")
      return {"message": "Estado del usuario actualizado correctamente"}
  except Exception as e:
      raise HTTPException(status_code=500, detail=str(e))
