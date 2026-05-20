from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.crud.permisos import verify_permissions
from app.router.dependencies import get_current_user
from app.core.database import get_db
from app.schemas.inv_insumos import InsumoCreate, InsumoUpdate, InsumoOut, Paginatedinsumos
from app.crud import inv_insumos as crud_insumos
from sqlalchemy.exc import SQLAlchemyError

router = APIRouter()
modulo = 17

@router.post("/crear", status_code=status.HTTP_201_CREATED)
def create_insumo(
    insumo: InsumoCreate, 
    db: Session = Depends(get_db),
    user_token = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'insertar'):
            raise HTTPException(status_code=401, detail= 'Usuario no autorizado')
        
        if insumo.fecha_vencimiento <= insumo.fecha_ingreso:
            raise HTTPException(status_code=400, detail="La fecha de vencimiento debe ser posterior a la fecha de ingreso")
        
        if insumo.cantidad <= 0:
            raise HTTPException(status_code=400, detail="La cantidad debe ser un número positivo")

        crud_insumos.create_insumo(db, insumo)
        return {"message": "Insumo registrado correctamente"}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/by-id/", response_model=InsumoOut)
def get_insumo_by_id(id_insumo: int, 
              db: Session = Depends(get_db),
              user_token = Depends(get_current_user)
              ):
    try:
        id_rol=user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        insumo = crud_insumos.get_insumo_by_id(db, id_insumo)
        if not insumo:
            raise HTTPException(status_code=404, detail="Insumo no encontrado")
        return insumo
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/all_insumos", response_model=List[InsumoOut])
def get_all_insumos(
    db: Session = Depends(get_db),
    user_token = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, "seleccionar"):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")

        insumos = crud_insumos.get_all_insumos(db)
        return insumos
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.put("/update_by_id/{id_insumo}")
def update_insumo(
    id_insumo: int,
    insumo: InsumoUpdate,
    db: Session = Depends(get_db),
    user_token = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'actualizar'):
            raise HTTPException(status_code=401, detail='Usuario no autorizado')
        
        crud_insumos.update_insumo_by_id(db, id_insumo, insumo)
        return {"message": "Insumo actualizado correctamente"}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/insumos_paginated", response_model=Paginatedinsumos)
def get_paginated_insumos(
    page: int = 1,
    page_size: int = 10,
    db: Session = Depends(get_db),
    user_token = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, "seleccionar"):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        skip = (page - 1) * page_size
        data = crud_insumos.get_insumos_paginated(db, skip=skip, limit=page_size)

        total = data["total"]
        insumos = data["insumos"]
        
        return Paginatedinsumos(
            page= page,
            page_size= page_size,
            total_insumos= total,
            total_pages= (total + page_size - 1) // page_size,
            insumos= insumos
        )
        
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))