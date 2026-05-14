from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from typing import Optional
from app.schemas.rols import RolCreate, RolUpdate

import logging

logger = logging.getLogger(__name__)

def create_roles(db: Session, rol: RolCreate) -> Optional[bool]:
    try:
        query = text("""
            INSERT INTO roles (
                nombre, descripcion,
                estado
            ) VALUES (
                :nombre, :descripcion,
                :estado
            )
        """)
        db.execute(query, rol.model_dump())
        db.commit()
        return True
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al crear el rol: {e}")
        raise Exception("Error de base de datos al crear el rol")
    
def get_rol_by_id(db: Session, id: int):
    try:
        query = text("""SELECT id_rol, nombre_rol, descripcion,
                     estado
                     FROM roles
                     WHERE id_rol = :id
                """)
        
        result = db.execute(query, {"id": id}).mappings().first()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener rol por id: {e}")
        raise Exception("Error de base de datos al obtener el rol")

def get_all_rol(db: Session):
    try:
        query = text("""SELECT
                     * FROM roles
                     """)
        result = db.execute(query).mappings().all()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener los roles: {e}")
        raise Exception("Error de base de datos al obtener los roles")
    
def update_rol_by_id(db: Session, id_rol: int, rol: RolUpdate) -> Optional[bool]:
    try:
        rol_data = rol.model_dump(exclude_unset=True)
        if not rol_data:
            raise Exception("No se enviaron campos para actualizar")

        set_clauses = ", ".join([f"{key} = :{key}" for key in rol_data.keys()])
        sentencia = text(f"""
            UPDATE roles r
            SET {set_clauses}
            WHERE r.id_rol = :id_rol
        """)

        rol_data["id_rol"] = id_rol

        result = db.execute(sentencia, rol_data)
        db.commit()

        return result.rowcount > 0
    
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al actualizar el rol {id_rol}: {e}")
        raise Exception("Error de base de datos al actualizar el rol")
    
def change_rol_status(db: Session, id_rol: int, nuevo_estado: bool) -> bool:
    try:
        sentencia = text("""
            UPDATE roles
            SET estado = :estado
            WHERE id_rol = :id_rol
        """)
        result = db.execute(sentencia, {"estado": nuevo_estado, "id_rol": id_rol})
        db.commit()

        return result.rowcount > 0

    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al cambiar el estado del rol  {id_rol}: {e}")
        raise Exception("Error de base de datos al cambiar el estado del rol")
