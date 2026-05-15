from typing import List
from fastapi import APIRouter, Depends, HTTPException, status # type: ignore
from sqlalchemy.orm import Session # type: ignore
from app.crud.permisos import verify_permissions
from app.router.dependencies import get_current_user
from app.core.database import get_db
from app.schemas.inv_perdida import PerdidaCreate, PerdidaUpdate, PerdidaOut, PaginatedPerdidas
from app.schemas.users import UserOut
from app.crud import rols as crud_roles
from sqlalchemy.exc import SQLAlchemyError # type: ignore

router = APIRouter()
modulo = 11

@router.post("/crear", status_code=status.HTTP_201_CREATED)
def create_perdida(
    perdida: PerdidaCreate, 
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id       
        if not verify_permissions(db, id_rol, modulo, 'insertar'):
            raise HTTPException(status_code=401, detail= 'Usuario no autorizado')
        
        crud_roles.create_perdida(db, perdida)
        return {"message": "Pérdida registrada correctamente"}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/by-id",  response_model=PerdidaOut)
def get_perdida_by_id(id: int, 
              db: Session = Depends(get_db),
              user_token: UserOut = Depends(get_current_user)
              ):
    try:
        id_rol=user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        perdida = crud_roles.get_perdida_by_id(db, id)
        if not perdida:
            raise HTTPException(status_code=404, detail="Pérdida no encontrada")
        return perdida
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/all/perdidas", response_model=PaginatedPerdidas)
def get_all_perdidas(
    page: int = 1, 
    page_size: int = 10,
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, "seleccionar"):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        return crud_roles.get_perdidas_paginated(db, page, page_size)
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.put("/update-perdida-by-id", response_model=PerdidaOut)
def update_perdida_by_id(
    id: int,
    perdida_update: PerdidaUpdate,
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, "actualizar"):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        updated_perdida = crud_roles.update_perdida_by_id(db, id, perdida_update)
        if not updated_perdida:
            raise HTTPException(status_code=404, detail="Pérdida no encontrada")
        return updated_perdida
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/all/perdidas-paginated", response_model=PaginatedPerdidas)
def get_perdidas_paginated(
    page: int = 1, 
    page_size: int = 10,
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, "seleccionar"):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        return crud_roles.get_perdidas_paginated(db, page, page_size)
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))