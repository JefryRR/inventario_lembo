from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from app.core.security import get_hashed_password
from typing import Optional
import logging
from app.schemas.mortalidad import MortalidadCreate,MortalidadUpdate

logger = logging.getLogger(__name__)

def create_mortalidad(db: Session, mortalidad: MortalidadCreate, user_id: int) -> Optional[bool]:
    try:
        query = text("""
          INSERT INTO mortalidad_produccion (
              lote_id, cantidad, fecha_reporte, observacion, user_id
          ) VALUES (
              :lote_id, :cantidad, :fecha_reporte, :observacion, :user_id
          )
      """)
        db.execute(query, {**mortalidad.model_dump(), "user_id": user_id})
        db.commit()
        return True
    except ValueError:
        raise
    except SQLAlchemyError as e:
        db.rollback()
        orig = getattr(e, "orig", None)
        error_msg = orig.args[1] if orig and len(orig.args) > 1 else str(e)
        raise Exception(error_msg)

def get_all_mortalidad(db: Session):
    try:
        query = text("""
                     SELECT m_p.id_mortalidad, m_p.lote_id, m_p.cantidad, m_p.fecha_reporte, m_p.observacion, 
                     e.nombre_especie, c.nombre_categoria, m_p.user_id, l_g.nombre_lote, l_p.sublote,
                     u.nombre_user
                     FROM mortalidad_produccion AS m_p
                     LEFT JOIN lote_produccion AS l_p ON m_p.lote_id = l_p.id_lote
                     LEFT JOIN especies AS e ON l_p.especie_id = e.id_especie
                     LEFT JOIN categorias AS c ON l_p.categoria_id = c.id_categoria
                     LEFT JOIN lotes_granja AS l_g ON l_p.lote_granj_id = l_g.id_lote_g
                     LEFT JOIN users AS u ON m_p.user_id = u.id_user
                     ORDER BY m_p.id_mortalidad DESC
                     """)
        result = db.execute(query).mappings().all()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener mortalidad: {e}")
        raise Exception("Error de base de datos al obtener los registros de mortalidad")

def get_mortalidad_by_id(db: Session, id: int):
    try:
        query = text("""
                     SELECT m_p.id_mortalidad, m_p.lote_id, m_p.cantidad, m_p.fecha_reporte, m_p.observacion, 
                     e.nombre_especie, c.nombre_categoria, m_p.user_id, 
                     l_g.nombre_lote, l_p.sublote, u.nombre_user
                     FROM mortalidad_produccion AS m_p
                     LEFT JOIN lote_produccion AS l_p ON m_p.lote_id = l_p.id_lote
                     LEFT JOIN especies AS e ON l_p.especie_id = e.id_especie
                     LEFT JOIN categorias AS c ON l_p.categoria_id = c.id_categoria
                     LEFT JOIN lotes_granja AS l_g ON l_p.lote_granj_id = l_g.id_lote_g
                     LEFT JOIN users AS u ON m_p.user_id = u.id_user
                    WHERE m_p.id_mortalidad = :id
                    """)
        
        result = db.execute(query, {"id": id}).mappings().first()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener mortalidad por id: {e}")
        raise Exception("Error de base de datos al obtener la mortalidad")
    
def get_mortalidad_by_lote(db: Session, lote_id: int):
    try:
        query = text("""
            SELECT m_p.id_mortalidad, m_p.lote_id, m_p.cantidad, m_p.fecha_reporte, m_p.observacion,
                   e.nombre_especie, c.nombre_categoria, m_p.user_id,
                   l_g.nombre_lote, l_p.sublote, u.nombre_user
            FROM mortalidad_produccion AS m_p
            LEFT JOIN lote_produccion AS l_p ON m_p.lote_id = l_p.id_lote
            LEFT JOIN especies AS e ON l_p.especie_id = e.id_especie
            LEFT JOIN categorias AS c ON l_p.categoria_id = c.id_categoria
            LEFT JOIN lotes_granja AS l_g ON l_p.lote_granj_id = l_g.id_lote_g
            LEFT JOIN users AS u ON m_p.user_id = u.id_user
            WHERE m_p.lote_id = :lote_id
            ORDER BY m_p.fecha_reporte ASC
        """)
        result = db.execute(query, {"lote_id": lote_id}).mappings().all()
        return list(result)  # lista vacía [] si no hay registros, nunca 404
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener mortalidad por lote: {e}")
        raise Exception("Error de base de datos al obtener la mortalidad del lote")

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
    except ValueError:
        raise
    except SQLAlchemyError as e:
        db.rollback()
        orig = getattr(e, "orig", None)
        error_msg = orig.args[1] if orig and len(orig.args) > 1 else str(e)
        raise Exception(error_msg)

