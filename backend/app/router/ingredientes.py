from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.crud.permisos import verify_permissions
from app.router.dependencies import get_current_user
from app.core.database import get_db
from app.schemas.ingredientes import IngredienteCreate, IngredienteUpdate, IngredienteOut, IngredientesPaginated
from app.schemas.users import UserOut
from app.crud import ingredientes as crud_ingredientes
from sqlalchemy.exc import SQLAlchemyError

router = APIRouter()
modulo = 21

# Aquí se definen las rutas para el CRUD de ingredientes, incluyendo creación, obtención por ID, actualización y obtención paginada. 
# Cada ruta verifica los permisos del usuario antes de realizar la operación correspondiente.

@router.post("/crear", status_code=status.HTTP_201_CREATED)
def create_ingrediente(
    ingrediente: IngredienteCreate, 
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        #Verficamos que tenga permisos
        id_rol = user_token.rol_id       
        if not verify_permissions(db, id_rol, modulo, 'insertar'):
            raise HTTPException(status_code=401, detail= 'Usuario no autorizado')
        
        crud_ingredientes.create_ingrediente(db, ingrediente)
        return {"message": "Ingrediente registrado correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/by-id",  response_model=IngredienteOut)
def get_ingrediente_by_id(id: int, db: Session = Depends(get_db),
              user_token: UserOut = Depends(get_current_user)
              ):
    try:
        id_rol=user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        ingrediente = crud_ingredientes.get_ingrediente_by_id(db, id)
        if not ingrediente:
            raise HTTPException(status_code=404, detail="Ingrediente no encontrado")
        return ingrediente
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/all-ingredientes", response_model=List[IngredienteOut])
def get_all_ingredientes(
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, "seleccionar"):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        ingrediente = crud_ingredientes.all_ingredientes(db)
        
        if not ingrediente:
            raise HTTPException(status_code=404, detail="No hay ingredientes registrados o no se pudieron obtener")
        return ingrediente

        
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/by_id/{id_ingrediente}")
def update_ingrediente_by_id(id_ingrediente: int, ingrediente: IngredienteUpdate, db: Session = Depends(get_db),
                user_token: UserOut = Depends(get_current_user)
                ):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'actualizar'):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        success = crud_ingredientes.update_ingrediente_by_id(db, id_ingrediente, ingrediente)
        if not success:
            raise HTTPException(status_code=400, detail="No se pudo actualizar el ingrediente")
        return {"message": "Ingrediente actualizado correctamente"}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.delete("/by_id/{id_ingrediente}")
def delete_ingrediente_by_id(
    id_ingrediente: int, 
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)):
    
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'borrar'):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")

        success = crud_ingredientes.delete_ingrediente_by_id(db, id_ingrediente)
        if not success:
            raise HTTPException(status_code=400, detail="No se pudo eliminar el ingrediente")
        return {"message": "Ingrediente eliminado correctamente"}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/rango-fechas", response_model=IngredientesPaginated)
def obtener_ingredientes_por_rango_fechas(
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
        
        ingrediente = crud_ingredientes.get_ingredientes_by_date_range(db, fecha_inicio, fecha_fin)

        if not ingrediente:
            raise HTTPException(status_code=404, detail="No hay registro(s) de ingredientes en ese rango de fechas")

        # Aplicar paginación manualmente a los resultados filtrados
        total = len(ingrediente)
        skip = (page - 1) * page_size
        end_index = skip + page_size
        
        # Obtener solo la página solicitada
        ingrediente_paginados = ingrediente[skip:end_index]
        
        return IngredientesPaginated(
            page=page,
            page_size=page_size,
            total_ingredientes=total,
            total_pages=(total + page_size - 1) // page_size,
            ingredientes=ingrediente_paginados
        )

    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener los registros de los ingredientes: {e}")


@router.get("/ingredientes_pag", response_model=IngredientesPaginated)
def get_paginated_ingredientes(
    page: int = 1,
    page_size: int = 10,
    db: Session = Depends(get_db),
    search: Optional[str] = None,
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, "seleccionar"):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        skip = (page - 1) * page_size
        data = crud_ingredientes.get_ingredientes_paginated(db, skip=skip, limit=page_size, search=search)

        total = data["total"]
        ingredientes = data["ingredientes"]
        
        return IngredientesPaginated(
            page= page,
            page_size= page_size,
            total_ingredientes= total,
            total_pages= (total + page_size - 1) // page_size,
            ingredientes= ingredientes
        )
        
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))