from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query # type: ignore
from sqlalchemy.orm import Session # type: ignore
from app.crud.permisos import verify_permissions
from app.router.dependencies import get_current_user
from app.core.database import get_db
from app.schemas.maquinaria import MaquinariaCreate, MaquinariaUpdate, MaquinariaOut, PaginatedMaquinarias
from app.crud import maquinas as crud_maquinas
from app.schemas.users import UserOut
from sqlalchemy.exc import SQLAlchemyError # type: ignore
from fastapi.responses import StreamingResponse  #type: ignore
# from app.utils.exportar_reportes import generar_excel_reporte_maquina, generar_pdf_reporte_maquina

router = APIRouter()
modulo = 17

@router.post("/crear", status_code=status.HTTP_201_CREATED)
def create_maquina(
    maquina: MaquinariaCreate, 
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'insertar'):
            raise HTTPException(status_code=401, detail= 'Usuario no autorizado')

        crud_maquinas.create_maquina(db, maquina)
        return {"message": "Máquina registrada correctamente"}
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/by-id")
def get_maquina_by_id(id: int, 
              db: Session = Depends(get_db),
              user_token: UserOut = Depends(get_current_user)
              ):
    try:
        id_rol=user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        maquina = crud_maquinas.get_maquina_by_id(db, id)
        if not maquina:
            raise HTTPException(status_code=404, detail="Máquina no encontrada")
        return maquina
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/all_maquinas", response_model=List[MaquinariaOut])
def get_all_maquina(
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, "seleccionar"):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        maquinas = crud_maquinas.all_maquina(db)
        return maquinas
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.put("/update/{id_maquina}")
def update_maquina(
    id_maquina: int,
    maquina: MaquinariaUpdate,
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'actualizar'):
            raise HTTPException(status_code=401, detail='Usuario no autorizado')
        
        success = crud_maquinas.update_maquina(db, id_maquina, maquina)
        if not success:
            raise HTTPException(status_code=400, detail="No se pudo actualizar la máquina")
        return {"message": "Máquina actualizada correctamente"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

# @router.get("/rango-fechas", response_model=PaginatedMaquinarias)
# def obtener_maquina_por_rango_fechas(
#     fecha_inicio: str = Query(..., description="Fecha inicial en formato YYYY-MM-DD"),
#     fecha_fin: str = Query(..., description="Fecha final en formato YYYY-MM-DD"),
#     page: int = Query(1, ge=1),
#     page_size: int = Query(10, ge=1, le=100),
#     db: Session = Depends(get_db),
#     user_token: UserOut = Depends(get_current_user)
# ):
#     try:
#         id_rol = user_token.rol_id
#         if not verify_permissions(db, id_rol, modulo, "seleccionar"):
#             raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
#         maquina = crud_maquinas.get_maquina_by_date_range(db, fecha_inicio, fecha_fin)

#         if not maquina:
#             raise HTTPException(status_code=404, detail="No hay registro(s) de producción en ese rango de fechas")

#         # Aplicar paginación manualmente a los resultados filtrados
#         total = len(maquina)
#         skip = (page - 1) * page_size
#         end_index = skip + page_size
        
#         # Obtener solo la página solicitada
#         maquina_paginados = maquina[skip:end_index]
        
#         return PaginatedMaquinarias(
#             page=page,
#             page_size=page_size,
#             total_maquina=total,
#             total_pages=(total + page_size - 1) // page_size,
#             maquina=maquina_paginados
#         )

#     except SQLAlchemyError as e:
#         raise HTTPException(status_code=500, detail=f"Error al obtener los registros de producción: {e}")

# @router.get("/reporte/{inv_prod_id}")
# def get_reporte_maquina(
#     inv_prod_id: int,
#     db: Session = Depends(get_db),
#     user_token: UserOut = Depends(get_current_user)
# ):
#     try:
#         id_rol = user_token.rol_id
#         if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
#             raise HTTPException(status_code=401, detail='Usuario no autorizado')

#         reporte = crud_maquinas.get_reporte_maquina_detallado(db, inv_prod_id)
#         if not reporte:
#             raise HTTPException(status_code=404, detail="Producción no encontrada")
#         return reporte
#     except HTTPException:
#         raise
#     except SQLAlchemyError as e:
#         raise HTTPException(status_code=500, detail=str(e))

# @router.get("/reporte/{inv_prod_id}/excel")
# def exportar_reporte_maquina_excel(
#     inv_prod_id: int,
#     db: Session = Depends(get_db),
#     user_token: UserOut = Depends(get_current_user)
# ):
#     try:
#         id_rol = user_token.rol_id
#         if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
#             raise HTTPException(status_code=401, detail='Usuario no autorizado')

#         reporte = crud_maquinas.get_reporte_maquina_detallado(db, inv_prod_id)
#         if not reporte:
#             raise HTTPException(status_code=404, detail="Producción no encontrada")

#         buffer = generar_excel_reporte_maquina(reporte)
#         return StreamingResponse(
#             buffer,
#             media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
#             headers={"Content-Disposition": f'attachment; filename="reporte_maquina_{inv_prod_id}.xlsx"'}
#         )
#     except HTTPException:
#         raise
#     except SQLAlchemyError as e:
#         raise HTTPException(status_code=500, detail=str(e))

# @router.get("/reporte/{inv_prod_id}/pdf")
# def exportar_reporte_maquina_pdf(
#     inv_prod_id: int,
#     db: Session = Depends(get_db),
#     user_token: UserOut = Depends(get_current_user)
# ):
#     try:
#         id_rol = user_token.rol_id
#         if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
#             raise HTTPException(status_code=401, detail='Usuario no autorizado')

#         reporte = crud_maquinas.get_reporte_maquina_detallado(db, inv_prod_id)
#         if not reporte:
#             raise HTTPException(status_code=404, detail="Producción no encontrada")

#         buffer = generar_pdf_reporte_maquina(reporte)
#         return StreamingResponse(
#             buffer,
#             media_type="application/pdf",
#             headers={"Content-Disposition": f'attachment; filename="reporte_maquina_{inv_prod_id}.pdf"'}
#         )
#     except HTTPException:
#         raise
#     except SQLAlchemyError as e:
#         raise HTTPException(status_code=500, detail=str(e))


@router.get("/paginated-maquinas", response_model=PaginatedMaquinarias)
def get_maquina_paginated(
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
        data = crud_maquinas.get_maquina_paginated(db, skip=skip, limit=page_size)
        total = data["total"]
        maquina = data["maquinas"]
        total_pages = (total + page_size - 1) // page_size
        
        return PaginatedMaquinarias(
            page=page,
            page_size=page_size,
            total_maquinas=total,
            total_pages=total_pages,
            maquinas=maquina
        )
    except HTTPException:
        raise
    except Exception as e:
      raise HTTPException(status_code=500, detail=str(e))