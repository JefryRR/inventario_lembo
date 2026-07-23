from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.router.dependencies import get_current_user
from app.crud.permisos import verify_permissions
from app.schemas.alimento_prod import AlimentoCreate, AlimentoUpdate, AlimentoOut, PaginatedAlimentos
from app.schemas.users import UserOut
from app.crud import alimento_prod as crud_alimento_prod
from typing import Optional

router = APIRouter()
modulo = 14 # ID del módulo de lotes para verificar permisos

@router.post("/create", status_code=status.HTTP_201_CREATED)
def create_alimento(alimento: AlimentoCreate, db: Session = Depends(get_db),
                      user_token: UserOut = Depends(get_current_user)
                      ):
    try:
        id_rol = user_token.rol_id
 
        if not verify_permissions(db, id_rol, modulo, 'insertar'):
           raise HTTPException(status_code=401, detail= 'Usuario no autorizado')
 
        crud_alimento_prod.create_alimento(db, alimento)
        return {"message": "Registro de alimento creado correctamente"}
 
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/all-alimentos")
def get_all_alimentos(db: Session = Depends(get_db),
            user_token: UserOut = Depends(get_current_user)
            ):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
             raise HTTPException(status_code=401, detail= 'Usuario no autorizado')
         
        alimento = crud_alimento_prod.get_all_alimentos(db)
        if not alimento:
          raise HTTPException(status_code=404, detail="Registros de alimentos no encontrados")
        return alimento
    except Exception as e:
      raise HTTPException(status_code=500, detail=str(e))

@router.get("/by-id", response_model=AlimentoOut)
def get_alimento_by_id(id_alimento: int, db: Session = Depends(get_db),
            user_token: UserOut = Depends(get_current_user)
            ):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
             raise HTTPException(status_code=401, detail= 'Usuario no autorizado')
         
        alimento = crud_alimento_prod.get_alimento_by_id(db, id_alimento)
        if not alimento:
          raise HTTPException(status_code=404, detail="Registro de alimento no encontrado")
        return alimento
    except Exception as e:
      raise HTTPException(status_code=500, detail=str(e))

@router.put("/by-id/{alimento_id}")
def update_alimento_by_id(id_alimento: int, alimento: AlimentoUpdate, db: Session = Depends(get_db),
                      user_token: UserOut = Depends(get_current_user)
                      ):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'actualizar'):
             raise HTTPException(status_code=401, detail= 'Usuario no autorizado')
 
        success = crud_alimento_prod.update_alimento_by_id(db, id_alimento, alimento)
        if not success:
            raise HTTPException(status_code=400, detail="No se pudo actualizar el registro de alimento")
        return {"message": "Registro de alimento actualizado correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/paginated", response_model=PaginatedAlimentos)
def get_all_alimentos_pag(
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
        data = crud_alimento_prod.get_all_alimentos_pag(db, skip=skip, limit=page_size, search=search)
        total = data["total"]  
        alimento = data["alimentos"]
        
        return PaginatedAlimentos(
            page= page,
            page_size= page_size,
            total_alimentos= total,
            total_pages= (total + page_size - 1) // page_size,
            alimentos= alimento
        )
    except Exception as e:
      raise HTTPException(status_code=500, detail=str(e))