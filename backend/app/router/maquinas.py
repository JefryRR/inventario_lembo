from typing import List, Optional
from webbrowser import get
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
from app.utils.exportar_reportes import generar_excel_reporte_maquina, generar_pdf_reporte_maquina, generar_excel_reporte_general_maquina, generar_pdf_reporte_general_maquina

router = APIRouter()
modulo = 24

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

        crud_maquinas.create_maquina(db, maquina, user_token.id_user)
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
    
@router.get("/exportar/excel")
def exportar_maquinas_excel(
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
            raise HTTPException(status_code=401, detail='Usuario no autorizado')

        maquinas = crud_maquinas.all_maquina(db)
        if not maquinas:
            raise HTTPException(status_code=404, detail="No hay maquinas registradas")

        buffer = generar_excel_reporte_general_maquina(maquinas)
        return StreamingResponse(
            buffer,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": 'attachment; filename="reporte_maquinas.xlsx"'}
        )
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/exportar/pdf")
def exportar_maquinas_pdf(
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
            raise HTTPException(status_code=401, detail='Usuario no autorizado')

        maquinas = crud_maquinas.all_maquina(db)
        if not maquinas:
            raise HTTPException(status_code=404, detail="No hay maquinas registradas")

        buffer = generar_pdf_reporte_general_maquina(maquinas)
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": 'attachment; filename="reporte_maquinas.pdf"'}
        )
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/historial")
def get_historial_endpoint(
    id_maquina: int | None = None,
    page: int = 1,
    page_size: int = 10,
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    id_rol = user_token.rol_id
    if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
        raise HTTPException(status_code=401, detail='Usuario no autorizado')
    skip = (page - 1) * page_size
    return crud_maquinas.get_historial_maquina(db, id_maquina=id_maquina, skip=skip, limit=page_size)

@router.get("/reporte/{id_maquina}/excel")
def exportar_reporte_maquina_excel(
    id_maquina: int,
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
            raise HTTPException(status_code=401, detail='Usuario no autorizado')

        reporte = crud_maquinas.get_historial_maquina(db, id_maquina)
        if not reporte:
            raise HTTPException(status_code=404, detail="Máquina no encontrada")

        buffer = generar_excel_reporte_maquina(reporte)
        return StreamingResponse(
            buffer,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="reporte_maquina_{id_maquina}.xlsx"'}
        )
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reporte/{id_maquina}/pdf")
def exportar_reporte_maquina_pdf(
    id_maquina: int,
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
            raise HTTPException(status_code=401, detail='Usuario no autorizado')

        reporte = crud_maquinas.get_historial_maquina(db, id_maquina)
        if not reporte:
            raise HTTPException(status_code=404, detail="Máquina no encontrada")

        buffer = generar_pdf_reporte_maquina(reporte)
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="reporte_maquina_{id_maquina}.pdf"'}
        )
    except HTTPException:
        raise
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
        
        success = crud_maquinas.update_maquina(db, id_maquina, maquina, user_token.id_user)
        if not success:
            raise HTTPException(status_code=400, detail="No se pudo actualizar la máquina")
        return {"message": "Máquina actualizada correctamente"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/paginated-maquinas", response_model=PaginatedMaquinarias)
def get_maquina_paginated(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
): 
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
             raise HTTPException(status_code=401, detail= 'Usuario no autorizado')
         
        skip = (page - 1) * page_size
        data = crud_maquinas.get_maquina_paginated(db, skip=skip, limit=page_size, search=search)
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