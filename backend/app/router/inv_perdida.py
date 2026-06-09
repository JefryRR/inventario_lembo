from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query # type: ignore
from sqlalchemy.orm import Session # type: ignore
from app.crud.permisos import verify_permissions
from app.router.dependencies import get_current_user
from app.core.database import get_db
from app.schemas.inv_perdida import PerdidaCreate, PerdidaUpdate, PerdidaOut, PaginatedPerdidas
from app.schemas.users import UserOut
from app.crud import inv_perdida as inv_perdida_crud
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
        
        inv_perdida_crud.create_perdida(db, perdida, user_token.id_user)
        return {"message": "Pérdida registrada correctamente"}
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except Exception as e:                                        # ← agrega este
        raise HTTPException(status_code=400, detail=str(e))
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
        
        perdida = inv_perdida_crud.get_perdida_by_id(db, id)
        if not perdida:
            raise HTTPException(status_code=404, detail="Pérdida no encontrada")
        return perdida
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/all/perdidas", response_model=List[PerdidaOut])
def all_perdidas(
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, "seleccionar"):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        perdida = inv_perdida_crud.all_perdidas(db)
        return perdida
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

    
@router.put("/update-perdida-by-id/{id}")
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
        
        updated_perdida = inv_perdida_crud.update_perdida_by_id(db, id, perdida_update)
        if not updated_perdida:
            raise HTTPException(status_code=404, detail="Pérdida no encontrada")
        return {"message": "Pérdida actualizada correctamente"}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/paginated-perdida")
def get_perdidas_paginated(
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
        data = inv_perdida_crud.get_perdidas_paginated(db, skip=skip, limit=page_size)
        total = data["total"]  
        perdidas = data["perdidas"]
        
        return {
            "total_lotes": total,
            "page": page,
            "page_size": page_size,
            "perdidas": perdidas
        }
    except Exception as e:
      raise HTTPException(status_code=500, detail=str(e))