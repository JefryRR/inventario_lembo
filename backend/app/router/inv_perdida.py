from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query 
from sqlalchemy.orm import Session 
from app.crud.permisos import verify_permissions
from app.router.dependencies import get_current_user
from app.core.database import get_db
from app.schemas.inv_perdida import Optional, PerdidaCreate, PerdidaUpdate, PerdidaOut, PaginatedPerdidas
from app.schemas.users import UserOut
from app.crud import inv_perdida as inv_perdida_crud
from sqlalchemy.exc import SQLAlchemyError 
from fastapi.responses import StreamingResponse   
from app.utils.exportar_reportes import generar_excel_reporte_perdidas, generar_pdf_reporte_perdidas
from app.core.scheduler import job_registrar_vencidos

router = APIRouter()
modulo = 11

# Aquí se definen las rutas para el CRUD de inv_perdida, incluyendo creación, obtención por ID, actualización y obtención paginada. 
# Cada ruta verifica los permisos del usuario antes de realizar la operación correspondiente.

@router.post("/crear", status_code=status.HTTP_201_CREATED)
def create_perdida(
    perdida: PerdidaCreate, 
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id       
        if not verify_permissions(db, id_rol, modulo, 'insertar'):
            raise HTTPException(status_code=401, detail='Usuario no autorizado')
        
        inv_perdida_crud.create_perdida(db, perdida, user_token.id_user)
        return {"message": "Pérdida registrada correctamente"}
    except HTTPException:
        raise
    except Exception as e:
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

# Ruta para exportar el reporte de pérdidas en formato Excel
@router.get("/exportar/excel")
def exportar_perdidas_excel(
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
            raise HTTPException(status_code=401, detail='Usuario no autorizado')

        perdidas = inv_perdida_crud.all_perdidas(db)
        if not perdidas:
            raise HTTPException(status_code=404, detail="No hay pérdidas registradas")

        buffer = generar_excel_reporte_perdidas(perdidas)
        return StreamingResponse(
            buffer,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": 'attachment; filename="reporte_perdidas.xlsx"'}
        )
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

# Ruta para exportar el reporte de pérdidas en formato PDF
@router.get("/exportar/pdf")
def exportar_perdidas_pdf(
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
            raise HTTPException(status_code=401, detail='Usuario no autorizado')

        perdidas = inv_perdida_crud.all_perdidas(db)
        if not perdidas:
            raise HTTPException(status_code=404, detail="No hay pérdidas registradas")

        buffer = generar_pdf_reporte_perdidas(perdidas)
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": 'attachment; filename="reporte_perdidas.pdf"'}
        )
    except HTTPException:
        raise
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

@router.get("/rango-fechas", response_model=PaginatedPerdidas)
def obtener_perdidas_por_rango_fechas(
    fecha_inicio: str = Query(..., description="Fecha inicial en formato YYYY-MM-DD"),
    fecha_fin: str = Query(..., description="Fecha final en formato YYYY-MM-DD"),
    origen: Optional[str] = Query(None, description="Origen de la pérdida (opcional)"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, "seleccionar"):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        perdidas = inv_perdida_crud.get_perdidas_by_date_range(db, fecha_inicio, fecha_fin, origen)

        if not perdidas:
            raise HTTPException(status_code=404, detail="No hay registro(s) de pérdidas en ese rango de fechas")

        # Aplicar paginación manualmente a los resultados filtrados
        total = len(perdidas)
        skip = (page - 1) * page_size
        end_index = skip + page_size
        
        # Obtener solo la página solicitada
        perdidas_paginadas = perdidas[skip:end_index]
        
        return PaginatedPerdidas(
            page=page,
            page_size=page_size,
            total_perdidas=total,
            total_pages=(total + page_size - 1) // page_size,
            perdidas=perdidas_paginadas
        )

    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener los registros de las pérdidas: {e}")

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
            "total_perdidas": total,
            "page": page,
            "page_size": page_size,
            "perdidas": perdidas
        }
    except Exception as e:
      raise HTTPException(status_code=500, detail=str(e))
    
# Ruta para procesar los vencidos manualmente
@router.post("/procesar-vencidos")
def procesar_vencidos_manual(
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    id_rol = user_token.rol_id
    if not verify_permissions(db, id_rol, modulo, 'insertar'):
        raise HTTPException(status_code=401, detail='Usuario no autorizado')
    
    from app.crud.comercio import registrar_vencidos_como_perdidas as vencidos_comercio
    from app.crud.inv_produccion import registrar_vencidos_como_perdidas as vencidos_produccion
    from app.crud.inv_insumos import registrar_vencidos_como_perdidas as vencidos_insumos

    n_produccion = vencidos_produccion(db)
    n_insumos = vencidos_insumos(db)
    n_comercio = vencidos_comercio(db)

    return {
        "message": "Proceso de vencidos ejecutado correctamente",
        "produccion_registrados": n_produccion,
        "insumos_registrados": n_insumos,
        "comercio_registrados": n_comercio,
    }