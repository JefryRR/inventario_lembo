from sqlalchemy.orm import Session # type: ignore
from sqlalchemy import text # type: ignore
from sqlalchemy.exc import SQLAlchemyError # type: ignore
from app.schemas.ventas import VentasCreate, VentasUpdate

import logging

logger = logging.getLogger(__name__)

def create_venta(db: Session, venta: VentasCreate):
    try:
        query = text("""INSERT INTO ventas 
                    (nombre_comprador, id_comprador, fecha_venta, user_id)
                    VALUES (:nombre_comprador, :id_comprador, :fecha_venta, :user_id)
        """)
        result = db.execute(query, venta.model_dump())
        db.commit()
        return result.lastrowid
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al crear venta: {e}")
        raise Exception("Error de base de datos al crear la venta")
    
def get_venta_by_id(db: Session, id: int):
    try:
        query = text("""SELECT v.id_venta, v.nombre_comprador, v.id_comprador, 
                     v.fecha_venta, v.user_id, u.nombre_user, COALESCE(SUM(d.precio_venta * d.cantidad), 0) AS total_venta
                     FROM ventas v
                     LEFT JOIN users u ON v.user_id = u.id_user
                     LEFT JOIN detalle_ventas d ON v.id_venta = d.venta_id
                        AND d.estado_venta NOT IN ('Cancelado', 'Anulado')
                     WHERE v.id_venta = :id
                     GROUP BY v.id_venta, v.nombre_comprador, v.id_comprador, 
                     v.fecha_venta, v.user_id, u.nombre_user
                """)
        result = db.execute(query, {"id": id}).mappings().first()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener venta por ID: {e}")
        raise Exception("Error de base de datos al obtener la venta")
    
def all_ventas(db: Session):
    try:
        query = text("""SELECT v.id_venta, v.nombre_comprador, v.id_comprador, 
                     v.fecha_venta, v.user_id, u.nombre_user, COALESCE(SUM(d.precio_venta * d.cantidad), 0) AS total_venta
                     FROM ventas v
                     LEFT JOIN users u ON v.user_id = u.id_user
                     LEFT JOIN detalle_ventas d ON v.id_venta = d.venta_id
                        AND d.estado_venta NOT IN ('Cancelado', 'Anulado')
                     GROUP BY v.id_venta, v.nombre_comprador, v.id_comprador, 
                     v.fecha_venta, v.user_id, u.nombre_user
                    """)
        result = db.execute(query).mappings().all()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener todas las ventas: {e}")
        raise Exception("Error de base de datos al obtener todas las ventas")

def update_venta(db: Session, venta_id: int, venta: VentasUpdate):
    try:
        venta_data = venta.model_dump(exclude_unset=True)
        if not venta_data:
            raise Exception("No se proporcionaron datos para actualizar la venta")
        
        set_clauses = ", ".join([f"{key} = :{key}" for key in venta_data.keys()])
        query = text(f"""
            UPDATE ventas
            SET {set_clauses}
            WHERE id_venta = :id
        """)
        
        venta_data["id"] = venta_id
        result = db.execute(query, venta_data)
        db.commit()
        return result.rowcount > 0
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al actualizar venta: {e}")
        raise Exception("Error de base de datos al actualizar la venta")
    
def ventas_by_user(db: Session, user_id: int):
    try:
        query = text("""SELECT v.id_venta, v.nombre_comprador, v.id_comprador, 
                     v.fecha_venta, v.user_id, u.nombre_user
                     FROM ventas v
                     LEFT JOIN users u ON v.user_id = u.id_user
                     WHERE v.user_id = :user_id
                """)
        result = db.execute(query, {"user_id": user_id}).mappings().all()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener ventas por usuario: {e}")
        raise Exception("Error de base de datos al obtener ventas por usuario")
    
def get_ventas_by_date_range(db: Session, fecha_inicio: str, fecha_fin: str):
    """
    Obtiene las ventas cuya fecha de inicio o fin esté dentro de un rango de fechas.
    Ignora las horas (usa DATE(fecha_hora_init) y DATE(fecha_hora_fin)).
    """
    try:
        query = text("""
            SELECT v.id_venta, v.nombre_comprador, v.id_comprador, v.fecha_venta, v.user_id, u.nombre_user, 
            COALESCE(SUM(d.precio_venta * d.cantidad), 0) AS total_venta
            FROM ventas v
            LEFT JOIN detalle_ventas d ON v.id_venta = d.venta_id
            LEFT JOIN users u ON v.user_id = u.id_user
            WHERE DATE(v.fecha_venta) BETWEEN :fecha_inicio AND :fecha_fin
            GROUP BY v.id_venta, v.nombre_comprador, v.id_comprador, v.fecha_venta, v.user_id, u.nombre_user
            ORDER BY v.fecha_venta DESC
        """)
        result = db.execute(query, {
            "fecha_inicio": fecha_inicio,
            "fecha_fin": fecha_fin
        }).mappings().all()

        return [dict(row) for row in result]

    except SQLAlchemyError as e:
        raise Exception(f"Error al consultar las ventas por rango de fechas: {e}")
                     
def ventas_paginated(db: Session, skip: int = 0, limit: int = 10):
    """
    Obtiene ventas con paginación.
    Compatible con PostgreSQL, MySQL y SQLite.
    """
    try:
        # Total de ventas
        count_query = text("""
            SELECT COUNT(v.id_venta) AS total
            FROM ventas AS v
            LEFT JOIN users ON v.user_id = users.id_user
        """)

        total_result = db.execute(count_query).scalar()

        # Ventas paginadas
        data_query = text(""" 
                        SELECT  v.id_venta, v.nombre_comprador, v.id_comprador, v.fecha_venta, v.user_id,
                        u.nombre_user, COALESCE(SUM(d.precio_venta * d.cantidad), 0) AS total_venta
                        FROM ventas AS v
                        LEFT JOIN users AS u ON v.user_id = u.id_user
                        LEFT JOIN detalle_ventas d ON v.id_venta = d.venta_id
                            AND d.estado_venta NOT IN ('Cancelado', 'Anulado')
                        GROUP BY v.id_venta, v.nombre_comprador, v.id_comprador, v.fecha_venta, v.user_id, u.nombre_user
                        LIMIT :limit OFFSET :skip
                    """)

        ventas_list = db.execute(
            data_query,
            {
                "limit": limit,
                "skip": skip
            }
        ).mappings().all()

        return {
            "total": total_result or 0,
            "ventas": ventas_list
        }

    except SQLAlchemyError as e:
        logger.error( f"Error al obtener las ventas: {e}", exc_info=True)

        raise Exception(
            "Error de base de datos al obtener las ventas"
        )