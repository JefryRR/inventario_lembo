from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.crud.permisos import verify_permissions
from app.router.dependencies import get_current_user
from app.core.database import get_db
from app.schemas.rols import RolCreate, RolUpdate, RolOut
from app.schemas.users import UserOut
from app.crud import rols as crud_roles
from sqlalchemy.exc import SQLAlchemyError

router = APIRouter()
modulo = 2

# Aquí se definen las rutas para el CRUD de roles, incluyendo creación, obtención por ID, actualización y obtención paginada. 
# Cada ruta verifica los permisos del usuario antes de realizar la operación correspondiente.

# Endpoint para crear un nuevo rol
@router.post("/crear", status_code=status.HTTP_201_CREATED)
def create_roles(
    Rol: RolCreate, 
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        #Verficamos que tenga permisos
        id_rol = user_token.rol_id       
        if not verify_permissions(db, id_rol, modulo, 'insertar'):
            raise HTTPException(status_code=401, detail= 'Usuario no autorizado')
        
        crud_roles.create_roles(db, Rol)
        return {"message": "Rol registrado correctamente"}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint para obtener un rol por su ID  
@router.get("/by-id",  response_model=RolOut)
def get_rol_by_id(id: int, db: Session = Depends(get_db),
              user_token: UserOut = Depends(get_current_user)
              ):
    try:
        id_rol=user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        rol = crud_roles.get_rol_by_id(db, id)
        if not rol:
            raise HTTPException(status_code=404, detail="Rol no encontrado")
        return rol
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint para obtener todos los roles
@router.get("/all/roles", response_model=List[RolOut])
def get_all_roles(
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, "seleccionar"):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        roles = crud_roles.get_all_rol(db)
        return roles
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint para actualizar un rol por su ID   
@router.put("/by_id/{id_rol}")
def update_rol_by_id(id_rol: int, rol: RolUpdate, db: Session = Depends(get_db),
                user_token: UserOut = Depends(get_current_user)
                ):
    try:
        id_roles = user_token.rol_id
        if not verify_permissions(db, id_roles, modulo, 'actualizar'):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        success = crud_roles.update_rol_by_id(db, id_rol, rol)
        if not success:
            raise HTTPException(status_code=400, detail="No se pudo actualizar el rol")
        return {"message": "Rol actualizado correctamente"}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint para cambiar el estado de un rol por su ID  
@router.put("/estado/{id_rol}", status_code=status.HTTP_200_OK)
def estado_rol(
    id_rol: int,
    estado_rol: bool,
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rols = user_token.rol_id
        if not verify_permissions(db, id_rols, modulo, 'actualizar'):
             raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        success = crud_roles.change_rol_status(db, id_rol, estado_rol)
        if not success:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        return {"message": f"Estado del rol actualizado a {estado_rol}"}
    except SQLAlchemyError as e:
            raise HTTPException(status_code=500, detail=str(e))
