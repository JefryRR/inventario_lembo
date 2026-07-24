from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query 
from sqlalchemy.orm import Session 
from app.crud.permisos import verify_permissions
from app.router.dependencies import get_current_user
from app.core.database import get_db
from app.schemas.solicitud_maq import SolicitudMaqCreate, SolicitudMaqUpdate, SolicitudMaqOut, PaginatedSolicitudes, EstadoSolicitud
from app.crud import solicitud_maq as crud_sol_maquinas
from app.schemas.users import UserOut
from sqlalchemy.exc import SQLAlchemyError 
from fastapi.responses import StreamingResponse 

router = APIRouter()
modulo = 25

# Aquí se definen las rutas para el CRUD de solicitudes de máquinas, incluyendo creación, obtención por ID, actualización y obtención paginada. 
# Cada ruta verifica los permisos del usuario antes de realizar la operación correspondiente.

@router.post("/crear", status_code=status.HTTP_201_CREATED)
def create_solicitud(
    solicitud: SolicitudMaqCreate, 
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'insertar'):
            raise HTTPException(status_code=401, detail= 'Usuario no autorizado')

        crud_sol_maquinas.create_solic_maq(db, solicitud)
        return {"message": "Solicitud registrada correctamente"}
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/by-id")
def get_solic_maq_by_id(
            id: int, 
            db: Session = Depends(get_db),
            user_token: UserOut = Depends(get_current_user)
    ):
    try:
        id_rol=user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        solicitud = crud_sol_maquinas.get_solicitud_by_id(db, id)
        if not solicitud:
            raise HTTPException(status_code=404, detail="Máquina no encontrada")
        return solicitud
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/all_solicitudes", response_model=List[SolicitudMaqOut])
def get_all_solicitud(
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, "seleccionar"):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        solicitudes = crud_sol_maquinas.get_all_solicitudes(db)
        return solicitudes
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.put("/update/{id_solicitud}")
def update_solicitud(
    id_solicitud: int,
    solicitud: SolicitudMaqUpdate,
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'actualizar'):
            raise HTTPException(status_code=401, detail='Usuario no autorizado')
        
        success = crud_sol_maquinas.update_solicitud(db, id_solicitud, solicitud)
        if not success:
            raise HTTPException(status_code=400, detail="No se pudo actualizar la solicitud")
        return {"message": "Solicitud actualizada correctamente"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/rango-fechas", response_model=PaginatedSolicitudes)
def obtener_solicitud_por_rango_fechas(
    fecha_inicio: str = Query(..., description="Fecha inicial en formato YYYY-MM-DD"),
    fecha_fin: str = Query(..., description="Fecha final en formato YYYY-MM-DD"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, "seleccionar"):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        solicitudes = crud_sol_maquinas.get_solicitudes_by_date_range(db, fecha_inicio, fecha_fin)

        if not solicitudes:
            raise HTTPException(status_code=404, detail="No hay registro(s) de solicitudes en ese rango de fechas")

        # Aplicar paginación manualmente a los resultados filtrados
        total = len(solicitudes)
        skip = (page - 1) * page_size
        end_index = skip + page_size
        
        # Obtener solo la página solicitada
        solicitudes_paginadas = solicitudes[skip:end_index]
        
        return PaginatedSolicitudes(
            page=page,
            page_size=page_size,
            total_solicitudes=total,
            total_pages=(total + page_size - 1) // page_size,
            solicitudes=solicitudes_paginadas
        )

    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener los registros de producción: {e}")

@router.put("/estado/{id_solicitud}", status_code=status.HTTP_200_OK)
def change_status_solicitud(
    id_solicitud: int, 
    estado: EstadoSolicitud, 
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'actualizar'):
            raise HTTPException(status_code=401, detail='Usuario no autorizado')

        success = crud_sol_maquinas.change_solicitud_estado(db, id_solicitud, nuevo_estado=estado)
        if not success:
            raise HTTPException(status_code=400, detail="No se pudo cambiar el estado de la solicitud")
        return {"message": "Estado de la solicitud actualizado correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/paginated-solicitudes", response_model=PaginatedSolicitudes)
def get_solicitud_paginated(
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
        data = crud_sol_maquinas.get_solicitudes_paginated(db, skip=skip, limit=page_size)
        total = data["total"]
        solicitudes = data["solicitudes"]
        total_pages = (total + page_size - 1) // page_size
        
        return PaginatedSolicitudes(
            page=page,
            page_size=page_size,
            total_solicitudes=total,
            total_pages=total_pages,
            solicitudes=solicitudes
        )
    except HTTPException:
        raise
    except Exception as e:
      raise HTTPException(status_code=500, detail=str(e))