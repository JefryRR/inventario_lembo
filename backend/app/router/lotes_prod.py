from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.router.dependencies import get_current_user
from app.crud.permisos import verify_permissions
from app.schemas.lotes_prod import LoteCreate, LoteEstado, LoteOut, LoteUpdate
from app.schemas.users import UserOut
from app.crud import lotes_prod as crud_lotes_prod
from typing import Optional

router = APIRouter()
modulo = 5 # ID del módulo de lotes para verificar permisos

@router.post("/create", status_code=status.HTTP_201_CREATED)
def create_lote(lote: LoteCreate, db: Session = Depends(get_db),
                user_token: UserOut = Depends(get_current_user)
                ):
    try:
        id_rol = user_token.rol_id
        
        if not verify_permissions(db, id_rol, modulo, 'insertar'):
           raise HTTPException(status_code=401, detail= 'Usuario no autorizado')
        
        lote_id = crud_lotes_prod.create_lote(db, lote)
        return {"message": "Lote creado correctamente", "lote_id": lote_id}
    
    except Exception as e:
      raise HTTPException(status_code=500, detail=str(e))

@router.get("/all-lotes_prod")
def get_all_lotes_prod(db: Session = Depends(get_db),
            user_token: UserOut = Depends(get_current_user),
            estado: Optional[str] = None,
            ):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
             raise HTTPException(status_code=401, detail='Usuario no autorizado')
         
        lote = crud_lotes_prod.get_all_lotes(db, estado)
        if not lote:
          raise HTTPException(status_code=404, detail="Lotes no encontrados")
        return lote
    except Exception as e:
      raise HTTPException(status_code=500, detail=str(e))
     
@router.get("/by-id", response_model=LoteOut)
def get_lote_by_id(lote_id: int, db: Session = Depends(get_db),
            user_token: UserOut = Depends(get_current_user)
            ):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
             raise HTTPException(status_code=401, detail= 'Usuario no autorizado')
         
        lote = crud_lotes_prod.get_lote_by_id(db, lote_id)
        if not lote:
          raise HTTPException(status_code=404, detail="Lote no encontrado")
        return lote
    except Exception as e:
      raise HTTPException(status_code=500, detail=str(e))

@router.get("/history_by-id")
def get_historial_by_id(id_lote_p: int, db: Session = Depends(get_db),
            user_token: UserOut = Depends(get_current_user)
            ):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
             raise HTTPException(status_code=401, detail= 'Usuario no autorizado')
         
        history_status = crud_lotes_prod.get_historial_by_id(db, id_lote_p)
        if not history_status:
          raise HTTPException(status_code=404, detail="Lote no encontrado")
        return history_status
    except Exception as e:
      raise HTTPException(status_code=500, detail=str(e))

@router.put("/by-id/{lote_id}")
def update_lote_by_id( id_lote: int, lote: LoteUpdate, db: Session = Depends(get_db),
                      user_token: UserOut = Depends(get_current_user)
                      ):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'actualizar'):
             raise HTTPException(status_code=401, detail= 'Usuario no autorizado')

        success = crud_lotes_prod.update_lote_by_id(db, id_lote, lote)
        if not success:
            raise HTTPException(status_code=400, detail="No se pudo actualizar el lote")
        return {"message": "Lote actualizado correctamente"}
    except Exception as e:
      raise HTTPException(status_code=500, detail=str(e))

@router.put("/estado/{lote_id}", status_code=status.HTTP_200_OK)
def change_status_lote(id_lote: int, estado: LoteEstado, db: Session = Depends(get_db),
                      user_token: UserOut = Depends(get_current_user)
                      ):
  try:
      id_rol = user_token.rol_id
      if not verify_permissions(db, id_rol, modulo, 'actualizar'):
             raise HTTPException(status_code=401, detail= 'Usuario no autorizado')

      success = crud_lotes_prod.change_status_lote(db, id_lote, estado=estado, usuario_id=user_token.id_user)
      if not success:
          raise HTTPException(status_code=400, detail="No se pudo cambiar el estado del lote")
      return {"message": "Estado del lote actualizado correctamente"}
  except Exception as e:
      raise HTTPException(status_code=500, detail=str(e))

@router.get("/paginated")
def get_all_lotes_prod_pag(
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
        data = crud_lotes_prod.get_all_lotes_prod_pag(db, skip=skip, limit=page_size)
        total = data["total"]  
        lotes = data["lotes"]
        
        return {
            "total_lotes": total,
            "page": page,
            "page_size": page_size,
            "lotes": lotes
        }
    except Exception as e:
      raise HTTPException(status_code=500, detail=str(e))