from sqlalchemy.orm import Session # type: ignore
from sqlalchemy import text # type: ignore
from sqlalchemy.exc import SQLAlchemyError # type: ignore
from typing import Optional
from app.schemas.devoluciones import DevolucionCreate, DevolucionUpdate, DevolucionOut

import logging

logger = logging.getLogger(__name__)

def create_devolucion(db: Session, devolucion: DevolucionCreate) -> Optional[bool]:
    try:
        query = text("""
            INSERT INTO devoluciones (
                id_detalle_venta, cant_devolucion, unid_medida_id,
                motivo, fecha_dev, user_id, observacion
            ) VALUES (
                :id_detalle_venta, :cant_devolucion, :unid_medida_id,
                :motivo, :fecha_dev, :user_id, :observacion
            )
        """)
        db.execute(query, devolucion.model_dump())
        db.commit()
        return True
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al crear la devolución: {e}")
        raise Exception("Error de base de datos al crear la devolución")
    
def get_devolucion_by_id(db: Session, id: int) -> Optional[DevolucionOut]:
    try:
        query = text("""
                    SELECT d.id_devolucion, d.id_detalle_venta, d.cant_devolucion, d.unid_medida_id,
                    d.motivo, d.fecha_dev, d.user_id, d.observacion, dv.venta_id,
                    dv.nombre_producto, v.nombre_comprador, u.nombre_user, u_m.simbolo
                    FROM devoluciones AS d
                    LEFT JOIN detalle_ventas AS dv ON d.id_detalle_venta = dv.id_detalle_venta
                    LEFT JOIN ventas AS v ON dv.venta_id = v.id_venta
                    LEFT JOIN users AS u ON d.user_id = u.id_user
                    LEFT JOIN unidades_medida AS u_m ON d.unid_medida_id = u_m.id_unidad
                    WHERE d.id_devolucion = :id
                """)
        result = db.execute(query, {"id": id}).mappings().first()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener la devolución por id: {e}")
        raise Exception("Error de base de datos al obtener la devolución")
    
def get_all_devoluciones(db: Session) -> list[DevolucionOut]:
    try:
        query = text("""
                    SELECT d.id_devolucion, d.id_detalle_venta, d.cant_devolucion, d.unid_medida_id,
                    d.motivo, d.fecha_dev, d.user_id, d.observacion, dv.venta_id,
                    pr.nombre_producto, v.nombre_comprador, u.nombre_user, u_m.simbolo
                    FROM devoluciones AS d
                    LEFT JOIN detalle_ventas AS dv ON d.id_detalle_venta = dv.id_detalle_venta
                    LEFT JOIN ventas AS v ON dv.venta_id = v.id_venta
                    LEFT JOIN inv_produccion AS pr ON dv.inv_prod_id = pr.id_inventario
                    LEFT JOIN users AS u ON d.user_id = u.id_user
                    LEFT JOIN unidades_medida AS u_m ON d.unid_medida_id = u_m.id_unidad
                    ORDER BY d.fecha_dev DESC
                """)
        result = db.execute(query).mappings().all()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener todas las devoluciones: {e}")
        raise Exception("Error de base de datos al obtener las devoluciones")
    
def update_devolucion_by_id(db: Session, id: int, devolucion_update: DevolucionUpdate):
    try:
    # Solo los campos enviados por el usuario
        devolucion_data = devolucion_update.model_dump(exclude_unset=True)
        if not devolucion_data:
            return False  # nada que actualizar
         # Construir dinámicamente la sentencia UPDATE
        set_clauses = ", ".join([f"{key} = :{key}" for key in devolucion_data.keys()])
        sentencia = text(f"""
             UPDATE devoluciones
             SET {set_clauses}
             WHERE id_devolucion = :id_devolucion
         """)
         # Agregar el id_devolucion
        devolucion_data["id_devolucion"] = id
        result = db.execute(sentencia, devolucion_data)
        db.commit()
        return result.rowcount > 0
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al actualizar devolución {id}: {e}")
        raise Exception("Error de base de datos al actualizar la devolución")
    
def get_devoluciones_paginated(db: Session, skip: int = 0, limit: int = 10):
    """
    Obtiene devoluciones con paginación.
    Compatible con PostgreSQL, MySQL y SQLite.
    """
    try:
        # Total de devoluciones
        count_query = text("""
            SELECT COUNT(d.id_devolucion) AS total
            FROM devoluciones d
        """)

        total_result = db.execute(count_query).scalar()

        # Devoluciones paginadas
        data_query = text("""
                    SELECT d.id_devolucion, d.id_detalle_venta, d.cant_devolucion, d.unid_medida_id,
                    d.motivo, d.fecha_dev, d.user_id, d.observacion, dv.venta_id,
                    dv.nombre_producto, v.nombre_comprador, u.nombre_user, u_m.simbolo
                    FROM devoluciones AS d
                    LEFT JOIN detalle_ventas AS dv ON d.id_detalle_venta = dv.id_detalle_venta
                    LEFT JOIN ventas AS v ON dv.venta_id = v.id_venta
                    LEFT JOIN users AS u ON d.user_id = u.id_user
                    LEFT JOIN unidades_medida AS u_m ON d.unid_medida_id = u_m.id_unidad
                    ORDER BY d.fecha_dev DESC
                    LIMIT :limit OFFSET :skip
                """)

        total_result = db.execute(count_query).scalar()

        # Devoluciones paginadas
        data_query = text(""" 
                        SELECT  d.id_devolucion, d.id_detalle_venta, d.venta_id, d.cant_devolucion, d.unid_medida_id,
                        d.motivo, d.fecha_dev, d.user_id, d.observacion,
                        dv.nombre_producto, v.nombre_comprador, u.nombre_user, u_m.simbolo
                        FROM devoluciones AS d
                        LEFT JOIN detalle_ventas AS dv ON d.id_detalle_venta = dv.id_detalle_venta
                        LEFT JOIN ventas AS v ON d.venta_id = v.id_venta
                        LEFT JOIN users AS u ON d.user_id = u.id_user
                        LEFT JOIN unidades_medida AS u_m ON d.unid_medida_id = u_m.id_unidad
                        ORDER BY d.fecha_dev DESC
                        LIMIT :limit OFFSET :skip
                    """)

        devoluciones_list = db.execute(
            data_query,
            {
                "limit": limit,
                "skip": skip
            }
        ).mappings().all()

        return {
            "total": total_result or 0,
            "devoluciones": devoluciones_list
        }

    except SQLAlchemyError as e:
        logger.error( f"Error al obtener las devoluciones: {e}", exc_info=True)
        raise Exception("Error de base de datos al obtener las devoluciones")