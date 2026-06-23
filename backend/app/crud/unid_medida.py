from sqlalchemy.orm import Session # type: ignore
from sqlalchemy import text # type: ignore
from sqlalchemy.exc import SQLAlchemyError # type: ignore
from typing import Optional, List
from app.schemas.unid_medidas import  Unid_medCreate, Unid_medUpdate
import logging

logger = logging.getLogger(__name__)

def create_unid_medida(db: Session, unid_medida: Unid_medCreate):
    try:
        query = text("""INSERT INTO unidades_medida (
                unidad, simbolo, conversion) VALUES (
                :unidad, :simbolo, :conversion
            )
        """)
        db.execute(query, unid_medida.model_dump())
        db.commit()
        return True
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al crear la unidad de medida: {e}")
        raise Exception("Error de base de datos al crear la unidad de medida")

def get_unid_medida_by_id(db: Session, id: int):
    try:
        query = text("""SELECT id_unidad, unidad, simbolo, conversion
                     FROM unidades_medida
                     WHERE id_unidad = :id
                """)
        
        result = db.execute(query, {"id": id}).mappings().first()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener unidad de medida por id: {e}")
        raise Exception("Error de base de datos al obtener la unidad de medida")

def get_all_unid_medidas(db: Session):
    try:
        query = text("""SELECT * FROM unidades_medida""")
        result = db.execute(query).mappings().all()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener las unidades de medida: {e}")
        raise Exception("Error de base de datos al obtener las unidades de medida")

def update_unid_medida_by_id(db: Session, id_unid_medida: int, unid_medida: Unid_medUpdate) -> Optional[bool]:
    try:
        unid_medida_data = unid_medida.model_dump(exclude_unset=True)
        if not unid_medida_data:
            raise Exception("No se enviaron campos para actualizar")

        set_clauses = ", ".join([f"{key} = :{key}" for key in unid_medida_data.keys()])
        sentencia = text(f"""
            UPDATE unidades_medida c
            SET {set_clauses}
            WHERE c.id_unidad = :id_unidad
        """)

        unid_medida_data["id_unidad"] = id_unid_medida

        result = db.execute(sentencia, unid_medida_data)
        db.commit()

        return result.rowcount > 0
    
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al actualizar la unidad de medida {id_unid_medida}: {e}")
        raise Exception("Error de base de datos al actualizar la unidad de medida")
    