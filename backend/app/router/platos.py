from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.crud.permisos import verify_permissions
from app.router.dependencies import get_current_user
from app.core.database import get_db
from app.schemas.platos import PlatoCreate, PlatoUpdate, PlatoOut, PlatosPaginated
from app.schemas.users import UserOut
from app.crud import platos as crud_platos
from sqlalchemy.exc import SQLAlchemyError

router = APIRouter()
modulo = 20

# Aquí se definen las rutas para el CRUD de platos, incluyendo creación, obtención por ID, actualización y obtención paginada. 
# Cada ruta verifica los permisos del usuario antes de realizar la operación correspondiente.

@router.post("/crear", status_code=status.HTTP_201_CREATED)
def create_plato(
    plato: PlatoCreate, 
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        #Verficamos que tenga permisos
        id_rol = user_token.rol_id       
        if not verify_permissions(db, id_rol, modulo, 'insertar'):
            raise HTTPException(status_code=401, detail= 'Usuario no autorizado')
        
        crud_platos.create_platos(db, plato)
        return {"message": "Plato registrado correctamente"}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/by-id",  response_model=PlatoOut)
def get_plato_by_id(id: int, db: Session = Depends(get_db),
              user_token: UserOut = Depends(get_current_user)
              ):
    try:
        id_rol=user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        plato = crud_platos.get_plato_by_id(db, id)
        if not plato:
            raise HTTPException(status_code=404, detail="Plato no encontrado")
        return plato
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/all-platos", response_model=List[PlatoOut])
def get_all_platos(
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, "seleccionar"):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        plato = crud_platos.all_platos(db)
        
        if not plato:
            raise HTTPException(status_code=404, detail="No hay platos registradas o no se pudieron obtener")
        return plato

        
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/by_id/{id_plato}")
def update_plato_by_id(id_plato: int, plato: PlatoUpdate, db: Session = Depends(get_db),
                user_token: UserOut = Depends(get_current_user)
                ):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'actualizar'):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        success = crud_platos.update_plato_by_id(db, id_plato, plato)
        if not success:
            raise HTTPException(status_code=400, detail="No se pudo actualizar el plato")
        return {"message": "Plato actualizado correctamente"}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.put("/cambiar-estado/{id_plato}", status_code=status.HTTP_200_OK)
def change_plato_estado(
    id_plato: int,
    nuevo_estado: bool,
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.id_rol
        if not verify_permissions(db, id_rol, modulo, 'actualizar'):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")

        success = crud_platos.change_plato_estado(db, id_plato, nuevo_estado)
        if not success:
            raise HTTPException(status_code=404, detail="Plato no encontrado")

        return {"message": f"Estado del plato actualizado a {nuevo_estado}"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500,detail=str(e))
    
@router.get("/platos_paginated", response_model=PlatosPaginated)
def get_paginated_platos(
    page: int = 1,
    page_size: int = 10,
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, "seleccionar"):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        skip = (page - 1) * page_size
        data = crud_platos.get_platos_paginated(db, skip=skip, limit=page_size)

        total = data["total"]
        platos = data["platos"]
        
        return PlatosPaginated(
            page= page,
            page_size= page_size,
            total_platos= total,
            total_pages= (total + page_size - 1) // page_size,
            platos= platos
        )
        
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))
  
