from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.router.dependencies import get_current_user
from app.crud.permisos import verify_permissions
from app.schemas.mortalidad import MortalidadCreate, MortalidadUpdate, PaginatedMortalidad, MortalidadOut
from app.schemas.users import UserOut
from app.crud import mortalidad as crud_mortalidad

router = APIRouter()
modulo = 3 # ID del módulo de lotes para verificar permisos

@router.post("/create", status_code=status.HTTP_201_CREATED)
def create_mortalidad(mortalidad: MortalidadCreate, db: Session = Depends(get_db),
                      user_token: UserOut = Depends(get_current_user)
                      ):
    try:
        id_rol = user_token.rol_id
        
        if not verify_permissions(db, id_rol, modulo, 'insertar'):
           raise HTTPException(status_code=401, detail= 'Usuario no autorizado')
        
        crud_mortalidad.create_lote(db, mortalidad)
        return {"message": "Registro de mortalidad creado correctamente"}
    
    except Exception as e:
      raise HTTPException(status_code=500, detail=str(e))

@router.get("/all-mortalidad")
def get_all_mortalidad(db: Session = Depends(get_db),
            user_token: UserOut = Depends(get_current_user)
            ):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
             raise HTTPException(status_code=401, detail= 'Usuario no autorizado')
         
        mortalidad = crud_mortalidad.get_all_mortalidad(db)
        if not mortalidad:
          raise HTTPException(status_code=404, detail="Registros de mortalidad no encontrados")
        return mortalidad
    except Exception as e:
      raise HTTPException(status_code=500, detail=str(e))
  
@router.get("/by-id", response_model=MortalidadOut)
def get_mortalidad_by_id(id_mortalidad: int, db: Session = Depends(get_db),
            user_token: UserOut = Depends(get_current_user)
            ):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
             raise HTTPException(status_code=401, detail= 'Usuario no autorizado')
         
        mortalidad = crud_mortalidad.get_mortalidad_by_id(db, id_mortalidad)
        if not mortalidad:
          raise HTTPException(status_code=404, detail="Registro de mortalidad no encontrado")
        return mortalidad
    except Exception as e:
      raise HTTPException(status_code=500, detail=str(e))

@router.put("/by-id/{mortalidad_id}")
def update_mortalidad_by_id( id_mortalidad: int, mortalidad: MortalidadUpdate, db: Session = Depends(get_db),
                      user_token: UserOut = Depends(get_current_user)
                      ):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'actualizar'):
             raise HTTPException(status_code=401, detail= 'Usuario no autorizado')

        success = crud_mortalidad.update_mortalidad_by_id(db, id_mortalidad, mortalidad)
        if not success:
            raise HTTPException(status_code=400, detail="No se pudo actualizar el registro de mortalidad")
        return {"message": "Registro de mortalidad actualizado correctamente"}
    except Exception as e:
      raise HTTPException(status_code=500, detail=str(e))


@router.get("/paginated", response_model=PaginatedMortalidad)
def get_all_mortalidad_pag(
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
        data = crud_mortalidad.get_all_mortalidad_prod_pag(db, skip=skip, limit=page_size)
        total = data["total"]  
        mortalidad = data["mortalidad"]
        
        return PaginatedMortalidad(
            page= page,
            page_size= page_size,
            total_mortalidad= total,
            total_pages= (total + page_size - 1) // page_size,
            mortalidad= mortalidad
        )
    except Exception as e:
      raise HTTPException(status_code=500, detail=str(e))