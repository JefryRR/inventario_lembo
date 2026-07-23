from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from typing import Optional
from app.schemas.especies import EspecieCreate, EspecieUpdate
import logging

logger = logging.getLogger(__name__)

def create_especie(db: Session, especie: EspecieCreate):
    try:
        query = text("""INSERT INTO especies (
                nombre_especie, descripcion) VALUES (
                :nombre_especie, :descripcion
            )
        """)
        db.execute(query, especie.model_dump())
        db.commit()
        return True
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al crear la especie: {e}")
        raise Exception("Error de base de datos al crear la especie")

def get_especie_by_id(db: Session, id: int):
    try:
        query = text("""SELECT id_especie, nombre_especie, descripcion
                     FROM especies
                     WHERE id_especie = :id
                """)
        
        result = db.execute(query, {"id": id}).mappings().first()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener especie por id: {e}")
        raise Exception("Error de base de datos al obtener la especie")

def get_all_especies(db: Session):
    try:
        query = text("""SELECT
                     * FROM especies
                     """)
        result = db.execute(query).mappings().all()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener las especies: {e}")
        raise Exception("Error de base de datos al obtener las especies")
    
def update_especie_by_id(db: Session, id_especie: int, especie: EspecieUpdate) -> Optional[bool]:
    try:
        especie_data = especie.model_dump(exclude_unset=True)
        if not especie_data:
            raise Exception("No se enviaron campos para actualizar")

        set_clauses = ", ".join([f"{key} = :{key}" for key in especie_data.keys()])
        sentencia = text(f"""
            UPDATE especies c
            SET {set_clauses}
            WHERE c.id_especie = :id_especie
        """)

        especie_data["id_especie"] = id_especie

        result = db.execute(sentencia, especie_data)
        db.commit()

        return result.rowcount > 0
    
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al actualizar la especie {id_especie}: {e}")
        raise Exception("Error de base de datos al actualizar la especie")

def get_all_especies_pag(db: Session, skip: int = 0, limit: int = 10, search: Optional[str] = None):
    """
    Obtiene especies con paginación.
    Compatible con PostgreSQL, MySQL y SQLite.
    """

    try:
        where_clause = ""
        params = {"limit": limit, "skip": skip}
        
        if search:
            where_clause = "WHERE LOWER(nombre_especie) LIKE LOWER(:search)"
            params["search"] = f"%{search}%"

        # Total de especies
        count_query = text(f"""
            SELECT COUNT(id_especie) AS total
            FROM especies 
            {where_clause}
        """)

        total_result = db.execute(count_query, params).scalar()

        # especies paginados
        data_query = text(f"""SELECT
                            * FROM especies
                            {where_clause}
                        LIMIT :limit OFFSET :skip
                    """)

        especies_list = db.execute(data_query, params).mappings().all()

        return {
            "total": total_result or 0,
            "especies": especies_list
        }

    except SQLAlchemyError as e:
        logger.error( f"Error al obtener los especies: {e}", exc_info=True)

        raise Exception(
            "Error de base de datos al obtener las especies"
        )