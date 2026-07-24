from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.crud.permisos import verify_permissions
from app.router.dependencies import get_current_user
from app.core.database import get_db
from app.schemas.categorias import CategoriaCreate, CategoriaUpdate, CategoriaOut, PaginatedCategorias
from app.schemas.users import UserOut
from app.crud import categorias as crud_categorias
from sqlalchemy.exc import SQLAlchemyError

router = APIRouter()
modulo = 6

# Aquí se definen las rutas para el CRUD de categorías, incluyendo creación, obtención por ID, actualización y obtención paginada.
# Cada ruta verifica los permisos del usuario antes de realizar la operación correspondiente.

@router.post("/crear", status_code=status.HTTP_201_CREATED)
def create_categoria(
    categoria: CategoriaCreate, 
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        #Verficamos que tenga permisos
        id_rol = user_token.rol_id       
        if not verify_permissions(db, id_rol, modulo, 'insertar'):
            raise HTTPException(status_code=401, detail= 'Usuario no autorizado')
        
        crud_categorias.create_categoria(db, categoria)
        return {"message": "Categoria registrada correctamente"}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint para obtener una categoria por su ID
@router.get("/by-id",  response_model=CategoriaOut)
def get_categoria_by_id(id: int, db: Session = Depends(get_db),
              user_token: UserOut = Depends(get_current_user)
              ):
    try:
        id_rol=user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        categoria = crud_categorias.get_categoria_by_id(db, id)
        if not categoria:
            raise HTTPException(status_code=404, detail="categoria no encontrada")
        return categoria
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint para obtener todas las categorias
@router.get("/all-categorias", response_model=List[CategoriaOut])
def get_all_categoria(
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, "seleccionar"):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        categoria = crud_categorias.get_all_categorias(db)
        
        if not categoria:
            raise HTTPException(status_code=404, detail="No hay categorias registradas o no se pudieron obtener")
        return categoria

        
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint para actualizar una categoria por su ID  
@router.put("/by_id/{id_categoria}")
def update_categoria_by_id(id_categoria: int, categoria: CategoriaUpdate, db: Session = Depends(get_db),
                user_token: UserOut = Depends(get_current_user)
                ):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'actualizar'):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        success = crud_categorias.update_categoria_by_id(db, id_categoria, categoria)
        if not success:
            raise HTTPException(status_code=400, detail="No se pudo actualizar la categoria")
        return {"message": "Categoria actualizada correctamente"}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint para obtener todas las categorias de manera paginada
@router.get("/paginated", response_model=PaginatedCategorias)
def get_all_categorias_pag(
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
        data = crud_categorias.get_all_categorias_pag(db, skip=skip, limit=page_size)
        total = data["total"]  
        categorias = data["categorias"]
        
        return PaginatedCategorias(
            page= page,
            page_size= page_size,
            total_categorias= total,
            total_pages= (total + page_size - 1) // page_size,
            categorias= categorias
        )
    except Exception as e:
      raise HTTPException(status_code=500, detail=str(e))