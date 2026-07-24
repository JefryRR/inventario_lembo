from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from typing import Optional
import logging
from app.schemas.mortalidad import MortalidadCreate,MortalidadUpdate

logger = logging.getLogger(__name__)

# Columnas sobre las que se puede buscar (usadas en /paginated y /rango-fechas)
_SEARCH_WHERE = """
    (
        l_g.nombre_lote LIKE :search OR
        l_p.sublote LIKE :search OR
        e.nombre_especie LIKE :search OR
        c.nombre_categoria LIKE :search OR
        u.nombre_user LIKE :search OR
        m_p.observacion LIKE :search
    )
"""

#Crear un nuevo registro de mortalidad
def create_mortalidad(db: Session, mortalidad: MortalidadCreate, user_id: int) -> Optional[bool]:
    try:
        query = text("""
          INSERT INTO mortalidad_produccion (
              lote_id, cantidad, fecha_reporte, observacion, foto_url, user_id
          ) VALUES (
              :lote_id, :cantidad, :fecha_reporte, :observacion, :foto_url, :user_id
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

# Obtener todos los registros de mortalidad
def get_all_mortalidad(db: Session):
    try:
        query = text("""
                     SELECT m_p.id_mortalidad, m_p.lote_id, m_p.cantidad, m_p.fecha_reporte, m_p.observacion, 
                     m_p.foto_url, e.nombre_especie, c.nombre_categoria, m_p.user_id, l_g.nombre_lote, l_p.sublote,
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

# Obtener un registro de mortalidad por su ID
def get_mortalidad_by_id(db: Session, id: int):
    try:
        query = text("""
                     SELECT m_p.id_mortalidad, m_p.lote_id, m_p.cantidad, m_p.fecha_reporte, m_p.observacion, 
                     m_p.foto_url, e.nombre_especie, c.nombre_categoria, m_p.user_id, 
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

# Obtener todos los registros de mortalidad por lote
def get_mortalidad_by_lote(db: Session, lote_id: int):
    try:
        query = text("""
            SELECT m_p.id_mortalidad, m_p.lote_id, m_p.cantidad, m_p.fecha_reporte, m_p.observacion,
                   m_p.foto_url, e.nombre_especie, c.nombre_categoria, m_p.user_id,
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

# Actualizar un registro de mortalidad por su ID
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

# Ontener los datos de mortalidad por un rango de fechas
def get_mortalidad_by_date_range(db: Session, fecha_inicio: str, fecha_fin: str, search: Optional[str] = None):
    """
    Obtiene los registros de mortalidad cuya fecha de reporte esté dentro de un rango de fechas.
    Ignora las horas (usa DATE(fecha_reporte)). Si se pasa `search`, filtra además por
    lote, sublote, especie, categoría, usuario u observación.
    """
    try:
        where_extra = f"AND {_SEARCH_WHERE}" if search else ""
        query = text(f"""
            SELECT m_p.id_mortalidad, m_p.lote_id, m_p.cantidad, m_p.fecha_reporte, m_p.observacion, 
                        m_p.foto_url, e.nombre_especie, c.nombre_categoria, m_p.user_id, l_g.nombre_lote, l_p.sublote,
                        u.nombre_user
                        FROM mortalidad_produccion AS m_p
                        INNER JOIN lote_produccion AS l_p ON m_p.lote_id = l_p.id_lote
                        LEFT JOIN especies AS e ON l_p.especie_id = e.id_especie
                        LEFT JOIN categorias AS c ON l_p.categoria_id = c.id_categoria
                        LEFT JOIN lotes_granja AS l_g ON l_p.lote_granj_id = l_g.id_lote_g
                        LEFT JOIN users AS u ON m_p.user_id = u.id_user
            WHERE DATE(m_p.fecha_reporte) BETWEEN :fecha_inicio AND :fecha_fin
            {where_extra}
            ORDER BY m_p.fecha_reporte DESC
        """)
        params = {"fecha_inicio": fecha_inicio, "fecha_fin": fecha_fin}
        if search:
            params["search"] = f"%{search}%"

        result = db.execute(query, params).mappings().all()
        
        return [dict(row) for row in result]

    except SQLAlchemyError as e:
        raise Exception(f"Error al consultar los insumos por rango de fechas: {e}")

# Función para obtener todos los registros de mortalidad haciendo uso de la paginación
def get_all_mortalidad_prod_pag(db: Session, skip: int = 0, limit: int = 10, search: Optional[str] = None):
    """
    Obtiene los registros de mortalidad con paginación.
    Compatible con PostgreSQL, MySQL y SQLite.
    Si se pasa `search`, filtra por lote, sublote, especie, categoría, usuario u observación.
    """
    try:
        base_from = """
            FROM mortalidad_produccion AS m_p
            INNER JOIN lote_produccion AS l_p ON m_p.lote_id = l_p.id_lote
            LEFT JOIN especies AS e ON l_p.especie_id = e.id_especie
            LEFT JOIN categorias AS c ON l_p.categoria_id = c.id_categoria
            LEFT JOIN lotes_granja AS l_g ON l_p.lote_granj_id = l_g.id_lote_g
            LEFT JOIN users AS u ON m_p.user_id = u.id_user
        """
        where_clause = f"WHERE {_SEARCH_WHERE}" if search else ""
        params = {"search": f"%{search}%"} if search else {}

        # Total de mortalidad (respetando el filtro de búsqueda)
        count_query = text(f"""
            SELECT COUNT(m_p.id_mortalidad) AS total
            {base_from}
            {where_clause}
        """)
        total_result = db.execute(count_query, params).scalar()

        # Registros paginados
        data_query = text(f"""
            SELECT m_p.id_mortalidad, m_p.lote_id, m_p.cantidad, m_p.fecha_reporte, m_p.observacion, 
            m_p.foto_url, e.nombre_especie, c.nombre_categoria, m_p.user_id, l_g.nombre_lote, l_p.sublote,
            u.nombre_user
            {base_from}
            {where_clause}
            ORDER BY m_p.id_mortalidad DESC
            LIMIT :limit OFFSET :skip
        """)

        data_params = {**params, "limit": limit, "skip": skip}
        mortalidad_prod_list = db.execute(data_query, data_params).mappings().all()

        return {
            "total": total_result or 0,
            "mortalidad": mortalidad_prod_list
        }

    except SQLAlchemyError as e:
        logger.error( f"Error al obtener los registros de mortalidad: {e}", exc_info=True)

        raise Exception(
            "Error de base de datos al obtener los registros de mortalidad"
        )
