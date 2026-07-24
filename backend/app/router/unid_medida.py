from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.crud.permisos import verify_permissions
from app.router.dependencies import get_current_user
from app.core.database import get_db
from app.schemas.unid_medidas import Unid_medCreate, Unid_medUpdate, Unid_medOut
from app.schemas.users import UserOut
from app.crud import unid_medida as crud_unid_medidas
from sqlalchemy.exc import SQLAlchemyError

router = APIRouter()
modulo = 18

# Aquí se definen las rutas para el CRUD de unidades de medida, incluyendo creación, obtención por ID, actualización y obtención paginada. 
# Cada ruta verifica los permisos del usuario antes de realizar la operación correspondiente.

# Endpoint para crear una nueva unid de medida 
@router.post("/crear", status_code=status.HTTP_201_CREATED)
def create_unid_medida(
    unid_medida: Unid_medCreate, 
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user)
):
    try:
        #Verficamos que tenga permisos
        id_rol = user_token.rol_id       
        if not verify_permissions(db, id_rol, modulo, 'insertar'):
            raise HTTPException(status_code=401, detail= 'Usuario no autorizado')
        
        crud_unid_medidas.create_unid_medida(db, unid_medida)
        return {"message": "unidad de medida registrada correctamente"}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/get_by-id",  response_model=Unid_medOut)
def get_unid_medida_by_id(id: int, db: Session = Depends(get_db),
              user_token: UserOut = Depends(get_current_user)
              ):
    try:
        id_rol=user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'seleccionar'):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        unid_medida = crud_unid_medidas.get_unid_medida_by_id(db, id)
        if not unid_medida:
            raise HTTPException(status_code=404, detail="unidad de medida no encontrada")
        return unid_medida
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint para obtener todos los unid_medida
@router.get("/all-unid_medidas")
def get_all_unid_medida(
    db: Session = Depends(get_db),
    user_token: UserOut = Depends(get_current_user),
):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, "seleccionar"):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        unid_medida = crud_unid_medidas.get_all_unid_medidas(db)
        
        if not unid_medida:
            raise HTTPException(status_code=404, detail="No hay unidades de medida registradas o no se pudieron obtener")
        return unid_medida

        
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/by_id/{id_unid_medida}")
def update_unid_medida_by_id(id_unid_medida: int, unid_medida: Unid_medUpdate, db: Session = Depends(get_db),
                user_token: UserOut = Depends(get_current_user)
                ):
    try:
        id_rol = user_token.rol_id
        if not verify_permissions(db, id_rol, modulo, 'actualizar'):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        success = crud_unid_medidas.update_unid_medida_by_id(db, id_unid_medida, unid_medida)
        if not success:
            raise HTTPException(status_code=400, detail="No se pudo actualizar la unidad de medida")
        return {"message": "Unidad de medida actualizada correctamente"}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))
