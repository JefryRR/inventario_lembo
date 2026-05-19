from sqlalchemy.orm import Session # type: ignore
from sqlalchemy import text # type: ignore
from sqlalchemy.exc import SQLAlchemyError # type: ignore
from typing import Optional
from app.schemas.detalle_venta import DetalleVentaCreate, DetalleVentaUpdate, DetalleVentaOut

import logging

logger = logging.getLogger(__name__)

def create_detalle_venta(db: Session, detalle: DetalleVentaCreate) -> Optional[bool]:
    try:
        query = text("""
            INSERT INTO detalle_ventas (
                nombre_producto, cantidad, unidad_medida,
                precio_venta, inv_prod_id, venta_id, estado_venta
            ) VALUES (
                :nombre_producto, :cantidad, :unidad_medida,
                :precio_venta, :inv_prod_id, :venta_id, :estado_venta
            )
        """)
        db.execute(query, detalle.model_dump())
        db.commit()
        return True
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al crear el detalle de venta: {e}")
        raise Exception("Error de base de datos al crear el detalle de venta")
    
def get_detalle_venta_by_id(db: Session, id: int) -> Optional[DetalleVentaOut]:
    try:
        query = text("""
            SELECT d_v.id_detalle_venta, d_v.nombre_producto, d_v.cantidad, d_v.unidad_medida,
                   d_v.precio_venta, d_v.inv_prod_id, d_v.venta_id, d_v.estado_venta, v.nombre_comprador
            FROM detalle_ventas d_v
            LEFT JOIN ventas AS v ON d_v.venta_id = v.id_venta
            WHERE d_v.id_detalle_venta = :id
        """)
        result = db.execute(query, {"id": id}).mappings().first()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener detalle de venta por id: {e}")
        raise Exception("Error de base de datos al obtener el detalle de venta")
    
def get_all_detalles_venta(db: Session) -> list[DetalleVentaOut]:
    try:
        query = text("""
            SELECT d_v.id_detalle_venta, d_v.nombre_producto, d_v.cantidad, d_v.unidad_medida,
                   d_v.precio_venta, d_v.inv_prod_id, d_v.venta_id, d_v.estado_venta, v.nombre_comprador
            FROM detalle_ventas d_v
            LEFT JOIN ventas AS v ON d_v.venta_id = v.id_venta
            ORDER BY d_v.id_detalle_venta DESC
        """)
        results = db.execute(query).mappings().all()
        return results
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener todos los detalles de venta: {e}")
        raise Exception("Error de base de datos al obtener los detalles de venta")
    
def update_detalle_venta_by_id(db: Session, id: int, detalle_update: DetalleVentaUpdate):
    try:
    # Solo los campos enviados por el usuario
        detalle_data = detalle_update.model_dump(exclude_unset=True)
        if not detalle_data:
            return False  # nada que actualizar
         # Construir dinámicamente la sentencia UPDATE
        set_clauses = ", ".join([f"{key} = :{key}" for key in detalle_data.keys()])
        sentencia = text(f"""
             UPDATE detalle_ventas
             SET {set_clauses}
             WHERE id_detalle_venta = :id_detalle_venta
         """)
         # Agregar el id_detalle_venta
        detalle_data["id_detalle_venta"] = id
        result = db.execute(sentencia, detalle_data)
        db.commit()
        return result.rowcount > 0
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al actualizar detalle de venta {id}: {e}")
        raise Exception("Error de base de datos al actualizar el detalle de venta")
    
def get_detalles_venta_paginated(db: Session, skip: int = 0, limit: int = 10):
    """
    Obtiene detalles de venta con paginación.
    Compatible con PostgreSQL, MySQL y SQLite.
    """
    try:
        # Total de detalles de venta
        count_query = text("""
            SELECT COUNT(d_v.id_detalle_venta) AS total
            FROM detalle_ventas d_v
        """)

        total_result = db.execute(count_query).scalar()

        # Detalles de venta paginados
        data_query = text("""
            SELECT d_v.id_detalle_venta, d_v.nombre_producto, d_v.cantidad, d_v.unidad_medida,
                   d_v.precio_venta, d_v.inv_prod_id, d_v.venta_id, d_v.estado_venta, v.nombre_comprador
            FROM detalle_ventas d_v
            LEFT JOIN inv_produccion AS pr ON d_v.inv_prod_id = pr.id_inventario
            LEFT JOIN ventas AS v ON d_v.venta_id = v.id_venta
            ORDER BY d_v.fecha_reporte DESC
            LIMIT :limit OFFSET :skip
        """)

        total_result = db.execute(count_query).scalar()

        # Detalles de venta paginados
        data_query = text(""" 
                        SELECT  d_v.id_detalle_venta, d_v.nombre_producto, d_v.cantidad, d_v.unidad_medida,
                        d_v.precio_venta, d_v.inv_prod_id, d_v.venta_id, d_v.estado_venta, v.nombre_comprador
                        FROM detalle_ventas AS d_v
                        LEFT JOIN inv_produccion AS pr ON d_v.inv_prod_id = pr.id_inventario
                        LEFT JOIN ventas AS v ON d_v.venta_id = v.id_venta
                        LIMIT :limit OFFSET :skip
                    """)

        perdidas_list = db.execute(
            data_query,
            {
                "limit": limit,
                "skip": skip
            }
        ).mappings().all()

        return {
            "total": total_result or 0,
            "detalles": perdidas_list
        }

    except SQLAlchemyError as e:
        logger.error( f"Error al obtener los detalles de venta: {e}", exc_info=True)
        raise Exception("Error de base de datos al obtener los detalles de venta")