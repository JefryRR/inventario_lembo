from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.core.database import get_db
from app.crud.permisos import verify_permissions
from app.crud import comercio as crud_comercializacion
from app.router.dependencies import get_current_user
from app.schemas.comercio import (
	ComercializacionCreate,
	ComercializacionUpdate,
	ComercializacionOut,
	PaginatedComercializaciones,
)
from app.schemas.users import UserOut
from fastapi.responses import StreamingResponse 
from typing import Optional
from app.utils.exportar_reportes import generar_excel_reporte_comercializacion, generar_pdf_reporte_comercializacion


router = APIRouter()
modulo = 26

# Aquí se definen las rutas para el CRUD de comercialización, incluyendo creación, obtención por ID, actualización y obtención paginada.
# Cada ruta verifica los permisos del usuario antes de realizar la operación correspondiente.

@router.post("/crear", status_code=status.HTTP_201_CREATED)
def create_comercializacion(
	comercializacion: ComercializacionCreate,
	db: Session = Depends(get_db),
	user_token: UserOut = Depends(get_current_user)
):
	try:
		id_rol = user_token.rol_id
		if not verify_permissions(db, id_rol, modulo, "insertar"):
			raise HTTPException(status_code=401, detail="Usuario no autorizado")

		comercializacion_id = crud_comercializacion.create_comercializacion(db, comercializacion, user_token.id_user)
		return {
			"message": "Comercialización registrada correctamente",
			"id_comercializacion": comercializacion_id,
		}
	except HTTPException:
		raise
	except SQLAlchemyError as e:
		raise HTTPException(status_code=500, detail=str(e))


@router.get("/by-id", response_model=ComercializacionOut)
def get_comercializacion_by_id(
	id: int,
	db: Session = Depends(get_db),
	user_token: UserOut = Depends(get_current_user)
):
	try:
		id_rol = user_token.rol_id
		if not verify_permissions(db, id_rol, modulo, "seleccionar"):
			raise HTTPException(status_code=401, detail="Usuario no autorizado")

		comercializacion = crud_comercializacion.get_comercializacion_by_id(db, id)
		if not comercializacion:
			raise HTTPException(status_code=404, detail="Comercialización no encontrada")
		return comercializacion
	except SQLAlchemyError as e:
		raise HTTPException(status_code=500, detail=str(e))

# Endpoint para exportar comercializaciones a Excel
@router.get("/exportar/excel")
def exportar_comercializaciones_excel(
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
            raise HTTPException(status_code=401, detail='Usuario no autorizado')

        comercializaciones = crud_comercializacion.get_all_comercializaciones(db)
        if not comercializaciones:
            raise HTTPException(status_code=404, detail="No hay comercializaciones registradas")

        # Generar el archivo Excel en memoria
        buffer = generar_excel_reporte_comercializacion(comercializaciones)
        return StreamingResponse(
            buffer,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": 'attachment; filename="reporte_comercializaciones.xlsx"'}
        )
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint para exportar comercializaciones a PDF
@router.get("/exportar/pdf")
def exportar_comercializaciones_pdf(
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
            raise HTTPException(status_code=401, detail='Usuario no autorizado')

        comercializaciones = crud_comercializacion.get_all_comercializaciones(db)
        if not comercializaciones:
            raise HTTPException(status_code=404, detail="No hay comercializaciones registradas")

        buffer = generar_pdf_reporte_comercializacion(comercializaciones)
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": 'attachment; filename="reporte_comercializaciones.pdf"'}
        )
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/all/comercializaciones", response_model=List[ComercializacionOut])
def get_all_comercializaciones(
	db: Session = Depends(get_db),
	solo_vigentes: bool = False,
	user_token: UserOut = Depends(get_current_user)
):
	try:
		id_rol = user_token.rol_id
		if not verify_permissions(db, id_rol, modulo, "seleccionar"):
			raise HTTPException(status_code=401, detail="Usuario no autorizado")

		comercializaciones = crud_comercializacion.get_all_comercializaciones(db, vigentes=solo_vigentes)
		return comercializaciones
	except SQLAlchemyError as e:
		raise HTTPException(status_code=500, detail=str(e))

# Endpoint para obtener comercializaciones disponibles (vendió todo = False)
@router.get("/disponibles", response_model=List[ComercializacionOut])
def get_comercializaciones_disponibles(
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, "seleccionar"):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")

        comercializaciones = crud_comercializacion.get_comercializaciones_disponibles(db)
        return comercializaciones
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))
	
