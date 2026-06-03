from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query # type: ignore
from sqlalchemy.orm import Session # type: ignore
from app.crud.permisos import verify_permissions
from app.router.dependencies import get_current_user
from app.core.database import get_db
from app.schemas.ventas import VentasCreate, VentasUpdate, VentasOut, PaginatedVentas
from app.crud import ventas as crud_ventas
from app.schemas.users import UserOut
from sqlalchemy.exc import SQLAlchemyError # type: ignore

router = APIRouter()
modulo = 13

@router.post("/crear", status_code=status.HTTP_201_CREATED)
def create_venta(
    venta: VentasCreate, 
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'insertar'):
            raise HTTPException(status_code=401, detail= 'Usuario no autorizado')
        
        venta_id = crud_ventas.create_venta(db, venta)
        return {"message": "Venta registrada correctamente", "id_venta": venta_id}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/by-id", response_model=VentasOut)
def get_venta_by_id(id: int, 
              db: Session = Depends(get_db),
              user_token: UserOut = Depends(get_current_user)
              ):
    try:
        id_rol=user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        venta = crud_ventas.get_venta_by_id(db, id)
        if not venta:
            raise HTTPException(status_code=404, detail="Venta no encontrada")
        return venta
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/all/ventas", response_model=List[VentasOut])
def get_all_ventas(
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, "seleccionar"):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        ventas = crud_ventas.all_ventas(db)
        return ventas
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.put("/update/venta/{id}")
def update_venta(
    id: int,
    venta: VentasUpdate,
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'actualizar'):
            raise HTTPException(status_code=401, detail='Usuario no autorizado')
        
        ventas = crud_ventas.update_venta(db, id, venta)
        if not ventas:
            raise HTTPException(status_code=400, detail="No se pudo actualizar la venta")
        return {"message": "Venta actualizada correctamente"}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/ventas/by/user", response_model=List[VentasOut])
def get_ventas_by_user(
    user_id: int,
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, "seleccionar"):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        ventas = crud_ventas.ventas_by_user(db, user_id)
        return ventas
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/paginated-ventas")
def ventas_paginated(
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
        data = crud_ventas.ventas_paginated(db, skip=skip, limit=page_size)
        total = data["total"]  
        ventas = data["ventas"]
        
        return {
            "total_ventas": total,
            "page": page,
            "page_size": page_size,
            "ventas": ventas
        }
    except Exception as e:
      raise HTTPException(status_code=500, detail=str(e))