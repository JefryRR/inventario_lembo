from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query # type: ignore
from sqlalchemy.orm import Session # type: ignore
from app.crud.permisos import verify_permissions
from app.router.dependencies import get_current_user
from app.core.database import get_db
from app.schemas.solicitud import SolicitudCreate, SolicitudUpdate, SolicitudOut, PaginatedSolicitudes, SolicitudStatus
from app.crud import solicitud as crud_solicitud
from app.crud import inv_insumos as crud_insumos
from app.schemas.users import UserOut
from sqlalchemy.exc import SQLAlchemyError # type: ignore

router = APIRouter()
modulo = 19

@router.post("/crear", status_code=status.HTTP_201_CREATED)
def create_solicitud(
    solicitud: SolicitudCreate, 
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'insertar'):
            raise HTTPException(status_code=401, detail= 'Usuario no autorizado')

        insumo = crud_insumos.get_insumo_by_id(db, solicitud.insumo_id)
        if not insumo:
            raise HTTPException(status_code=404, detail="Insumo no encontrado")
        
        crud_solicitud.create_solicitud(db, solicitud, user_token.id_user)
        return {"message": "Solicitud registrada correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        mensaje_error = str(e)
        if "no hay suficiente stock" in mensaje_error.lower():
            raise HTTPException(status_code=409, detail=mensaje_error)
        raise HTTPException(status_code=500, detail=mensaje_error)
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/by-id", response_model=SolicitudOut)
def get_solicitud_by_id(id: int, 
              db: Session = Depends(get_db),
              user_token: UserOut = Depends(get_current_user)
              ):
    try:
        id_rol=user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        solicitud = crud_solicitud.get_solicitud_by_id(db, id)
        if not solicitud:
            raise HTTPException(status_code=404, detail="Solicitud no encontrada")
        return solicitud
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/all_solicitudes", response_model=List[SolicitudOut])
def get_all_solicitud(
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, "seleccionar"):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        solicitudes = crud_solicitud.get_all_solicitudes(db)
        return solicitudes
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.put("/update/{solicitud_id}")
def update_solicitud(
    solicitud_id: int,
    solicitud: SolicitudUpdate,
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'actualizar'):
            raise HTTPException(status_code=401, detail='Usuario no autorizado')
        
        success = crud_solicitud.update_solicitud_by_id(db, solicitud_id, solicitud)
        if not success:
            raise HTTPException(status_code=400, detail="No se pudo actualizar la solicitud")
        return {"message": "Solicitud actualizada correctamente"}
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.put("/estado/{solicitud_id}", status_code=status.HTTP_200_OK)
def change_status_solicitud(solicitud_id: int, estado: SolicitudStatus, db: Session = Depends(get_db),
                           user_token: UserOut = Depends(get_current_user)
                           ):
  try:
      id_rol = user_token.rol_id
      if not verify_permissions(db, id_rol, modulo, 'actualizar'):
             raise HTTPException(status_code=401, detail= 'Usuario no autorizado')

      success = crud_solicitud.change_status_solicitud(db, solicitud_id, estado=estado)
      if not success:
          raise HTTPException(status_code=400, detail="No se pudo cambiar el estado de la solicitud")
      return {"message": "Estado de la solicitud actualizado correctamente"}
  except Exception as e:
      raise HTTPException(status_code=500, detail=str(e))

@router.get("/rango_fechas", response_model=PaginatedSolicitudes)
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
        
        solicitud = crud_solicitud.get_solicitud_by_date_range(db, fecha_inicio, fecha_fin)

        if not solicitud:
            raise HTTPException(status_code=404, detail="No hay registro(s) de solicitud en ese rango de fechas")

        # Aplicar paginación manualmente a los resultados filtrados
        total = len(solicitud)
        skip = (page - 1) * page_size
        end_index = skip + page_size
        
        # Obtener solo la página solicitada
        solicitud_paginados = solicitud[skip:end_index]
        
        return PaginatedSolicitudes(
            page=page,
            page_size=page_size,
            total_solicitudes=total,
            total_pages=(total + page_size - 1) // page_size,
            solicitudes=solicitud_paginados
        )

    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener los registros de solicitud: {e}")

@router.get("/paginated_solicitudes")
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
        data = crud_solicitud.get_solicitudes_paginated(db, skip=skip, limit=page_size)
        total = data["total"]  
        solicitud = data["solicitudes"]
        
        return {
            "total_solicitudes": total,
            "page": page,
            "page_size": page_size,
            "solicitudes": solicitud
        }
    except HTTPException:
        raise
    
    except Exception as e:
      raise HTTPException(status_code=500, detail=str(e))