from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from typing import Optional
import logging
from app.schemas.tratamiento import TratamientoCreate,TratamientoUpdate

logger = logging.getLogger(__name__)

def create_tratamiento(db: Session, tratamiento: TratamientoCreate) -> Optional[bool]:
    try:
        query = text("""
          INSERT INTO tratamientos (
              lote_id, medicina_id, fecha_inicio, fecha_fin, cantidad, unid_medida, observacion, user_id
          ) VALUES (
              :lote_id, :medicina_id, :fecha_inicio, :fecha_fin, :cantidad, :unid_medida, :observacion, :user_id
          )
      """)
        db.execute(query, tratamiento.model_dump())
        db.commit()
        return True
    except SQLAlchemyError as e:
      db.rollback()
      logger.error(f"Error al crear el registro del tratamiento: {e}")
      raise Exception("Error de base de datos al crear el registro del tratamiento")

def get_all_tratamientos(db: Session):
    try:
        query = text("""
                     SELECT t_p.id_tratamiento, t_p.lote_id, t_p.medicina_id, t_p.fecha_inicio, t_p.fecha_fin,
                     t_p.cantidad, t_p.unid_medida, e.nombre_especie, c.nombre_categoria, in_ins.nombre_producto, l_p.nombre_lote
                     FROM tratamientos AS t_p
                     INNER JOIN lote_produccion AS l_p ON t_p.lote_id = l_p.id_lote
                     LEFT JOIN especies AS e ON l_p.especie_id = e.id_especie
                     LEFT JOIN categorias AS c ON l_p.categoria_id = c.id_categoria
                     LEFT JOIN inv_insumos AS in_ins ON t_p.medicina_id = in_ins.id_insumo
                     ORDER BY t_p.id_tratamiento DESC
                     """)
        result = db.execute(query).mappings().all()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener tratamientos: {e}")
        raise Exception("Error de base de datos al obtener los registros de tratamientos")

def get_tratamiento_by_id(db: Session, id: int):
    try:
        query = text("""
                     SELECT t_p.id_tratamiento, t_p.lote_id, t_p.medicina_id, t_p.fecha_inicio, t_p.fecha_fin, t_p.cantidad, t_p.unid_medida,
                     e.nombre_especie, c.nombre_categoria, in_ins.nombre_producto, l_p.nombre_lote
                     FROM tratamientos AS t_p
                     INNER JOIN lote_produccion AS l_p ON t_p.lote_id = l_p.id_lote
                     LEFT JOIN especies AS e ON l_p.especie_id = e.id_especie
                     LEFT JOIN categorias AS c ON l_p.categoria_id = c.id_categoria
                     LEFT JOIN inv_insumos AS in_ins ON t_p.medicina_id = in_ins.id_insumo
                    WHERE t_p.id_tratamiento = :id
                    """)
        
        result = db.execute(query, {"id": id}).mappings().first()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener tratamiento por id: {e}")
        raise Exception("Error de base de datos al obtener el tratamiento por id")

def update_tratamiento_by_id(db: Session, id_tratamiento: int, tratamiento: TratamientoUpdate) -> Optional[bool]:
    try:
    # Solo los campos enviados por el cliente
        tratamiento_data = tratamiento.model_dump(exclude_unset=True)
        if not tratamiento_data:
             return False  # nada que actualizar
         # Construir dinámicamente la sentencia UPDATE
        set_clauses = ", ".join([f"{key} = :{key}" for key in tratamiento_data.keys()])
        sentencia = text(f"""
             UPDATE tratamiento
             SET {set_clauses}
             WHERE id_tratamiento = :id_tratamiento
         """)
         # Agregar el id_lote
        tratamiento_data["id_tratamiento"] = id_tratamiento
        result = db.execute(sentencia, tratamiento_data)
        db.commit()
        return result.rowcount > 0
    except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Error al actualizar tratamiento {id_tratamiento}: {e}")
            raise Exception("Error de base de datos al actualizar el registro de tratamiento")

def get_all_tratamientos_pag(db: Session, skip: int = 0, limit: int = 10):
    """
    Obtiene los registros de tratamientos con paginación.
    Compatible con PostgreSQL, MySQL y SQLite.
    """
    try:
        # Total de tratamientos
        count_query = text("""
            SELECT COUNT(t_p.id_tratamiento) AS total
            FROM tratamientos AS t_p
            INNER JOIN lote_produccion AS l_p ON t_p.lote_id = l_p.id_lote
            LEFT JOIN especies AS e ON l_p.especie_id = e.id_especie
            LEFT JOIN categorias AS c ON l_p.categoria_id = c.id_categoria
        """)

        total_result = db.execute(count_query).scalar()

        # Registros paginados
        data_query = text(""" 
                        SELECT t_p.id_tratamiento, t_p.lote_id, t_p.medicina_id, t_p.fecha_inicio, t_p.fecha_fin, t_p.cantidad, t_p.unid_medida,
                        e.nombre_especie, c.nombre_categoria, in_ins.nombre_producto, l_p.nombre_lote
                        FROM tratamientos AS t_p
                        INNER JOIN lote_produccion AS l_p ON t_p.lote_id = l_p.id_lote
                        LEFT JOIN especies AS e ON l_p.especie_id = e.id_especie
                        LEFT JOIN categorias AS c ON l_p.categoria_id = c.id_categoria
                        LEFT JOIN inv_insumos AS in_ins ON t_p.medicina_id = in_ins.id_insumo
                        ORDER BY t_p.id_tratamiento DESC
                        LIMIT :limit OFFSET :skip
                    """)

        tratamiento_list = db.execute(
            data_query,
            {
                "limit": limit,
                "skip": skip
            }
        ).mappings().all()

        return {
            "total": total_result or 0,
            "tratamientos": tratamiento_list
        }

    except SQLAlchemyError as e:
        logger.error( f"Error al obtener los registros de tratamientos: {e}", exc_info=True)

        raise Exception(
            "Error de base de datos al obtener los registros de tratamientos"
        )
        
        