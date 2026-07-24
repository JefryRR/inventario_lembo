from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.crud.permisos import verify_permissions
from app.router.dependencies import get_current_user
from app.core.database import get_db
from app.schemas.venta_platos import VentaPlatoCreate, VentaPlatoUpdate, VentaPlatoOut, VentaPlatosPaginated
from app.schemas.users import UserOut
from app.crud import venta_platos as crud_ventas_plato
from sqlalchemy.exc import SQLAlchemyError
from fastapi.responses import StreamingResponse  
from app.utils.exportar_reportes import generar_excel_reporte_ventas_platos, generar_pdf_reporte_ventas_platos

router = APIRouter()
modulo = 23

# Aquí se definen las rutas para el CRUD de ventas de platos, incluyendo creación, obtención por ID, actualización y obtención paginada. 
# Cada ruta verifica los permisos del usuario antes de realizar la operación correspondiente.

# Endpoint para crear una nueva venta de plato
@router.post("/crear", status_code=status.HTTP_201_CREATED)
def create_ventaPlato(
    ventaPlato: VentaPlatoCreate, 
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        #Verficamos que tenga permisos
        id_rol = user_token.rol_id       
        if not verify_permissions(db, id_rol, modulo, 'insertar'):
            raise HTTPException(status_code=401, detail= 'Usuario no autorizado')
        
        crud_ventas_plato.create_ventaPlato(db, ventaPlato)
        return {"message": "Venta registrada correctamente"}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/by-id", response_model=VentaPlatoOut)
def get_ventaPlato_by_id(id: int, db: Session = Depends(get_db),
              user_token: UserOut = Depends(get_current_user)
              ):
    try:
        id_rol=user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        plato = crud_ventas_plato.get_ventaPlato_by_id(db, id)
        if not plato:
            raise HTTPException(status_code=404, detail="Venta no encontrada")
        return plato
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint para obtener todos los venta_platos
@router.get("/all-venta_platos", response_model=List[VentaPlatoOut])
def get_all_venta_platos(
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, "seleccionar"):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        plato = crud_ventas_plato.all_ventas_platos(db)
        
        if not plato:
            raise HTTPException(status_code=404, detail="No hay ventas registradas o no se pudieron obtener")
        return plato

        
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

# Ruta para exportar los registros de ventas de platos a Excel 
@router.get("/exportar/excel")
def exportar_ventas_platos_excel(
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
            raise HTTPException(status_code=401, detail='Usuario no autorizado')

        ventas = crud_ventas_plato.all_ventas_platos(db)
        if not ventas:
            raise HTTPException(status_code=404, detail="No hay ventas de platos registradas")

        buffer = generar_excel_reporte_ventas_platos(ventas)
        return StreamingResponse(
            buffer,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": 'attachment; filename="reporte_ventas_platos.xlsx"'}
        )
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

# Ruta para exportar los registros de ventas de platos a PDF
@router.get("/exportar/pdf")
def exportar_ventas_platos_pdf(
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
            raise HTTPException(status_code=401, detail='Usuario no autorizado')

        ventas = crud_ventas_plato.all_ventas_platos(db)
        if not ventas:
            raise HTTPException(status_code=404, detail="No hay ventas de platos registradas")

        buffer = generar_pdf_reporte_ventas_platos(ventas)
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": 'attachment; filename="reporte_ventas_platos.pdf"'}
        )
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/by_id/{id_venta_plato}", status_code=status.HTTP_200_OK)
def update_ventaPlato_by_id(id_venta_plato: int, ventaPlato: VentaPlatoUpdate, db: Session = Depends(get_db),
                user_token: UserOut = Depends(get_current_user)
                ):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'actualizar'):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        success = crud_ventas_plato.update_ventaPlato_by_id(db, id_venta_plato, ventaPlato)
        if not success:
            raise HTTPException(status_code=400, detail="No se pudo actualizar la venta del plato o no se encontraron cambios")
        return {"message": "Plato actualizado correctamente"}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/rango-fechas", response_model=VentaPlatosPaginated)
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
        
        ventas = crud_ventas_plato.get_ventas_by_date_range(db, fecha_inicio, fecha_fin)

        if not ventas:
            raise HTTPException(status_code=404, detail="No hay registro(s) de ventas en ese rango de fechas")

        # Aplicar paginación manualmente a los resultados filtrados
        total = len(ventas)
        skip = (page - 1) * page_size
        end_index = skip + page_size
        
        # Obtener solo la página solicitada
        ventas_paginadas = ventas[skip:end_index]
        
        return VentaPlatosPaginated(
            page=page,
            page_size=page_size,
            total_ventaPlatos=total,
            total_pages=(total + page_size - 1) // page_size,
            ventaPlatos=ventas_paginadas
        )

    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener los registros de las ventas: {e}")

@router.get("/venta_platos_paginated", response_model=VentaPlatosPaginated)
def get_paginated_prog_platos(
     page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, "seleccionar"):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        skip = (page - 1) * page_size
        data = crud_ventas_plato.get_ventas_platos_paginated(db, skip=skip, limit=page_size)

        total = data["total"]
        ventas = data["ventaPlatos"]
        
        return VentaPlatosPaginated(
            page=page,
            page_size=page_size,
            total_ventaPlatos=total,
            total_pages=(total + page_size - 1) // page_size,
            ventaPlatos=ventas
        )
        
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))