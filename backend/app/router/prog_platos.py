from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.crud.permisos import verify_permissions
from app.router.dependencies import get_current_user
from app.core.database import get_db
from app.schemas.prog_platos import ProgramacionCreate, ProgramacionUpdate, ProgramacionOut, ProgramacionPaginated
from app.schemas.users import UserOut
from app.crud import prog_platos as crud_prog_platos
from sqlalchemy.exc import SQLAlchemyError

router = APIRouter()
modulo = 20

# Endpoint para crear un nuevo rol
@router.post("/crear", status_code=status.HTTP_201_CREATED)
def create_progPlato(
    plato: ProgramacionCreate, 
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        #Verficamos que tenga permisos
        id_rol = user_token.rol_id       
        if not verify_permissions(db, id_rol, modulo, 'insertar'):
            raise HTTPException(status_code=401, detail= 'Usuario no autorizado')
        
        crud_prog_platos.create_progPlato(db, plato)
        return {"message": "Programación registrada correctamente"}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint para obtener un rol por su ID  
@router.get("/by-id", response_model=ProgramacionOut)
def get_progPlato_by_id(id: int, db: Session = Depends(get_db),
              user_token: UserOut = Depends(get_current_user)
              ):
    try:
        id_rol=user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        plato = crud_prog_platos.get_progPlato_by_id(db, id)
        if not plato:
            raise HTTPException(status_code=404, detail="Programación no encontrada")
        return plato
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint para obtener todos los prog_platos
@router.get("/all-prog_platos", response_model=List[ProgramacionOut])
def get_all_prog_platos(
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, "seleccionar"):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        plato = crud_prog_platos.all_progPlatos(db)
        
        if not plato:
            raise HTTPException(status_code=404, detail="No hay programación registradas o no se pudieron obtener")
        return plato

        
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint para actualizar un rol por su ID   
@router.put("/by_id/{id_programacion}", status_code=status.HTTP_200_OK)
def update_progPlato_by_id(id_programacion: int, programacion: ProgramacionUpdate, db: Session = Depends(get_db),
                user_token: UserOut = Depends(get_current_user)
                ):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'actualizar'):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        success = crud_prog_platos.update_progPlato_by_id(db, id_programacion, programacion)
        if not success:
            raise HTTPException(status_code=400, detail="No se pudo actualizar la programación")
        return {"message": "Plato actualizado correctamente"}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/prog_platos_paginated", response_model=ProgramacionPaginated)
def get_paginated_prog_platos(
     page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, "seleccionar"):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        skip = (page - 1) * page_size
        data = crud_prog_platos.get_progPlatos_paginated(db, skip=skip, limit=page_size)

        total = data["total"]
        programaciones = data["programaciones"]
        
        return ProgramacionPaginated(
            page=page,
            page_size=page_size,
            total_programaciones=total,
            total_pages=(total + page_size - 1) // page_size,
            programaciones=programaciones
        )
        
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))
  
