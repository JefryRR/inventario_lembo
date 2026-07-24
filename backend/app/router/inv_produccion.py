from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query 
from sqlalchemy.orm import Session 
from app.crud.permisos import verify_permissions
from app.router.dependencies import get_current_user
from app.core.database import get_db
from app.schemas.inv_produccion import ProduccionCreate, ProduccionUpdate, ProduccionOut, PaginatedProducciones
from app.crud import inv_produccion as crud_produccion
from app.crud import lotes_prod as crud_lotes_prod
from app.schemas.users import UserOut
from sqlalchemy.exc import SQLAlchemyError 
from fastapi.responses import StreamingResponse 
from app.utils.reporte_produccion import generar_excel_rep_gral_produccion, generar_excel_reporte_produccion, generar_pdf_rep_gral_produccion, generar_pdf_reporte_produccion
from typing import Optional, Literal

router = APIRouter()
modulo = 17

# Aquí se definen las rutas para el CRUD de inv_produccion, incluyendo creación, obtención por ID, actualización y obtención paginada. 
# Cada ruta verifica los permisos del usuario antes de realizar la operación correspondiente.

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

# Ruta para exportar el reporte general de producción en formato PDF
@router.get("/exportar_reporte_general/pdf")
def exportar_rep_gral_produccion_pdf(
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
            raise HTTPException(status_code=401, detail='Usuario no autorizado')

        producciones = crud_produccion.all_produccion(db)
        if not producciones:
            raise HTTPException(status_code=404, detail="No hay producciones registradas")

        buffer = generar_pdf_rep_gral_produccion(producciones)
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": 'attachment; filename="reporte_general_produccion.pdf"'}
        )
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

# Ruta para exportar el reporte general de producción en formato Excel
@router.get("/exportar_reporte_general/excel")
def exportar_rep_gral_produccion_excel(
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
            raise HTTPException(status_code=401, detail='Usuario no autorizado')

        producciones = crud_produccion.all_produccion(db)
        if not producciones:
            raise HTTPException(status_code=404, detail="No hay producciones registradas")

        buffer = generar_excel_rep_gral_produccion(producciones)
        return StreamingResponse(
            buffer,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": 'attachment; filename="reporte_general_produccion.xlsx"'}
        )
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

# Ruta para obtener un reporte detallado de la producción por su ID.
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

# Ruta para exportar un reporte detallado de la producción por su ID en formato Excel.
@router.get("/reporte/{inv_prod_id}/excel")
def exportar_reporte_produccion_excel(
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

        buffer = generar_excel_reporte_produccion(reporte)
        return StreamingResponse(
            buffer,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="reporte_produccion_{inv_prod_id}.xlsx"'}
        )
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

# Ruta para exportar un reporte detallado de la producción por su ID en formato PDF.
@router.get("/reporte/{inv_prod_id}/pdf")
def exportar_reporte_produccion_pdf(
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

        buffer = generar_pdf_reporte_produccion(reporte)
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="reporte_produccion_{inv_prod_id}.pdf"'}
        )
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/paginated-production")
def get_produccion_paginated(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user),
    estado: Optional[Literal["vencido", "sin_stock", "critico", "urgente", "vigente"]] = None   
): 
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
             raise HTTPException(status_code=401, detail= 'Usuario no autorizado')
         
        skip = (page - 1) * page_size
        data = crud_produccion.get_produccion_paginated(db, skip=skip, limit=page_size, estado=estado)
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