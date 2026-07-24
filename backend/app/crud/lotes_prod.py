from sqlalchemy.orm import Session
from sqlalchemy import text       
from sqlalchemy.exc import SQLAlchemyError  
from app.core.security import datetime, timezone
from typing import Optional
import logging
from app.schemas.lotes_prod import LoteCreate, LoteUpdate, LoteEstado

logger = logging.getLogger(__name__)

# Crear un nuevo lote de producción
def create_lote(db: Session, lote: LoteCreate) -> Optional[bool]:
    try:
        query = text("""
          INSERT INTO lote_produccion (
                sublote, fecha_siembra, fecha_cosecha, cantidad,
                especie_id, categoria_id, estado_lote, user_id, lote_granj_id
          ) VALUES (
              :sublote, :fecha_siembra, :fecha_cosecha, :cantidad,
              :especie_id, :categoria_id, :estado_lote, :user_id, :lote_granj_id
          )
      """)
        
        db.execute(query, lote.model_dump())
        db.commit()
        return True
    except SQLAlchemyError as e:
      db.rollback()
      logger.error(f"Error al crear lote: {e}")
      raise Exception("Error de base de datos al crear el lote")

# Obtener todos los lotes de producción, con opción de filtrar por estado
def get_all_lotes(db: Session, estado: Optional[str] = None):
    try:
        # Si viene estado, filtra por ese estado; si no, trae todos
        where_clause = "WHERE l_p.estado_lote = :estado" if estado else ""

        query = text(f"""
            SELECT l_p.id_lote, l_p.sublote, l_p.fecha_siembra, l_p.fecha_cosecha, l_p.cantidad,
                   l_p.especie_id, l_p.categoria_id, l_p.estado_lote, l_p.user_id,
                   e.nombre_especie, c.nombre_categoria, u.nombre_user, l_g.nombre_lote
            FROM lote_produccion AS l_p
            LEFT JOIN especies AS e ON l_p.especie_id = e.id_especie
            LEFT JOIN categorias AS c ON l_p.categoria_id = c.id_categoria
            LEFT JOIN users AS u ON l_p.user_id = u.id_user
            LEFT JOIN lotes_granja AS l_g ON l_p.lote_granj_id = l_g.id_lote_g
            {where_clause}
            ORDER BY l_p.id_lote DESC
        """)

        params = {"estado": estado} if estado else {}
        result = db.execute(query, params).mappings().all()
        return result

    except SQLAlchemyError as e:
        logger.error(f"Error al obtener lotes: {e}")
        raise Exception("Error de base de datos al obtener los lotes")

# Obtener un lote de producción por su ID
def get_lote_by_id(db: Session, id: int):
    try:
        query = text("""
                     SELECT  l_p.id_lote, l_p.sublote, l_p.fecha_siembra, l_p.fecha_cosecha, l_p.cantidad,
                     l_p.especie_id, l_p.categoria_id, l_p.estado_lote, l_p.user_id, l_p.lote_granj_id,
                     e.nombre_especie, c.nombre_categoria, u.nombre_user, l_g.nombre_lote
                     FROM lote_produccion AS l_p
                     LEFT JOIN especies AS e ON l_p.especie_id = e.id_especie
                     LEFT JOIN categorias AS c ON l_p.categoria_id = c.id_categoria
                     LEFT JOIN users AS u ON l_p.user_id = u.id_user
                     LEFT JOIN lotes_granja AS l_g ON l_p.lote_granj_id = l_g.id_lote_g
                    WHERE l_p.id_lote = :id
                    """)
        
        result = db.execute(query, {"id": id}).mappings().first()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener lote por id: {e}")
        raise Exception("Error de base de datos al obtener el lote")

# Actualizar un lote de producción por su ID
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

# Cambiar el estado de un lote de producción
def change_status_lote(db: Session, lote_id: int, estado: LoteEstado, usuario_id: int) -> Optional[bool]:
    try:
        # 1. Actualizar el estado
        update = text("""
            UPDATE lote_produccion
            SET estado_lote = :estado
            WHERE id_lote = :id_lote
        """)
        result = db.execute(update, {"estado": estado.value, "id_lote": lote_id})

        # 2. Registrar en historial
        historial = text("""
            INSERT INTO historial_estado_lote (lote_id, estado, fecha_cambio, usuario_id)
            VALUES (:lote_id, :estado, :fecha_cambio, :usuario_id)
        """)
        db.execute(historial, {
            "lote_id":    lote_id,
            "estado":     estado.value,
            "fecha_cambio": datetime.now(timezone.utc),
            "usuario_id": usuario_id
        })

        db.commit()
        return result.rowcount > 0
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al cambiar estado del lote {lote_id}: {e}")
        raise Exception("Error de base de datos al cambiar el estado del lote")

# Obtener el historial de cambios de estado de un lote por su ID
def get_historial_by_id(db: Session, id_lote_p: int):
    try:
        query = text("""
                     SELECT  h.id_historial, h.lote_id, h.estado, h.fecha_cambio, h.usuario_id,
                     u.nombre_user
                     FROM historial_estado_lote AS h
                     LEFT JOIN users AS u ON h.usuario_id = u.id_user
                    WHERE h.lote_id = :id_lote_p
                    ORDER BY h.fecha_cambio DESC
                    """)
        
        result = db.execute(query, {"id_lote_p": id_lote_p}).mappings().all()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener historial por id: {e}")
        raise Exception("Error de base de datos al obtener el historial del lote")

# Obtener todos los lotes de producción con paginación
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
            LEFT JOIN lotes_granja AS l_g ON l_p.lote_granj_id = l_g.id_lote_g
            LEFT JOIN especies ON l_p.especie_id = especies.id_especie
            LEFT JOIN categorias ON l_p.categoria_id = categorias.id_categoria
            LEFT JOIN users ON l_p.user_id = users.id_user
        """)

        total_result = db.execute(count_query).scalar()

        # Lotes paginados
        data_query = text(""" 
                        SELECT  l_p.id_lote, l_p.sublote, l_p.fecha_siembra, l_p.fecha_cosecha, l_p.cantidad,
                        l_p.especie_id, l_p.categoria_id, l_p.estado_lote, l_p.user_id, l_p.lote_granj_id,
                        e.nombre_especie, c.nombre_categoria, u.nombre_user, l_g.nombre_lote
                        FROM lote_produccion AS l_p
                        LEFT JOIN especies AS e ON l_p.especie_id = e.id_especie
                        LEFT JOIN categorias AS c ON l_p.categoria_id = c.id_categoria
                        LEFT JOIN users AS u ON l_p.user_id = u.id_user
                        LEFT JOIN lotes_granja AS l_g ON l_p.lote_granj_id = l_g.id_lote_g
                        ORDER BY l_p.fecha_cosecha DESC
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