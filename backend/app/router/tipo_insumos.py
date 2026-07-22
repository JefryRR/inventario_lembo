from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.crud.permisos import verify_permissions
from app.router.dependencies import get_current_user
from app.core.database import get_db
from app.schemas.tipo_insumo import Tipo_insumoCreate, Tipo_insumoUpdate, Tipo_insumoOut
from app.schemas.users import UserOut
from app.crud import tipo_insumo as crud_tipo_insumo
from sqlalchemy.exc import SQLAlchemyError

router = APIRouter()
modulo = 29

# Endpoint para crear un nuevo rol
@router.post("/crear", status_code=status.HTTP_201_CREATED)
def create_tipo_insumo(
    tipo_insumo: Tipo_insumoCreate, 
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        #Verficamos que tenga permisos
        id_tipo_insumo = user_token.rol_id       
        if not verify_permissions(db, id_tipo_insumo, modulo, 'insertar'):
            raise HTTPException(status_code=401, detail= 'Usuario no autorizado')
        
        crud_tipo_insumo.create_tipo_insumo(db, tipo_insumo)
        return {"message": "tipo de insumo registrado correctamente"}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint para obtener un rol por su ID  
@router.get("/by-id",  response_model=Tipo_insumoOut)
def get_tipo_insumo_by_id(id: int, db: Session = Depends(get_db),
              user_token: UserOut = Depends(get_current_user)
              ):
    try:
        id_tipo_insumo=user_token.rol_id
        if not verify_permissions(db, id_tipo_insumo, modulo, 'seleccionar'):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        tipo_insumo = crud_tipo_insumo.get_tipo_insumo_by_id(db, id)

        if not tipo_insumo:
            raise HTTPException(status_code=404, detail="tipo de insumo no encontrada")
        return tipo_insumo
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint para obtener todos los tipos de insumos
@router.get("/all-tipo_insumo", response_model=List[Tipo_insumoOut])
def get_all_tipos_insumos(
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, "seleccionar"):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        tipo_insumo = crud_tipo_insumo.get_all_tipo_insumos(db)
        
        if not tipo_insumo:
            raise HTTPException(status_code=404, detail="No hay tipos de insumos registrados o no se pudieron obtener")
        return tipo_insumo

    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint para actualizar un rol por su ID   
@router.put("/by_id/{id_tipo_insumo}")
def update_tipo_insumo_by_id(id_tipo_insumo: int, tipo_insumo: Tipo_insumoUpdate, db: Session = Depends(get_db),
                user_token: UserOut = Depends(get_current_user)
                ):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'actualizar'):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        success = crud_tipo_insumo.update_tipo_insumo_by_id(db, id_tipo_insumo, tipo_insumo)
        if not success:
            raise HTTPException(status_code=400, detail="No se pudo actualizar el tipo de insumo")
        return {"message": "Tipo de insumo actualizado correctamente"}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))
