from sqlalchemy.orm import Session # type: ignore
from sqlalchemy import text        # type: ignore
from sqlalchemy.exc import SQLAlchemyError   # type: ignore
from app.core.security import get_hashed_password
from typing import Optional
import logging
from app.schemas.lotes_prod import LoteCreate, LoteUpdate, LoteEstado

logger = logging.getLogger(__name__)

def create_lote(db: Session, lote: LoteCreate) -> Optional[bool]:
    try:
        query = text("""
          INSERT INTO lotes_granja (
                nombre_lote, ubicacion, latitud, longitud 
          ) VALUES (
              :nombre_lote, :ubicacion, :latitud, :longitud
          )
      """)
        db.execute(query, lote.model_dump())
        db.commit()
        return True
    except SQLAlchemyError as e:
      db.rollback()
      logger.error(f"Error al crear lote: {e}")
      raise Exception("Error de base de datos al crear el lote")

def get_all_lotes(db: Session):
    try:
        query = text("""
                     SELECT id_lote_g, nombre_lote, ubicacion, latitud, longitud FROM lotes_granja
                     """)
        result = db.execute(query).mappings().all()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener lotes: {e}")
        raise Exception("Error de base de datos al obtener los lotes")

def get_lote_by_id(db: Session, id: int):
    try:
        query = text("""SELECT id_lote_g, nombre_lote, ubicacion, latitud, longitud FROM lotes_granja WHERE id_lote_g = :id """)
        
        result = db.execute(query, {"id": id}).mappings().first()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener lote por id: {e}")
        raise Exception("Error de base de datos al obtener el lote")

def update_lote_by_id(db: Session, lote_id_g: int, lote: LoteUpdate) -> Optional[bool]:
    try:
    # Solo los campos enviados por el cliente
        lote_data = lote.model_dump(exclude_unset=True)
        if not lote_data:
             return False  # nada que actualizar
         # Construir dinámicamente la sentencia UPDATE
        set_clauses = ", ".join([f"{key} = :{key}" for key in lote_data.keys()])
        sentencia = text(f"""
             UPDATE lotes_granja
             SET {set_clauses}
             WHERE id_lote_g = :id_lote
         """)
         # Agregar el id_lote
        lote_data["id_lote"] = lote_id_g
        result = db.execute(sentencia, lote_data)
        db.commit()
        return result.rowcount > 0
    except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Error al actualizar lote {lote_id_g}: {e}")
            raise Exception("Error de base de datos al actualizar el lote")

def get_all_lotes_granja_pag(db: Session, skip: int = 0, limit: int = 10, search: Optional[str] = None):
    """
    Obtiene lotes con paginación.
    Compatible con PostgreSQL, MySQL y SQLite.
    """
    try:
        where_clause = ""
        params = {"limit": limit, "skip": skip}
        
        if search:
            where_clause = "WHERE LOWER(nombre_lote) LIKE LOWER(:search)"
            params["search"] = f"%{search}%"
        
        # Total de lotes
        count_query = text(f"""
            SELECT COUNT(id_lote_g) AS total
            FROM lotes_granja
            {where_clause}
        """)

        total_result = db.execute(count_query, params).scalar()

        data_query = text(f""" 
                    SELECT id_lote_g, nombre_lote, ubicacion, latitud, longitud
                    FROM lotes_granja
                    {where_clause}
                        LIMIT :limit OFFSET :skip
                    """)

        lotes_prod_list = db.execute(
            data_query,
            {
                "limit": limit,
                "skip": skip
            }
        ).mappings().all()

        return {
            "total": total_result or 0,
            "lotes_granja": lotes_prod_list
        }

    except SQLAlchemyError as e:
        logger.error( f"Error al obtener los lotes: {e}", exc_info=True)

        raise Exception(
            "Error de base de datos al obtener los lotes"
        )
        
        