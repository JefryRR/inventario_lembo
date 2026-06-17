import os, uuid
from datetime import date
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form   #type: ignore
from sqlalchemy.orm import Session   #type: ignore
from app.crud.permisos import verify_permissions
from app.router.dependencies import get_current_user
from app.core.database import get_db
from app.schemas.inv_insumos import InsumoCreate, InsumoUpdate, InsumoOut, Paginatedinsumos 
from app.crud import inv_insumos as crud_insumos
from app.schemas.users import UserOut
from sqlalchemy.exc import SQLAlchemyError #type: ignore
from fastapi.responses import StreamingResponse  #type: ignore
from app.utils.exportar_reportes import generar_excel_reporte_insumo, generar_pdf_reporte_insumo

router = APIRouter()
modulo = 10
UPLOAD_DIR = "static/facturas"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/crear", status_code=201)
async def crear_insumo(
    # Campos del insumo
    nombre_producto: str   = Form(...),
    cantidad: float        = Form(...),
    unid_medida_id: int    = Form(...),
    precio_unitario: float = Form(...),
    min_stock: float       = Form(...),
    fecha_ingreso: str     = Form(...),
    fecha_vencimiento: str = Form(...),
    tipo_id: int           = Form(...),
    # Campos de factura (opcionales)
    fecha_compra: date     = Form(None),
    archivo: UploadFile    = File(None),
    db: Session            = Depends(get_db),
    current_user           = Depends(get_current_user),
):
    print("archivo recibido:", archivo)
    print("filename:", archivo.filename if archivo else "None")
    print("content_type:", archivo.content_type if archivo else "None")
    try:
        factura_url = None

        # Guardar archivo si viene
        if archivo and archivo.filename:
            ALLOWED = {"image/jpeg", "image/png", "application/pdf"}
            if archivo.content_type not in ALLOWED:
                raise HTTPException(status_code=400, detail="Tipo de archivo no permitido")

            extension = archivo.filename.rsplit(".", 1)[-1]
            nombre_unico = f"{uuid.uuid4()}.{extension}"
            ruta = os.path.join("static/facturas", nombre_unico)
            os.makedirs("static/facturas", exist_ok=True)

            with open(ruta, "wb") as f:
                f.write(await archivo.read())

            factura_url = f"/static/facturas/{nombre_unico}"

        insumo_data = InsumoCreate(
            nombre_producto=nombre_producto,
            cantidad=cantidad,
            unid_medida_id=unid_medida_id,
            precio_unitario=precio_unitario,
            min_stock=min_stock,
            fecha_ingreso=fecha_ingreso,
            fecha_vencimiento=fecha_vencimiento,
            tipo_id=tipo_id,
        )

        id_insumo = crud_insumos.create_insumo(
            db=db,
            insumo=insumo_data,
            factura_url=factura_url,
            fecha_compra=fecha_compra,
            usuario_id=current_user.id_user,
        )

        return {"message": "Insumo registrado correctamente", "id_insumo": id_insumo}

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/factura_by_id/{id_insumo}")
def get_factura_by_id(
    id_insumo: int, 
    db: Session = Depends(get_db), 
    user_token: UserOut = Depends(get_current_user)):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")

        factura = crud_insumos.get_factura_by_id(db, id_insumo)
        if not factura:
            raise HTTPException(status_code=404, detail="Factura no encontrada")
        return factura
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/by-id/", response_model=InsumoOut)
def get_insumo_by_id(id_insumo: int, 
              db: Session = Depends(get_db),
              user_token: UserOut = Depends(get_current_user)
              ):
    try:
        id_rol=user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        insumo = crud_insumos.get_insumo_by_id(db, id_insumo)
        if not insumo:
            raise HTTPException(status_code=404, detail="Insumo no encontrado")
        return insumo
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/all_insumos", response_model=List[InsumoOut])
def get_all_insumos(
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, "seleccionar"):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")

        insumos = crud_insumos.get_all_insumos(db)
        return insumos
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reporte/{inv_insumo_id}")
def get_reporte_insumo(
    inv_insumo_id: int,
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
            raise HTTPException(status_code=401, detail='Usuario no autorizado')

        reporte = crud_insumos.get_reporte_insumo_detallado(db, inv_insumo_id)
        if not reporte:
            raise HTTPException(status_code=404, detail="Insumo no encontrado")
        return reporte
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/reporte/{inv_insumo_id}/excel")
def exportar_reporte_insumo_excel(
    inv_insumo_id: int,
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
            raise HTTPException(status_code=401, detail='Usuario no autorizado')

        reporte = crud_insumos.get_reporte_insumo_detallado(db, inv_insumo_id)
        if not reporte:
            raise HTTPException(status_code=404, detail="Insumo no encontrado")

        buffer = generar_excel_reporte_insumo(reporte)
        return StreamingResponse(
            buffer,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="reporte_insumo_{inv_insumo_id}.xlsx"'}
        )
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reporte/{inv_insumo_id}/pdf")
def exportar_reporte_insumo_pdf(
    inv_insumo_id: int,
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
            raise HTTPException(status_code=401, detail='Usuario no autorizado')

        reporte = crud_insumos.get_reporte_insumo_detallado(db, inv_insumo_id)
        if not reporte:
            raise HTTPException(status_code=404, detail="Insumo no encontrado")

        buffer = generar_pdf_reporte_insumo(reporte)
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="reporte_insumo_{inv_insumo_id}.pdf"'}
        )
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/update_by_id/{id_insumo}")
def update_insumo(
    id_insumo: int,
    insumo: InsumoUpdate,
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'actualizar'):
            raise HTTPException(status_code=401, detail='Usuario no autorizado')
        
        crud_insumos.update_insumo_by_id(db, id_insumo, insumo)
        return {"message": "Insumo actualizado correctamente"}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/rango-fechas", response_model=Paginatedinsumos)
def obtener_insumos_por_rango_fechas(
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
        
        insumos = crud_insumos.get_insumos_by_date_range(db, fecha_inicio, fecha_fin)

        if not insumos:
            raise HTTPException(status_code=404, detail="No hay registro(s) de insumos en ese rango de fechas")

        # Aplicar paginación manualmente a los resultados filtrados
        total = len(insumos)
        skip = (page - 1) * page_size
        end_index = skip + page_size
        
        # Obtener solo la página solicitada
        insumos_paginados = insumos[skip:end_index]
        
        return Paginatedinsumos(
            page=page,
            page_size=page_size,
            total_insumos=total,
            total_pages=(total + page_size - 1) // page_size,
            insumos=insumos_paginados
        )

    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener los registros de los insumos: {e}")

@router.get("/insumos_paginated", response_model=Paginatedinsumos)
def get_paginated_insumos(
    page: int = 1,
    page_size: int = 10,
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, "seleccionar"):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        skip = (page - 1) * page_size
        data = crud_insumos.get_insumos_paginated(db, skip=skip, limit=page_size)

        total = data["total"]
        insumos = data["insumos"]
        
        return Paginatedinsumos(
            page= page,
            page_size= page_size,
            total_insumos= total,
            total_pages= (total + page_size - 1) // page_size,
            insumos= insumos
        )
        
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))