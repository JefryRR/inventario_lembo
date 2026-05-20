from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query # type: ignore
from sqlalchemy.orm import Session # type: ignore
from app.crud.permisos import verify_permissions
from app.router.dependencies import get_current_user
from app.core.database import get_db
from app.schemas.devoluciones import DevolucionCreate, DevolucionUpdate, DevolucionOut
from app.schemas.users import UserOut
from app.crud import devoluciones as crud_devolucion
from sqlalchemy.exc import SQLAlchemyError # type: ignore

router = APIRouter()
modulo = 9

@router.post("/crear", status_code=status.HTTP_201_CREATED)
def create_devolucion(
    devolucion: DevolucionCreate, 
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id       
        if not verify_permissions(db, id_rol, modulo, 'insertar'):
            raise HTTPException(status_code=401, detail= 'Usuario no autorizado')
        
        crud_devolucion.create_devolucion(db, devolucion)
        return {"message": "Devolución registrada correctamente"}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/by-id/devolucion",  response_model=DevolucionOut)
def get_devolucion_by_id(
            id: int, 
            db: Session = Depends(get_db),
            user_token: UserOut = Depends(get_current_user)
            ):
    try:
        id_rol=user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        devolucion = crud_devolucion.get_devolucion_by_id(db, id)
        if not devolucion:
            raise HTTPException(status_code=404, detail="Devolución no encontrada")
        return devolucion
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/all/devoluciones", response_model=List[DevolucionOut])
def get_all_devoluciones(
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, "seleccionar"):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        devoluciones = crud_devolucion.get_all_devoluciones(db)
        return devoluciones
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.put("/update/devolucion/{id}")
def update_devolucion_by_id(
    id: int,
    devolucion_update: DevolucionUpdate,
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, "actualizar"):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        result = crud_devolucion.update_devolucion_by_id(db, id, devolucion_update)
        if not result:
            raise HTTPException(status_code=404, detail="Devolución no encontrada")
        return {"message": "Devolución actualizada correctamente"}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/paginated-devoluciones")
def get_devoluciones_paginated(
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
        data = crud_devolucion.get_devoluciones_paginated(db, skip=skip, limit=page_size)
        total = data["total"]  
        devoluciones = data["devoluciones"]
        
        return {
            "total_lotes": total,
            "page": page,
            "page_size": page_size,
            "devoluciones": devoluciones
        }
    except Exception as e:
      raise HTTPException(status_code=500, detail=str(e))