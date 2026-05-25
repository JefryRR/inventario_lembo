from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.crud.permisos import verify_permissions
from app.router.dependencies import get_current_user
from app.core.database import get_db
from app.schemas.especies import EspecieCreate, EspecieUpdate, EspecieOut
from app.schemas.users import UserOut
from app.crud import especies as crud_especies
from sqlalchemy.exc import SQLAlchemyError

router = APIRouter()
modulo = 7

# Endpoint para crear un nuevo rol
@router.post("/crear", status_code=status.HTTP_201_CREATED)
def create_especie(
    especies: EspecieCreate, 
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        #Verficamos que tenga permisos
        id_rol = user_token.rol_id       
        if not verify_permissions(db, id_rol, modulo, 'insertar'):
            raise HTTPException(status_code=401, detail= 'Usuario no autorizado')
        
        crud_especies.create_especie(db, especies)
        return {"message": "Especie registrada correctamente"}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint para obtener un rol por su ID  
@router.get("/by-id",  response_model=EspecieOut)
def get_especie_by_id(id_especie: int, db: Session = Depends(get_db),
              user_token: UserOut = Depends(get_current_user)
              ):
    try:
        id_rol=user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        especie = crud_especies.get_especie_by_id(db, id_especie)
        if not especie:
            raise HTTPException(status_code=404, detail="especie no encontrada")
        return especie
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint para obtener todos los especies
@router.get("/all-especies", response_model=List[EspecieOut])
def get_all_especies(
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, "seleccionar"):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        especie = crud_especies.get_all_especies(db)
        
        if not especie:
            raise HTTPException(status_code=404, detail="No hay especies registradas o no se pudieron obtener")
        return especie

    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint para actualizar un rol por su ID   
@router.put("/by_id/{id_especie}")
def update_especies_by_id(id_especie: int, especie: EspecieUpdate, db: Session = Depends(get_db),
                user_token: UserOut = Depends(get_current_user)
                ):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'actualizar'):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        success = crud_especies.update_especie_by_id(db, id_especie, especie)
        if not success:
            raise HTTPException(status_code=400, detail="No se pudo actualizar la especie")
        return {"message": "especie actualizada correctamente"}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/paginated")
def get_all_especies_pag(
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
        data = crud_especies.get_all_especies_pag(db, skip=skip, limit=page_size)
        total = data["total"]  
        especies = data["especies"]
        
        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "especies": especies
        }
    except Exception as e:
      raise HTTPException(status_code=500, detail=str(e)) 
        