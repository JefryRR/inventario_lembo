from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.crud.permisos import verify_permissions
from app.router.dependencies import get_current_user
from app.core.database import get_db
from app.schemas.modulos import ModuloCreate, ModuloUpdate, ModuloOut
from app.schemas.users import UserOut
from app.crud import modulos as crud_modulo
from sqlalchemy.exc import SQLAlchemyError

router = APIRouter()
modulito = 4

# Aquí se definen las rutas para el CRUD de módulos del sistema, incluyendo creación, obtención por ID, actualización y obtención paginada. 
# Cada ruta verifica los permisos del usuario antes de realizar la operación correspondiente.

# Endpoint para crear un nuevo módulo
@router.post("/crear", status_code=status.HTTP_201_CREATED)
def create_modulos(
    Modulo: ModuloCreate, 
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        #Verficamos que tenga permisos
        id_rol = user_token.rol_id       
        if not verify_permissions(db, id_rol, modulito, 'insertar'):
            raise HTTPException(status_code=401, detail= 'Usuario no autorizado')
        
        crud_modulo.create_modulo(db, Modulo)
        return {"message": "Módulo registrado correctamente"}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint para obtener un módulo por su ID
@router.get("/by-id",  response_model=ModuloOut)
def get_module_by_id(
              modulo_id: int, 
              db: Session = Depends(get_db),
              user_token: UserOut = Depends(get_current_user)
            ):
    try:
        id_rol=user_token.rol_id
        if not verify_permissions(db, id_rol, modulito, 'seleccionar'):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        # Obtenemos el módulo por su ID usando la función del CRUD
        modulo = crud_modulo.get_modulo_by_id(db, modulo_id)
        if not modulo:
            raise HTTPException(status_code=404, detail="Módulo no encontrado")
        return modulo
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint para obtener todos los módulos
@router.get("/all/modulos", response_model=List[ModuloOut])
def get_all_modules(
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulito, "seleccionar"):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        modulos = crud_modulo.get_all_modules(db)
        return modulos
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint para actualizar un módulo por su ID   
@router.put("/by_id/{id_modulo}")
def update_module_by_id(id_modulo: int, 
                 Modulo: ModuloUpdate, 
                 db: Session = Depends(get_db),
                 user_token: UserOut = Depends(get_current_user)
                 ):
    try:
        id_roles = user_token.rol_id
        if not verify_permissions(db, id_roles, modulito, 'actualizar'):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        success = crud_modulo.update_module_by_id(db, id_modulo, Modulo)
        if not success:
            raise HTTPException(status_code=400, detail="No se pudo actualizar el módulo")
        return {"message": "Módulo actualizado correctamente"}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

#Endpoint para la paginación
@router.get("/all_modules_pag")
def get_all_modules_pag(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
): 
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulito, 'seleccionar'):
             raise HTTPException(status_code=401, detail= 'Usuario no autorizado')
         
        skip = (page - 1) * page_size
        data = crud_modulo.get_all_modules_pag(db, skip=skip, limit=page_size)
        total = data["total"]  
        modulos = data["modulos"]
        
        return {
            "total_modulos": total,
            "page": page,
            "page_size": page_size,
            "modulos": modulos
        }
    except Exception as e:
      raise HTTPException(status_code=500, detail=str(e))
    