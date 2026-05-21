from sqlalchemy.orm import Session
from sqlalchemy import text 
from sqlalchemy.exc import SQLAlchemyError 
from app.schemas.inv_insumos import InsumoCreate, InsumoUpdate

import logging

logger = logging.getLogger(__name__)

def create_insumo(db: Session, insumo: InsumoCreate):
    try:

        insumo_exitente = db.execute(
            text("SELECT id_insumo FROM inv_insumos WHERE nombre_producto = :nombre_producto"),
            {"nombre_producto": insumo.nombre_producto}
        ).fetchone()

        if insumo_exitente:
            raise Exception("Ya existe un insumo con ese nombre")
        
        query = text("""
                    INSERT INTO inv_insumos(
                    nombre_producto, cantidad, unid_medida_id, precio_unitario, min_stock, fecha_ingreso, fecha_vencimiento, tipo_id)
                    VALUES (:nombre_producto, :cantidad, :unid_medida_id, :precio_unitario, :min_stock, :fecha_ingreso, 
                    :fecha_vencimiento, :tipo_id)
                    """)
        db.execute(query, insumo.model_dump())
        db.commit()
        return True
    except SQLAlchemyError as e:
        logger.error(f"Error al registrar el insumo: {e}")
        db.rollback()
        raise

def get_insumo_by_id(db: Session, insumo_id: int):
    try:
        query = text("""SELECT i_in.id_insumo, i_in.nombre_producto, i_in.cantidad, i_in.unid_medida_id, i_in.precio_unitario,
                      i_in.min_stock, i_in.fecha_ingreso, i_in.fecha_vencimiento, i_in.tipo_id, t_i.nombre_tipo, u_m.simbolo
                     FROM inv_insumos AS i_in
                     INNER JOIN  tipo_insumo AS t_i ON i_in.tipo_id = t_i.id_tipo_insumo
                     LEFT JOIN unidades_medida AS u_m ON i_in.unid_medida_id = u_m.id_unidad
                     WHERE i_in.id_insumo = :id""")
        result = db.execute(query, {"id": insumo_id}).fetchone()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener el insumo por id: {e}")
        raise

def get_all_insumos(db: Session):
    try:
        query = text("""SELECT i_in.id_insumo, i_in.nombre_producto, i_in.cantidad, i_in.unid_medida_id, i_in.precio_unitario,
                      i_in.min_stock, i_in.fecha_ingreso, i_in.fecha_vencimiento, i_in.tipo_id, t_i.nombre_tipo, u_m.simbolo
                     FROM inv_insumos AS i_in
                     INNER JOIN  tipo_insumo AS t_i ON i_in.tipo_id = t_i.id_tipo_insumo
                     LEFT JOIN unidades_medida AS u_m ON i_in.unid_medida_id = u_m.id_unidad
                     """)
        result = db.execute(query).fetchall()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener todas las insumoses: {e}")
        raise

def update_insumo_by_id(db: Session, insumo_id: int, insumo: InsumoUpdate):
    try:
         # Solo los campos enviados por el cliente
        insumo_data = insumo.model_dump(exclude_unset=True)
        if not insumo_data:
             return False  # nada que actualizar
         # Construir dinámicamente la sentencia UPDATE
        set_clauses = ", ".join([f"{key} = :{key}" for key in insumo_data.keys()])
        sentencia = text(f"""
             UPDATE inv_insumos
             SET {set_clauses}
             WHERE id_insumo = :id_insumo
         """)
         # Agregar el id_insumo
        insumo_data["id_insumo"] = insumo_id
        result = db.execute(sentencia, insumo_data)
        db.commit()
        return result.rowcount > 0
    except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Error al actualizar insumo {insumo_id}: {e}")
            raise Exception("Error de base de datos al actualizar el insumo")

def get_insumos_paginated(db: Session, skip: int = 0, limit: int = 10):
    """
    Obtiene insumos con paginación.
    Compatible con PostgreSQL, MySQL y SQLite.
    """
    try:
        # Total de insumos
        count_query = text("""
            SELECT COUNT(inv_insumos.id_insumo) AS total
            FROM inv_insumos
            LEFT JOIN tipo_insumo ON inv_insumos.tipo_id = tipo_insumo.id_tipo_insumo
        """)

        total_result = db.execute(count_query).scalar()

        # Insumos paginados
        data_query = text(""" 
                        SELECT i_in.id_insumo, i_in.nombre_producto, i_in.cantidad, i_in.unid_medida_id, i_in.precio_unitario,
                        i_in.min_stock, i_in.fecha_ingreso, i_in.fecha_vencimiento, i_in.tipo_id, t_i.nombre_tipo, u_m.simbolo
                        FROM inv_insumos AS i_in
                        INNER JOIN  tipo_insumo AS t_i ON i_in.tipo_id = t_i.id_tipo_insumo
                        LEFT JOIN unidades_medida AS u_m ON i_in.unid_medida_id = u_m.id_unidad
                        LIMIT :limit OFFSET :skip
                    """)

        insumos_list = db.execute(
            data_query,
            {
                "limit": limit,
                "skip": skip
            }
        ).mappings().all()

        return {
            "total": total_result or 0,
            "insumos": insumos_list
        }

    except SQLAlchemyError as e:
        logger.error( f"Error al obtener los insumos: {e}", exc_info=True)

        raise Exception(
            "Error de base de datos al obtener los insumos"
        )