@router.get("/rango-fechas", response_model=PaginatedComercializaciones)
def obtener_comercializaciones_por_rango_fechas(
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
        
        comercializaciones = crud_comercializacion.get_comercializaciones_by_date_range(db, fecha_inicio, fecha_fin)

        if not comercializaciones:
            raise HTTPException(status_code=404, detail="No hay registro(s) de comercializaciones en ese rango de fechas")

        # Aplicar paginación manualmente a los resultados filtrados
        total = len(comercializaciones)
        skip = (page - 1) * page_size
        end_index = skip + page_size
        
        # Obtener solo la página solicitada
        comercializaciones_paginadas = comercializaciones[skip:end_index]
        
        return PaginatedComercializaciones(
            page=page,
            page_size=page_size,
            total_comercializaciones=total,
            total_pages=(total + page_size - 1) // page_size,
            comercializaciones=comercializaciones_paginadas
        )
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener los registros de comercializaciones: {e}")

@router.put("/update/comercializacion/{id}")
def update_comercializacion_by_id(
	id: int,
	comercializacion: ComercializacionUpdate,
	db: Session = Depends(get_db),
	user_token: UserOut = Depends(get_current_user)
):
	try:
		id_rol = user_token.rol_id
		if not verify_permissions(db, id_rol, modulo, "actualizar"):
			raise HTTPException(status_code=401, detail="Usuario no autorizado")

		success = crud_comercializacion.update_comercializacion_by_id(db, id, comercializacion)
		if not success:
			raise HTTPException(status_code=400, detail="No se pudo actualizar la comercialización")
		return {"message": "Comercialización actualizada correctamente"}
	except HTTPException:
		raise
	except SQLAlchemyError as e:
		raise HTTPException(status_code=500, detail=str(e))

# Endpoint para cambiar el estado de "vendió todo" de una comercialización
@router.put("/update/vendio-todo/{id}")
def change_vendio_todo_status(
    id: int,
    vendio_todo: bool,
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, "actualizar"):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")

        success = crud_comercializacion.change_vendio_todo_status(db, id, vendio_todo)
        if not success:
            raise HTTPException(status_code=400, detail="No se pudo actualizar el estado de vendió todo")
        return {"message": "Estado de vendió todo actualizado correctamente"}
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/paginated-comercializaciones", response_model=PaginatedComercializaciones)
def get_comercializaciones_paginated(
	page: int = Query(1, ge=1),
	page_size: int = Query(10, ge=1, le=100),
	db: Session = Depends(get_db),
    search: Optional[str] = None,
	user_token: UserOut = Depends(get_current_user)
):
	try:
		id_rol = user_token.rol_id
		if not verify_permissions(db, id_rol, modulo, "seleccionar"):
			raise HTTPException(status_code=401, detail="Usuario no autorizado")

		skip = (page - 1) * page_size
		data = crud_comercializacion.get_comercializaciones_paginated(db, skip=skip, limit=page_size, search=search)
		total = data["total"]
		comercializaciones = data["comercializaciones"]

		return PaginatedComercializaciones(
			total_comercializaciones=total,
			page=page,
			page_size=page_size,
			total_pages=(total + page_size - 1) // page_size,
			comercializaciones=comercializaciones,
		)
	except Exception as e:
		raise HTTPException(status_code=500, detail=str(e))
