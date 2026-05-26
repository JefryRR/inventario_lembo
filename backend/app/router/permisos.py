from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from typing import List
from app.schemas.permisos import PermisoCreate, PermisoOut, PermisoUpdate, PaginatedPermisos
from app.crud import modulo_permisos as modulo_permisos
from app.crud.permisos import verify_permissions  # tu función actual de verificación
from app.schemas.users import UserOut
from app.router.dependencies import get_current_user
from app.core.database import get_db

router = APIRouter()
modulo = 1  # ID asignados

# Crear permiso
@router.post("/crear", status_code=status.HTTP_201_CREATED)
def create_permiso(
    permiso_data: PermisoCreate,
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    # Verificamos que el usuario tenga permisos para crear permisos
    id_rol = user_token.rol_id
    if not verify_permissions(db, id_rol, modulo, 'insertar'):
        raise HTTPException(status_code=401, detail="Usuario no autorizado para crear permisos")
    try:
        # Se registra el nuevo permiso usando la función del CRUD, 
        # también verifica si el permiso ya existe para evitar duplicados
        modulo_permisos.create_permiso(db, permiso_data)
        return {"message": "Permiso creado correctamente"}
    except Exception as e:
        if "permiso_existe" in str(e):
            raise HTTPException(status_code=409, detail="Este permiso ya existe")
        raise HTTPException(status_code=500, detail=str(e))
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

# Obtener todos los permisos
@router.get("/all-permisos", response_model=List[PermisoOut])
def get_all_permisos(
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    # Verificamos que el usuario tenga permisos para ver los permisos
    id_rol = user_token.rol_id
    if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
        raise HTTPException(status_code=401, detail="Usuario no autorizado para ver permisos")
    try:
    # Obtenemos todos los permisos usando la función del CRUD
        permisos = modulo_permisos.get_all_permisos(db)
        return permisos
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

# Obtener permiso por id_modulo e id_rol
@router.get("/{id_modulo}/{id_rol}", response_model=PermisoOut)
def get_permiso_by_id(
    id_modulo: int,
    id_rol: int,
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    #Verificamos que el usuario tenga permisos para ver los permisos
    id_rol_user = user_token.rol_id
    if not verify_permissions(db, id_rol_user, modulo, 'seleccionar'):
        raise HTTPException(status_code=401, detail="Usuario no autorizado para ver permisos")
    try:
    # Obtenemos el permiso por id_modulo e id_rol usando la función del CRUD
        permiso = modulo_permisos.get_permiso_by_id(db, id_modulo, id_rol)
        if not permiso:
            raise HTTPException(status_code=404, detail="Permiso no encontrado")
        return permiso
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

# Actualizar permiso
@router.put("/update/{id_modulo}/{id_rol}")
def update_permiso(
    id_modulo: int,
    id_rol: int,
    permiso_data: PermisoUpdate,
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    # Verificamos que el usuario tenga permisos para actualizar permisos
    id_rol_user = user_token.rol_id
    if not verify_permissions(db, id_rol_user, modulo, 'actualizar'):
        raise HTTPException(status_code=401, detail="Usuario no autorizado para actualizar permisos")
    try:
        success = modulo_permisos.update_permiso(db, id_modulo, id_rol, permiso_data)
        if not success:
            raise HTTPException(status_code=404, detail="Permiso no encontrado")
        return {"message": "Permiso actualizado correctamente"}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

#Endpoint para la paginación
@router.get("/all_permisos-pag", response_model=PaginatedPermisos)
def get_all_permisos_pag(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
): 
    try:
        #Verificamos permisos        
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        # Calculamos el número de registros a saltar para la paginación
        skip = (page - 1) * page_size
        data = modulo_permisos.get_all_permisos_pag(
            db,
            skip=skip,
            limit=page_size,
        )

        total = data["total"]  
        permisos = data["permisos"]
    # Devolvemos la respuesta con la estructura de paginación personalizada
        return PaginatedPermisos(
            page= page,
            page_size= page_size,
            total_permisos= total,
            total_pages= (total + page_size - 1) // page_size,
            permisos= permisos
        )
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))