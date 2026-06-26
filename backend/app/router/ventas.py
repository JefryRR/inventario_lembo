from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query # type: ignore
from sqlalchemy.orm import Session # type: ignore
from app.crud.permisos import verify_permissions
from app.router.dependencies import get_current_user
from app.core.database import get_db
from app.schemas.ventas import VentasCreate, VentasUpdate, VentasOut, PaginatedVentas
from app.crud import ventas as crud_ventas
from app.schemas.users import UserOut
from sqlalchemy.exc import SQLAlchemyError # type: ignore
from fastapi.responses import StreamingResponse   # type: ignore
from app.crud import detalle_venta as crud_detalle_ventas
from app.utils.exportar_reportes import generar_excel_reporte_ventas, generar_pdf_reporte_ventas, _agrupar_detalles_por_venta

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
        
        venta_id = crud_ventas.create_venta(db, venta, user_token.id_user)
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
    
@router.get("/exportar/excel")
def exportar_ventas_excel(
    fecha_inicio: Optional[str] = Query(None, description="Fecha inicial en formato YYYY-MM-DD"),
    fecha_fin: Optional[str] = Query(None, description="Fecha final en formato YYYY-MM-DD"),
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
            raise HTTPException(status_code=401, detail='Usuario no autorizado')

        if fecha_inicio and fecha_fin:
            ventas = crud_ventas.get_ventas_by_date_range(db, fecha_inicio, fecha_fin)
            nombre_archivo = f"reporte_ventas_{fecha_inicio}_a_{fecha_fin}.xlsx"
        else:
            ventas = crud_ventas.all_ventas(db)
            nombre_archivo = "reporte_ventas.xlsx"

        if not ventas:
            raise HTTPException(status_code=404, detail="No hay ventas registradas")

        detalles = crud_detalle_ventas.get_all_detalles_venta(db)

        buffer = generar_excel_reporte_ventas(ventas, detalles)
        return StreamingResponse(
            buffer,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{nombre_archivo}"'}
        )
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/exportar/pdf")
def exportar_ventas_pdf(
    fecha_inicio: Optional[str] = Query(None, description="Fecha inicial en formato YYYY-MM-DD"),
    fecha_fin: Optional[str] = Query(None, description="Fecha final en formato YYYY-MM-DD"),
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
            raise HTTPException(status_code=401, detail='Usuario no autorizado')

        if fecha_inicio and fecha_fin:
            ventas = crud_ventas.get_ventas_by_date_range(db, fecha_inicio, fecha_fin)
            nombre_archivo = f"reporte_ventas_{fecha_inicio}_a_{fecha_fin}.pdf"
        else:
            ventas = crud_ventas.all_ventas(db)
            nombre_archivo = "reporte_ventas.pdf"

        if not ventas:
            raise HTTPException(status_code=404, detail="No hay ventas registradas")

        detalles = crud_detalle_ventas.get_all_detalles_venta(db)

        buffer = generar_pdf_reporte_ventas(ventas, detalles)
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{nombre_archivo}"'}
        )
    except HTTPException:
        raise
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
    
@router.get("/rango-fechas", response_model=PaginatedVentas)
def obtener_ventas_por_rango_fechas(
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
        
        ventas = crud_ventas.get_ventas_by_date_range(db, fecha_inicio, fecha_fin)

        if not ventas:
            raise HTTPException(status_code=404, detail="No hay registro(s) de ventas en ese rango de fechas")

        # Aplicar paginación manualmente a los resultados filtrados
        total = len(ventas)
        skip = (page - 1) * page_size
        end_index = skip + page_size
        
        # Obtener solo la página solicitada
        ventas_paginados = ventas[skip:end_index]
        
        return PaginatedVentas(
            page=page,
            page_size=page_size,
            total_ventas=total,
            total_pages=(total + page_size - 1) // page_size,
            ventas=ventas_paginados
        )

    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener los registros de producción: {e}")

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