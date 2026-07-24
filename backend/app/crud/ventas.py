from sqlalchemy.orm import Session 
from sqlalchemy import text 
from sqlalchemy.exc import SQLAlchemyError 
from app.schemas.ventas import VentasCreate, VentasUpdate
<<<<<<< HEAD
=======
from typing import Optional

>>>>>>> 4d7f0f246392f0e0fa2474862b82d6893f3f228c
import logging

logger = logging.getLogger(__name__)

#Crear una nueva venta, aquí solo se crean los datos de la persona que realiza la compra, el detalle de la venta se crea en otro endpoint
def create_venta(db: Session, venta: VentasCreate, user_id: int):
    try:
        query = text("""INSERT INTO ventas 
                    (nombre_comprador, id_comprador, fecha_venta, user_id)
                    VALUES (:nombre_comprador, :id_comprador, :fecha_venta, :user_id)
        """)
        params =  venta.model_dump();
        params["user_id"] = user_id
        result = db.execute(query, params);
        db.commit()
        return result.lastrowid
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al crear venta: {e}")
        raise Exception("Error de base de datos al crear la venta")

# Obtener una venta por su ID
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

# Obtener todas las ventas
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

# Actualizar una venta por su ID
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

# Obtener ventas por usuario
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

# Obtener ventas por rango de fechas
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
<<<<<<< HEAD

# Obtener ventas con paginación              
def ventas_paginated(db: Session, skip: int = 0, limit: int = 10):
=======
                     
def ventas_paginated(db: Session, skip: int = 0, limit: int = 10, search: Optional[str] = None):
>>>>>>> 4d7f0f246392f0e0fa2474862b82d6893f3f228c
    """
    Obtiene ventas con paginación.
    Compatible con PostgreSQL, MySQL y SQLite.
    """
    try:
        where_clause = ""
        params = {"limit": limit, "skip": skip}
        
        if search:
            where_clause = "WHERE LOWER(v.nombre_comprador) LIKE LOWER(:search)"
            params["search"] = f"%{search}%"
        
        # Total de ventas
        count_query = text(f"""
            SELECT COUNT(v.id_venta) AS total
            FROM ventas AS v
            LEFT JOIN users AS u ON v.user_id = u.id_user
            LEFT JOIN detalle_ventas d ON v.id_venta = d.venta_id
            {where_clause}
        """)

        total_result = db.execute(count_query, params).scalar()

        # Ventas paginadas
        data_query = text(f""" 
                        SELECT  v.id_venta, v.nombre_comprador, v.id_comprador, v.fecha_venta, v.user_id,
                        u.nombre_user, COALESCE(SUM(d.precio_venta * d.cantidad), 0) AS total_venta
                        FROM ventas AS v
                        LEFT JOIN users AS u ON v.user_id = u.id_user
                        LEFT JOIN detalle_ventas d ON v.id_venta = d.venta_id
                        {where_clause}
                        AND d.estado_venta NOT IN ('Cancelado', 'Anulado')
                        GROUP BY v.id_venta, v.nombre_comprador, v.id_comprador, v.fecha_venta, v.user_id, u.nombre_user
                        LIMIT :limit OFFSET :skip
                    """)

        ventas_list = db.execute(data_query, params).mappings().all()

        return {
            "total": total_result or 0,
            "ventas": ventas_list
        }

    except SQLAlchemyError as e:
        logger.error( f"Error al obtener las ventas: {e}", exc_info=True)

        raise Exception(
            "Error de base de datos al obtener las ventas"
        )