def get_mortalidad_by_date_range(db: Session, fecha_inicio: str, fecha_fin: str):
    """
    Obtiene las tareas cuya fecha de inicio o fin esté dentro de un rango de fechas.
    Ignora las horas (usa DATE(fecha_init) y DATE(fecha_fin)).
    """
    try:
        query = text("""
            SELECT m_p.id_mortalidad, m_p.lote_id, m_p.cantidad, m_p.fecha_reporte, m_p.observacion, 
                        e.nombre_especie, c.nombre_categoria, m_p.user_id, l_g.nombre_lote, l_p.sublote,
                        u.nombre_user
                        FROM mortalidad_produccion AS m_p
                        INNER JOIN lote_produccion AS l_p ON m_p.lote_id = l_p.id_lote
                        LEFT JOIN especies AS e ON l_p.especie_id = e.id_especie
                        LEFT JOIN categorias AS c ON l_p.categoria_id = c.id_categoria
                        LEFT JOIN lotes_granja AS l_g ON l_p.lote_granj_id = l_g.id_lote_g
                        LEFT JOIN users AS u ON m_p.user_id = u.id_user
            WHERE DATE(m_p.fecha_reporte) BETWEEN :fecha_inicio AND :fecha_fin
            ORDER BY m_p.fecha_reporte DESC
        """)
        result = db.execute(query, {
            "fecha_inicio": fecha_inicio,
            "fecha_fin": fecha_fin
        }).mappings().all()
        
        return [dict(row) for row in result]

    except SQLAlchemyError as e:
        raise Exception(f"Error al consultar los insumos por rango de fechas: {e}")


def get_all_mortalidad_prod_pag(db: Session, skip: int = 0, limit: int = 10):
    """
    Obtiene los registros de mortalidad con paginación.
    Compatible con PostgreSQL, MySQL y SQLite.
    """
    try:
        # Total de mortalidad
        count_query = text("""
            SELECT COUNT(m_p.id_mortalidad) AS total
            FROM mortalidad_produccion AS m_p
            INNER JOIN lote_produccion AS l_p ON m_p.lote_id = l_p.id_lote
            LEFT JOIN especies AS e ON l_p.especie_id = e.id_especie
            LEFT JOIN categorias AS c ON l_p.categoria_id = c.id_categoria
            LEFT JOIN users AS u ON m_p.user_id = u.id_user
        """)

        total_result = db.execute(count_query).scalar()

        # Registros paginados
        data_query = text(""" 
                        SELECT m_p.id_mortalidad, m_p.lote_id, m_p.cantidad, m_p.fecha_reporte, m_p.observacion, 
                        e.nombre_especie, c.nombre_categoria, m_p.user_id, l_g.nombre_lote, l_p.sublote,
                        u.nombre_user
                        FROM mortalidad_produccion AS m_p
                        INNER JOIN lote_produccion AS l_p ON m_p.lote_id = l_p.id_lote
                        LEFT JOIN especies AS e ON l_p.especie_id = e.id_especie
                        LEFT JOIN categorias AS c ON l_p.categoria_id = c.id_categoria
                        LEFT JOIN lotes_granja AS l_g ON l_p.lote_granj_id = l_g.id_lote_g
                        LEFT JOIN users AS u ON m_p.user_id = u.id_user
                        ORDER BY m_p.id_mortalidad DESC
                        LIMIT :limit OFFSET :skip
                    """)

        mortalidad_prod_list = db.execute(
            data_query,
            {
                "limit": limit,
                "skip": skip
            }
        ).mappings().all()

        return {
            "total": total_result or 0,
            "mortalidad": mortalidad_prod_list
        }

    except SQLAlchemyError as e:
        logger.error( f"Error al obtener los registros de mortalidad: {e}", exc_info=True)

        raise Exception(
            "Error de base de datos al obtener los registros de mortalidad"
        )
        
        