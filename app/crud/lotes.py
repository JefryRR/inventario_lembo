from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from app.core.security import get_hashed_password
from typing import Optional
import logging
from app.schemas.lotes_prod import LoteCreate, LoteUpdate, LoteEstado

logger = logging.getLogger(__name__)

def create_lote(db: Session, lote: LoteCreate) -> Optional[bool]:
    try:
        query = text("""
          INSERT INTO lote_produccion (
                nombre_lote, fecha_siembra, fecha_cosecha, cantidad_inicial,
                especie_id, categoria_id, estado_lote, user_id 
          ) VALUES (
              :nombre_lote, :fecha_siembra, :fecha_cosecha, :cantidad_inicial,
              :especie_id, :categoria_id, :estado_lote, :user_id
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
                     SELECT  l_p.id_lote, l_p.nombre_lote, l_p.fecha_siembra, l_p.fecha_cosecha, l_p.cantidad_inicial,
                              l_p.especie_id, l_p.categoria_id, l_p.estado_lote, l_p.user_id,
                              e.nombre_especie, c.nombre_categoria, u.nombre_user
                     FROM lote_produccion AS l_p
                     LEFT JOIN especies AS e ON l_p.especie_id = e.id_especie
                     LEFT JOIN categorias AS c ON l_p.categoria_id = c.id_categoria
                     LEFT JOIN users AS u ON l_p.user_id = u.id_user
                     """)
        result = db.execute(query).mappings().all()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener lotes: {e}")
        raise Exception("Error de base de datos al obtener los lotes")

def get_lote_by_id(db: Session, id: int):
    try:
        query = text("""
                     SELECT  l_p.id_lote, l_p.nombre_lote, l_p.fecha_siembra, l_p.fecha_cosecha, l_p.cantidad_inicial,
                     l_p.especie_id, l_p.categoria_id, l_p.estado_lote, l_p.user_id,
                     e.nombre_especie, c.nombre_categoria, u.nombre_user
                     FROM lote_produccion AS l_p
                     LEFT JOIN especies AS e ON l_p.especie_id = e.id_especie
                     LEFT JOIN categorias AS c ON l_p.categoria_id = c.id_categoria
                     LEFT JOIN users AS u ON l_p.user_id = u.id_user
                    WHERE l_p.id_lote = :id
                    """)
        
        result = db.execute(query, {"id": id}).mappings().first()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener lote por id: {e}")
        raise Exception("Error de base de datos al obtener el lote")

def update_lote_by_id(db: Session, lote_id: int, lote: LoteUpdate) -> Optional[bool]:
    try:
    # Solo los campos enviados por el cliente
        lote_data = lote.model_dump(exclude_unset=True)
        if not lote_data:
             return False  # nada que actualizar
         # Construir dinámicamente la sentencia UPDATE
        set_clauses = ", ".join([f"{key} = :{key}" for key in lote_data.keys()])
        sentencia = text(f"""
             UPDATE lote_produccion
             SET {set_clauses}
             WHERE id_lote = :id_lote
         """)
         # Agregar el id_lote
        lote_data["id_lote"] = lote_id
        result = db.execute(sentencia, lote_data)
        db.commit()
        return result.rowcount > 0
    except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Error al actualizar lote {lote_id}: {e}")
            raise Exception("Error de base de datos al actualizar el lote")

def change_status_lote(db: Session, lote_id: int, estado: LoteEstado) -> Optional[bool]:
    try:
        sentencia = text("""
            UPDATE lote_produccion
            SET estado_lote = :estado
            WHERE id_lote = :id_lote
        """)
        result = db.execute(sentencia, {"estado": estado.value, "id_lote": lote_id})
        db.commit()
        return result.rowcount > 0
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al cambiar estado del lote {lote_id}: {e}")
        raise Exception("Error de base de datos al cambiar el estado del lote")

def get_all_lotes_prod_pag(db: Session, skip: int = 0, limit: int = 10):
    """
    Obtiene lotes con paginación.
    Compatible con PostgreSQL, MySQL y SQLite.
    """
    try:
        # Total de lotes
        count_query = text("""
            SELECT COUNT(l_p.id_lote) AS total
            FROM lote_produccion AS l_p
            LEFT JOIN especies ON l_p.especie_id = especies.id_especie
            LEFT JOIN categorias ON l_p.categoria_id = categorias.id_categoria
            LEFT JOIN users ON l_p.user_id = users.id_user
        """)

        total_result = db.execute(count_query).scalar()

        # Usuarios paginados
        data_query = text(""" 
                        SELECT  l_p.id_lote, l_p.nombre_lote, l_p.fecha_siembra, l_p.fecha_cosecha, l_p.cantidad_inicial,
                        l_p.especie_id, l_p.categoria_id, l_p.estado_lote, l_p.user_id,
                        e.nombre_especie, c.nombre_categoria, u.nombre_user
                        FROM lote_produccion AS l_p
                        INNER JOIN especies AS e ON l_p.especie_id = e.id_especie
                        INNER JOIN categorias AS c ON l_p.categoria_id = c.id_categoria
                        INNER JOIN users AS u ON l_p.user_id = u.id_user
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
            "lotes": lotes_prod_list
        }

    except SQLAlchemyError as e:
        logger.error( f"Error al obtener los lotes: {e}", exc_info=True)

        raise Exception(
            "Error de base de datos al obtener los lotes"
        )
        
        