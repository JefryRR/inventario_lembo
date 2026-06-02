from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query # type: ignore
from sqlalchemy.orm import Session # type: ignore
from app.crud.permisos import verify_permissions
from app.router.dependencies import get_current_user
from app.core.database import get_db
from app.schemas.inv_produccion import ProduccionCreate, ProduccionUpdate, ProduccionOut, PaginatedProducciones
from app.crud import inv_produccion as crud_produccion
from app.crud import lotes_prod as crud_lotes_prod
from app.schemas.users import UserOut
from sqlalchemy.exc import SQLAlchemyError # type: ignore

router = APIRouter()
modulo = 17

@router.post("/crear", status_code=status.HTTP_201_CREATED)
def create_produccion(
    produccion: ProduccionCreate, 
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'insertar'):
            raise HTTPException(status_code=401, detail= 'Usuario no autorizado')

        lote = crud_lotes_prod.get_lote_by_id(db, produccion.lote_id)
        if not lote:
            raise HTTPException(status_code=404, detail="Lote no encontrado")

        estados_bloqueados = {"activo", "cuarentena", "finalizado"}
        if lote["estado_lote"] in estados_bloqueados:
            raise HTTPException(
                status_code=400,
                detail="No se puede registrar la producción porque el lote está activo, en cuarentena o finalizado"
            )
        
        crud_produccion.create_produccion(db, produccion)
        return {"message": "Producción registrada correctamente"}
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/by-id", response_model=ProduccionOut)
def get_produccion_by_id(id: int, 
              db: Session = Depends(get_db),
              user_token: UserOut = Depends(get_current_user)
              ):
    try:
        id_rol=user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        produccion = crud_produccion.get_produccion_by_id(db, id)
        if not produccion:
            raise HTTPException(status_code=404, detail="Producción no encontrada")
        return produccion
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/all/produccion", response_model=List[ProduccionOut])
def get_all_produccion(
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, "seleccionar"):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        producciones = crud_produccion.all_produccion(db)
        return producciones
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.put("/update/{produccion_id}")
def update_produccion(
    produccion_id: int,
    produccion: ProduccionUpdate,
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'actualizar'):
            raise HTTPException(status_code=401, detail='Usuario no autorizado')
        
        success = crud_produccion.update_produccion(db, produccion_id, produccion)
        if not success:
            raise HTTPException(status_code=400, detail="No se pudo actualizar la producción")
        return {"message": "Producción actualizada correctamente"}
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/rango-fechas", response_model=PaginatedProducciones)
def obtener_produccion_por_rango_fechas(
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
        
        produccion = crud_produccion.get_produccion_by_date_range(db, fecha_inicio, fecha_fin)

        if not produccion:
            raise HTTPException(status_code=404, detail="No hay registro(s) de producción en ese rango de fechas")

        # Aplicar paginación manualmente a los resultados filtrados
        total = len(produccion)
        skip = (page - 1) * page_size
        end_index = skip + page_size
        
        # Obtener solo la página solicitada
        produccion_paginados = produccion[skip:end_index]
        
        return PaginatedProducciones(
            page=page,
            page_size=page_size,
            total_produccion=total,
            total_pages=(total + page_size - 1) // page_size,
            produccion=produccion_paginados
        )

    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener los registros de producción: {e}")


@router.get("/reporte/{inv_prod_id}")
def get_reporte_produccion(
    inv_prod_id: int,
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
            raise HTTPException(status_code=401, detail='Usuario no autorizado')

        reporte = crud_produccion.get_reporte_produccion_detallado(db, inv_prod_id)
        if not reporte:
            raise HTTPException(status_code=404, detail="Producción no encontrada")
        return reporte
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/paginated-production")
def get_produccion_paginated(
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
        data = crud_produccion.get_produccion_paginated(db, skip=skip, limit=page_size)
        total = data["total"]  
        produccion = data["produccion"]
        
        return {
            "total_produccion": total,
            "page": page,
            "page_size": page_size,
            "produccion": produccion
        }
    except HTTPException:
        raise
    except Exception as e:
      raise HTTPException(status_code=500, detail=str(e))