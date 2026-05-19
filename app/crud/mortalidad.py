from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from app.core.security import get_hashed_password
from typing import Optional
import logging
from app.schemas.mortalidad import MortalidadCreate,MortalidadUpdate

logger = logging.getLogger(__name__)

def create_lote(db: Session, lote: MortalidadCreate) -> Optional[bool]:
    try:
        query = text("""
          INSERT INTO mortalidad_produccion (
              lote_id, cantidad, fecha_reporte, observacion, nombre_persona
          ) VALUES (
              :lote_id, :cantidad, :fecha_reporte, :observacion, :nombre_persona
          )
      """)
        db.execute(query, lote.model_dump())
        db.commit()
        return True
    except SQLAlchemyError as e:
      db.rollback()
      logger.error(f"Error al crear lote: {e}")
      raise Exception("Error de base de datos al crear el registro de mortalidad")

def get_all_mortalidad(db: Session):
    try:
        query = text("""
                     SELECT m_p.lote_id, m_p.cantidad, m_p.fecha_reporte, m_p.observacion, 
                     m_p.nombre_persona, e.nombre_especie, c.nombre_categoria,
                     l_p.nombre_lote
                     FROM mortalidad_produccion AS m_p
                     INNER JOIN lote_produccion AS l_p ON m_p.lote_id = l_p.id_lote
                     LEFT JOIN especies AS e ON l_p.especie_id = e.id_especie
                     LEFT JOIN categorias AS c ON l_p.categoria_id = c.id_categoria
                     """)
        result = db.execute(query).mappings().all()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener lotes: {e}")
        raise Exception("Error de base de datos al obtener los registros de mortalidad")

def get_mortalidad_by_id(db: Session, id: int):
    try:
        query = text("""
                     SELECT m_p.lote_id, m_p.cantidad, m_p.fecha_reporte, m_p.observacion, 
                     m_p.nombre_persona, e.nombre_especie, c.nombre_categoria,
                     l_p.nombre_lote, l_p.id_lote
                     FROM mortalidad_produccion AS m_p
                     INNER JOIN lote_produccion AS l_p ON m_p.lote_id = l_p.id_lote
                     LEFT JOIN especies AS e ON l_p.especie_id = e.id_especie
                     LEFT JOIN categorias AS c ON l_p.categoria_id = c.id_categoria
                    WHERE m_p.id_mortalidad = :id
                    """)
        
        result = db.execute(query, {"id": id}).mappings().first()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener lote por id: {e}")
        raise Exception("Error de base de datos al obtener el lote")

def update_mortalidad_by_id(db: Session, id_mortalidad: int, mortalidad: MortalidadUpdate) -> Optional[bool]:
    try:
    # Solo los campos enviados por el cliente
        mortalidad_data = mortalidad.model_dump(exclude_unset=True)
        if not mortalidad_data:
             return False  # nada que actualizar
         # Construir dinámicamente la sentencia UPDATE
        set_clauses = ", ".join([f"{key} = :{key}" for key in mortalidad_data.keys()])
        sentencia = text(f"""
             UPDATE mortalidad_produccion
             SET {set_clauses}
             WHERE id_mortalidad = :id_mortalidad
         """)
         # Agregar el id_lote
        mortalidad_data["id_mortalidad"] = id_mortalidad
        result = db.execute(sentencia, mortalidad_data)
        db.commit()
        return result.rowcount > 0
    except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Error al actualizar lote {id_mortalidad}: {e}")
            raise Exception("Error de base de datos al actualizar el registro de mortalidad")


def get_all_mortalidad_prod_pag(db: Session, skip: int = 0, limit: int = 10):
    """
    Obtiene usuarios con paginación.
    Compatible con PostgreSQL, MySQL y SQLite.
    """
    try:
        # Total de usuarios
        count_query = text("""
            SELECT COUNT(l_p.id_mortalidad) AS total
            FROM mortalidad_produccion AS m_p
            INNER JOIN lote_produccion AS l_p ON m_p.lote_id = l_p.id_lote
            LEFT JOIN especies AS e ON l_p.especie_id = e.id_especie
            LEFT JOIN categorias AS c ON l_p.categoria_id = c.id_categoria
        """)

        total_result = db.execute(count_query).scalar()

        # Usuarios paginados
        data_query = text(""" 
                        SELECT m_p.lote_id, m_p.cantidad, m_p.fecha_reporte, m_p.observacion, 
                        m_p.nombre_persona, e.nombre_especie, c.nombre_categoria, u.nombre_user,
                        l_p.nombre_lote
                        FROM mortalidad_produccion AS m_p
                        INNER JOIN lote_produccion AS l_p ON m_p.lote_id = l_p.id_lote
                        LEFT JOIN especies AS e ON l_p.especie_id = e.id_especie
                        LEFT JOIN categorias AS c ON l_p.categoria_id = c.id_categoria
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
        logger.error( f"Error al obtener los usuarios: {e}", exc_info=True)

        raise Exception(
            "Error de base de datos al obtener los usuarios"
        )
        
        