from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.crud.permisos import verify_permissions
from app.router.dependencies import get_current_user
from app.core.database import get_db
from app.schemas.categorias import CategoriaCreate, CategoriaUpdate, CategoriaOut
from app.schemas.users import UserOut
from app.crud import categorias as crud_categorias
from sqlalchemy.exc import SQLAlchemyError

router = APIRouter()
modulo = 2

# Endpoint para crear un nuevo rol
@router.post("/crear", status_code=status.HTTP_201_CREATED)
def create_categoria(
    categoria: CategoriaCreate, 
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        #Verficamos que tenga permisos
        id_categoria = user_token.rol_id       
        if not verify_permissions(db, id_categoria, modulo, 'insertar'):
            raise HTTPException(status_code=401, detail= 'Usuario no autorizado')
        
        crud_categorias.create_categoria(db, categoria)
        return {"message": "Categoria registrada correctamente"}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint para obtener un rol por su ID  
@router.get("/by-id",  response_model=CategoriaOut)
def get_categoria_by_id(id: int, db: Session = Depends(get_db),
              user_token: UserOut = Depends(get_current_user)
              ):
    try:
        id_categoria=user_token.rol_id
        if not verify_permissions(db, id_categoria, modulo, 'seleccionar'):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        categoria = crud_categorias.get_categoria_by_id(db, id)
        if not categoria:
            raise HTTPException(status_code=404, detail="categoria no encontrada")
        return categoria
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint para obtener todos los categoria
@router.get("/all-categorias", response_model=List[CategoriaOut])
def get_all_categoria(
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_categoria = user_token.rol_id
        if not verify_permissions(db, id_categoria, modulo, "seleccionar"):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        categoria = crud_categorias.get_all_categorias(db)
        
        if not categoria:
            raise HTTPException(status_code=404, detail="No hay categorias registradas o no se pudieron obtener")
        return categoria

        
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint para actualizar un rol por su ID   
@router.put("/by_id/{id_categoria}")
def update_categoria_by_id(id_categoria: int, categoria: CategoriaUpdate, db: Session = Depends(get_db),
                user_token: UserOut = Depends(get_current_user)
                ):
    try:
        id_categoria = user_token.rol_id
        if not verify_permissions(db, id_categoria, modulo, 'actualizar'):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        success = crud_categorias.update_categoria_by_id(db, id_categoria, categoria)
        if not success:
            raise HTTPException(status_code=400, detail="No se pudo actualizar la categoria")
        return {"message": "Categoria actualizada correctamente"}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))
