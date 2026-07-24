from fastapi import APIRouter, Depends, HTTPException, status, Query 
from sqlalchemy.orm import Session  
from app.core.database import get_db
from app.router.dependencies import get_current_user
from app.crud.permisos import verify_permissions
from app.schemas.tratamiento import TratamientoCreate, TratamientoUpdate, TratamientoOut, PaginatedTratamientos
from app.schemas.users import UserOut
from app.crud import tratamiento as crud_tratamiento
from sqlalchemy.exc import SQLAlchemyError 
from fastapi.responses import StreamingResponse   
from app.utils.exportar_reportes import generar_excel_reporte_tratamientos, generar_pdf_reporte_tratamientos
from typing import Optional

router = APIRouter()
modulo = 16

# Aquí se definen las rutas para el CRUD de tratamientos medicos, incluyendo creación, obtención por ID, actualización y obtención paginada. 
# Cada ruta verifica los permisos del usuario antes de realizar la operación correspondiente.

@router.post("/create", status_code=status.HTTP_201_CREATED)
def create_tratamiento(tratamiento: TratamientoCreate, db: Session = Depends(get_db),
                      user_token: UserOut = Depends(get_current_user)
                      ):
    try:
        id_rol = user_token.rol_id
        
        if not verify_permissions(db, id_rol, modulo, 'insertar'):
           raise HTTPException(status_code=401, detail= 'Usuario no autorizado')
        
        crud_tratamiento.create_tratamiento(db, tratamiento, user_token.id_user)
        return {"message": "Registro de tratamiento creado correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        mensaje_error = str(e)
        if "no hay suficiente stock" in mensaje_error.lower() or "inventario insuficiente" in mensaje_error.lower() or "No se puede crear el tratamiento" in mensaje_error:
            raise HTTPException(status_code=409, detail=mensaje_error)
        raise HTTPException(status_code=500, detail=mensaje_error)
   
@router.get("/all-tratamientos", response_model=list[TratamientoOut])
def get_all_tratamientos(db: Session = Depends(get_db),
            user_token: UserOut = Depends(get_current_user)
            ):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
             raise HTTPException(status_code=401, detail= 'Usuario no autorizado')
         
        tratamiento = crud_tratamiento.get_all_tratamientos(db)
        if not tratamiento:
          raise HTTPException(status_code=404, detail="Registros de tratamientos no encontrados")
        return tratamiento
    except Exception as e:
      raise HTTPException(status_code=500, detail=str(e))

@router.get("/by-id", response_model=TratamientoOut)
def get_tratamiento_by_id(id_tratamiento: int, db: Session = Depends(get_db),
            user_token: UserOut = Depends(get_current_user)
            ):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
             raise HTTPException(status_code=401, detail= 'Usuario no autorizado')
         
        tratamiento = crud_tratamiento.get_tratamiento_by_id(db, id_tratamiento)
        if not tratamiento:
          raise HTTPException(status_code=404, detail="Registro de tratamiento no encontrado")
        return tratamiento
    except Exception as e:
      raise HTTPException(status_code=500, detail=str(e))

# Rutas para exportar los registros de tratamientos a Excel
@router.get("/exportar/excel")
def exportar_tratamientos_excel(
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
            raise HTTPException(status_code=401, detail='Usuario no autorizado')

        tratamientos = crud_tratamiento.get_all_tratamientos(db)
        if not tratamientos:
            raise HTTPException(status_code=404, detail="No hay tratamientos registrados")

        buffer = generar_excel_reporte_tratamientos(tratamientos)
        return StreamingResponse(
            buffer,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": 'attachment; filename="reporte_tratamientos.xlsx"'}
        )
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

# Rutas para exportar los registros de tratamientos a PDF
@router.get("/exportar/pdf")
def exportar_tratamientos_pdf(
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
            raise HTTPException(status_code=401, detail='Usuario no autorizado')

        tratamientos = crud_tratamiento.get_all_tratamientos(db)
        if not tratamientos:
            raise HTTPException(status_code=404, detail="No hay tratamientos registrados")

        buffer = generar_pdf_reporte_tratamientos(tratamientos)
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": 'attachment; filename="reporte_tratamientos.pdf"'}
        )
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/by-id/{tratamiento_id}")
def update_tratamiento_by_id( id_tratamiento: int, tratamiento: TratamientoUpdate, db: Session = Depends(get_db),
                      user_token: UserOut = Depends(get_current_user)
                      ):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'actualizar'):
             raise HTTPException(status_code=401, detail= 'Usuario no autorizado')

        success = crud_tratamiento.update_tratamiento_by_id(db, id_tratamiento, tratamiento)
        if not success:
            raise HTTPException(status_code=400, detail="No se pudo actualizar el registro de tratamiento")
        return {"message": "Registro de tratamiento actualizado correctamente"}
    except Exception as e:
      raise HTTPException(status_code=500, detail=str(e))

@router.get("/paginated", response_model=PaginatedTratamientos)
def get_all_tratamientos_pag(
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
        data = crud_tratamiento.get_all_tratamientos_pag(db, skip=skip, limit=page_size, search=search)
        total = data["total"]  
        tratamiento = data["tratamientos"]
        
        return PaginatedTratamientos(
            page= page,
            page_size= page_size,
            total_tratamientos= total,
            total_pages= (total + page_size - 1) // page_size,
            tratamientos= tratamiento
        )
    except Exception as e:
      raise HTTPException(status_code=500, detail=str(e))