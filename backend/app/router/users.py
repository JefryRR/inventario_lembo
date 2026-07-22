from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.router.dependencies import get_current_user
from app.crud.permisos import verify_permissions
from app.schemas.users import UserCreate, UserEstado, UserUpdate, UserOut
from app.crud import users as crud_users

router = APIRouter()
modulo = 3

@router.post("/create", status_code=status.HTTP_201_CREATED)
def create_user(user: UserCreate, db: Session = Depends(get_db),
                user_token: UserOut = Depends(get_current_user)
                ):
    try:
        id_rol = user_token.rol_id
        
        if not verify_permissions(db, id_rol, modulo, 'insertar'):
           raise HTTPException(status_code=401, detail= 'Usuario no autorizado')
       
        if user.documento:
            existing_user = crud_users.get_user_by_id(db, user.documento)
            if existing_user:
                raise HTTPException(status_code=400, detail="Ya existe un usuario con ese documento")
            
        if user.correo:
            existing_user = crud_users.get_user_by_email(db, user.correo)
            if existing_user:
                raise HTTPException(status_code=400, detail="Ya existe un usuario con ese correo")
        
        crud_users.create_user(db, user)
        return {"message": "Usuario creado correctamente"}
    
    except Exception as e:
      raise HTTPException(status_code=500, detail=str(e))

@router.get("/all-users-except-admins")
def get_all_users(db: Session = Depends(get_db),
            user_token: UserOut = Depends(get_current_user)
            ):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
             raise HTTPException(status_code=401, detail= 'Usuario no autorizado')
         
        user = crud_users.get_all_user_except_admins(db)
        if not user:
          raise HTTPException(status_code=404, detail="Usuarios no encontrados")
        return user
    except Exception as e:
      raise HTTPException(status_code=500, detail=str(e))
  
@router.get("/by-id/{user_id}")
def get_user_by_id(user_id: int, db: Session = Depends(get_db),
            user_token: UserOut = Depends(get_current_user)
            ):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
             raise HTTPException(status_code=401, detail= 'Usuario no autorizado')
         
        user = crud_users.get_user_by_id(db, user_id)
        if not user:
          raise HTTPException(status_code=404, detail="Usuario no encontrado")
        return user
    except Exception as e:
      raise HTTPException(status_code=500, detail=str(e))
  
@router.get("/by-document/{document}")
def get_user_by_document(document: str, db: Session = Depends(get_db),
            user_token: UserOut = Depends(get_current_user)
            ):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
             raise HTTPException(status_code=401, detail= 'Usuario no autorizado')
         
        user = crud_users.get_user_by_document_number(db, document)
        if not user:
          raise HTTPException(status_code=404, detail="Usuario no encontrado")
        return user
    except Exception as e:
      raise HTTPException(status_code=500, detail=str(e))

@router.get("/by-email")
def get_user(email: str, db: Session = Depends(get_db),
            user_token: UserOut = Depends(get_current_user)
            ):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
             raise HTTPException(status_code=401, detail= 'Usuario no autorizado')
         
        user = crud_users.get_user_by_email(db, email)
        if not user:
          raise HTTPException(status_code=404, detail="Usuario no encontrado")
        return user
    except Exception as e:
      raise HTTPException(status_code=500, detail=str(e))

@router.put("/by-id/{user_id}")
def update_user(user_id: int, user: UserUpdate, db: Session = Depends(get_db),
            user_token: UserOut = Depends(get_current_user)
                ):
  try:
      id_rol = user_token.rol_id
      if not verify_permissions(db, id_rol, modulo, 'actualizar'):
             raise HTTPException(status_code=401, detail= 'Usuario no autorizado')
         
      success = crud_users.update_user_by_id(db, user_id, user)
      if not success:
          raise HTTPException(status_code=400, detail="No se pudo actualizar el usuario")
      return {"message": "Usuario actualizado correctamente"}
  except Exception as e:
      raise HTTPException(status_code=500, detail=str(e))
  
@router.put("/by-id/{user_id}/status")
def change_status_user(user_id: int, estado: UserEstado, db: Session = Depends(get_db),
                      user_token: UserOut = Depends(get_current_user)
                      ):
  try:
      id_rol = user_token.rol_id
      if not verify_permissions(db, id_rol, modulo, 'actualizar'):
             raise HTTPException(status_code=401, detail= 'Usuario no autorizado')

      success = crud_users.change_status_user(db, user_id, estado=estado)
      if not success:
          raise HTTPException(status_code=400, detail="No se pudo cambiar el estado del usuario")
      return {"message": "Estado del usuario actualizado correctamente"}
  except Exception as e:
      raise HTTPException(status_code=500, detail=str(e))

@router.get("/paginated")
def get_all_users_pag(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
): 
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
             raise HTTPException(status_code=401, detail= 'Usuario no autorizado')
         
        skip = (page - 1) * page_size
        data = crud_users.get_all_users_pag(db, skip=skip, limit=page_size)
        total = data["total"]  
        users = data["users"]
        
        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "users": users
        }
    except Exception as e:
      raise HTTPException(status_code=500, detail=str(e))