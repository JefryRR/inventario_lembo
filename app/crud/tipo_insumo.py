from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from typing import Optional
from app.schemas.tipo_insumo import Tipo_insumoCreate, Tipo_insumoUpdate
import logging

logger = logging.getLogger(__name__)

def create_tipo_insumo(db: Session, tipo_insumo: Tipo_insumoCreate):
    try:

        tipo_insumo_existente = db.execute(
            text("SELECT id_tipo_insumo FROM tipo_insumo WHERE nombre_tipo = :nombre_tipo"),
            {"nombre_tipo": tipo_insumo.nombre_tipo.lower()}
        ).fetchone()

        if tipo_insumo_existente:
            raise Exception("Ya existe un tipo de insumo con ese nombre")

        query = text("""INSERT INTO tipo_insumo (
                nombre_tipo) VALUES (
                :nombre_tipo
            )
        """)
        db.execute(query, tipo_insumo.model_dump())
        db.commit()
        return True
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al crear la tipo insumo: {e}")
        raise Exception("Error de base de datos al crear el tipo de insumo")

def get_tipo_insumo_by_id(db: Session, id: int):
    try:
        query = text("""SELECT id_tipo_insumo, nombre_tipo
                     FROM tipo_insumo
                     WHERE id_tipo_insumo = :id
                """)
        
        result = db.execute(query, {"id": id}).mappings().first()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener tipo de insumo por id: {e}")
        raise Exception("Error de base de datos al obtener el tipo de insumo")

def get_all_tipo_insumos(db: Session):
    try:
        query = text("""SELECT
                     * FROM tipo_insumo
                     """)
        result = db.execute(query).mappings().all()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener los tipos de insumos: {e}")
        raise Exception("Error de base de datos al obtener los tipos de insumos")
    
def update_tipo_insumo_by_id(db: Session, id_tipo_insumo: int, tipo_insumo: Tipo_insumoUpdate) -> Optional[bool]:
    try:
        tipo_insumo_data = tipo_insumo.model_dump(exclude_unset=True)
        if not tipo_insumo_data:
            raise Exception("No se enviaron campos para actualizar")

        set_clauses = ", ".join([f"{key} = :{key}" for key in tipo_insumo_data.keys()])
        sentencia = text(f"""
            UPDATE tipo_insumo
            SET {set_clauses}
            WHERE id_tipo_insumo = :id_tipo_insumo
        """)

        tipo_insumo_data["id_tipo_insumo"] = id_tipo_insumo

        result = db.execute(sentencia, tipo_insumo_data)
        db.commit()

        return result.rowcount > 0
    
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al actualizar la tipo_insumo {id_tipo_insumo}: {e}")
        raise Exception("Error de base de datos al actualizar la tipo_insumo")
    