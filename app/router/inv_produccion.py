from typing import List
from fastapi import APIRouter, Depends, HTTPException, status # type: ignore
from sqlalchemy.orm import Session # type: ignore
from app.crud.permisos import verify_permissions
from app.router.dependencies import get_current_user
from app.core.database import get_db
from app.schemas.inv_produccion import ProduccionCreate, ProduccionUpdate, ProduccionOut, PaginatedProducciones
from sqlalchemy.exc import SQLAlchemyError # type: ignore

router = APIRouter()
modulo = 17

@router.post("/crear", status_code=status.HTTP_201_CREATED)
def create_produccion(
    produccion: ProduccionCreate, 
    db: Session = Depends(get_db),
    user_token = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'insertar'):
            raise HTTPException(status_code=401, detail= 'Usuario no autorizado')
        
        from app.crud import inv_produccion as crud_produccion
        crud_produccion.create_produccion(db, produccion)
        return {"message": "Producción registrada correctamente"}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/by-id", response_model=ProduccionOut)
def get_produccion_by_id(id: int, 
              db: Session = Depends(get_db),
              user_token = Depends(get_current_user)
              ):
    try:
        id_rol=user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        from app.crud import inv_produccion as crud_produccion
        produccion = crud_produccion.get_produccion_by_id(db, id)
        if not produccion:
            raise HTTPException(status_code=404, detail="Producción no encontrada")
        return produccion
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/all/producciones", response_model=List[ProduccionOut])
def get_all_producciones(
    db: Session = Depends(get_db),
    user_token = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, "seleccionar"):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        from app.crud import inv_produccion as crud_produccion
        producciones = crud_produccion.all_produccion(db)
        return producciones
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.put("/update/production/{id}")
def update_produccion(
    id: int,
    produccion: ProduccionUpdate,
    db: Session = Depends(get_db),
    user_token = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'actualizar'):
            raise HTTPException(status_code=401, detail='Usuario no autorizado')
        
        from app.crud import inv_produccion as crud_produccion
        crud_produccion.update_produccion(db, id, produccion)
        return {"message": "Producción actualizada correctamente"}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/producciones/paginated", response_model=PaginatedProducciones)
def get_paginated_producciones(
    page: int = 1,
    page_size: int = 10,
    db: Session = Depends(get_db),
    user_token = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, "seleccionar"):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        from app.crud import inv_produccion as crud_produccion
        paginated_data = crud_produccion.get_paginated_producciones(db, page, page_size)
        return paginated_data
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))