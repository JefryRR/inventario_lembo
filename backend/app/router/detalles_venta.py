from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query 
from sqlalchemy.orm import Session 
from app.crud.permisos import verify_permissions
from app.router.dependencies import get_current_user
from app.core.database import get_db
from app.schemas.detalle_venta import DetalleVentaCreate, DetalleVentaUpdate, DetalleVentaOut, EstadoVenta
from app.schemas.users import UserOut
from app.crud import detalle_venta as crud_detalles
from sqlalchemy.exc import SQLAlchemyError 

router = APIRouter()
modulo = 8

# Aquí se definen las rutas para el CRUD de detalles de venta, incluyendo creación, obtención por ID, actualización y obtención paginada. 
# Cada ruta verifica los permisos del usuario antes de realizar la operación correspondiente.

@router.post("/crear", status_code=status.HTTP_201_CREATED)
def create_detalle_venta(
    detalle: DetalleVentaCreate, 
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id       
        if not verify_permissions(db, id_rol, modulo, 'insertar'):
            raise HTTPException(status_code=401, detail= 'Usuario no autorizado')
        
        detalle_id = crud_detalles.create_detalle_venta(db, detalle)
        return {"message": "Detalle de venta registrado correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        mensaje_error = str(e)
        if "no hay suficiente stock" in mensaje_error.lower() or "inventario insuficiente" in mensaje_error.lower() or "No se puede crear el detalle de venta" in mensaje_error:
            raise HTTPException(status_code=409, detail=mensaje_error)
        
        if not detalle.venta_id or detalle.venta_id == 0:
            raise HTTPException(status_code=400, detail="No ha seleccionado una venta para este detalle")
        
        raise HTTPException(status_code=500, detail=mensaje_error)
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/by-id/detalle",  response_model=DetalleVentaOut)
def get_detalle_venta_by_id(
            id: int, 
            db: Session = Depends(get_db),
            user_token: UserOut = Depends(get_current_user)
            ):
    try:
        id_rol=user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        detalle = crud_detalles.get_detalle_venta_by_id(db, id)
        if not detalle:
            raise HTTPException(status_code=404, detail="Detalle de venta no encontrado")
        
        return detalle
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/by-id_venta",  response_model=List[DetalleVentaOut])
def get_det_venta_by_id_venta(
            id_venta: int, 
            db: Session = Depends(get_db),
            user_token: UserOut = Depends(get_current_user)
            ):
    try:
        id_rol=user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        detalle = crud_detalles.get_det_venta_by_id_venta(db, id_venta)
        if not detalle:
            raise HTTPException(status_code=404, detail="Detalle de venta no encontrado")
        
        return detalle
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))
 

@router.get("/all/detalles", response_model=List[DetalleVentaOut])
def get_all_detalles_venta(
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, "seleccionar"):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        detalles = crud_detalles.get_all_detalles_venta(db)
        return detalles
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.put("/update/detalle/{id}")
def update_detalle_venta_by_id(
    id: int,
    detalle_update: DetalleVentaUpdate,
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id

       # 1. Verificar permisos primero
        if not verify_permissions(db, id_rol, modulo, "actualizar"):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")

        # 2. Verificar que el detalle existe
        estado_venta = crud_detalles.get_detalle_venta_by_id(db, id)
        if not estado_venta:
            raise HTTPException(status_code=404, detail="Detalle de venta no encontrado")
                
        # 3. Verificar estado de la venta
        estados_bloqueados = ["Vendido", "Anulado"]
        if estado_venta.estado_venta in estados_bloqueados:
            raise HTTPException(
                status_code=400,
                detail=f"No se puede actualizar el registro porque la venta se encuentra en estado '{(estado_venta.estado_venta).value}'"
            )

        # 4. Validar campos del body
        if detalle_update.cantidad is not None and detalle_update.cantidad < 0:
            raise HTTPException(status_code=400, detail="La cantidad no puede ser negativa")

        # 5. Ejecutar actualización
        result = crud_detalles.update_detalle_venta_by_id(db, id, detalle_update)
        
        if not result:
            raise HTTPException(status_code=404, detail="Detalle de venta no encontrado")
        return {"message": "Detalle de venta actualizado correctamente"}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.put("/estado/{id_detalle_venta}", status_code=status.HTTP_200_OK)
def change_status_detalle_venta(
    id_detalle_venta: int, 
    estado: EstadoVenta, 
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'actualizar'):
            raise HTTPException(status_code=401, detail='Usuario no autorizado')

        success = crud_detalles.change_status_det_venta(db, id_detalle_venta, estado=estado)
        if not success:
            raise HTTPException(status_code=400, detail="No se pudo cambiar el estado del detalle de la venta")
        return {"message": "Estado del detalle de la venta actualizado correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/paginated-detalle")
def get_detalles_venta_paginated(
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
        data = crud_detalles.get_detalles_venta_paginated(db, skip=skip, limit=page_size)
        total = data["total"]  
        detalles = data["detalles"]
        
        return {
            "total_detalles": total,
            "page": page,
            "page_size": page_size,
            "detalles": detalles
        }
    except Exception as e:
      raise HTTPException(status_code=500, detail=str(e))

# Endpoint para eliminar un detalle de venta por su ID, asegurando que la venta no esté en estado "Vendido" o "Anulado"
@router.delete("/delete_by_id/{id}", status_code=status.HTTP_200_OK)
def delete_detalle_venta_by_id(
    id: int,
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, "borrar"):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        detalle = crud_detalles.get_detalle_venta_by_id(db, id)
        if not detalle:
            raise HTTPException(status_code=404, detail="Detalle de venta no encontrado")
        
        estados_bloqueados = ["Vendido", "Anulado"]
        if detalle.estado_venta in estados_bloqueados:
            raise HTTPException(
                status_code=400,
                detail=f"No se puede eliminar el registro porque la venta se encuentra en estado '{(detalle.estado_venta).value}'"
            )
        
        success = crud_detalles.delete_detalle_venta_by_id(db, id)
        if not success:
            raise HTTPException(status_code=400, detail="No se pudo eliminar el detalle de venta")
        
        return {"message": "Detalle de venta eliminado correctamente"}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))