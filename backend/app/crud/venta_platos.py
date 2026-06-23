from sqlalchemy.orm import Session # type: ignore
from sqlalchemy import text # type: ignore
from sqlalchemy.exc import SQLAlchemyError # type: ignore
from datetime import date
from app.schemas.venta_platos import VentaPlatoCreate, VentaPlatoUpdate
import logging

logger = logging.getLogger(__name__)

def create_ventaPlato(db: Session, platos: VentaPlatoCreate):
    try:
        query = text("""INSERT INTO venta_platos 
                        (plato_id, cantidad, precio, fecha_venta
                        ) VALUES (
                        :plato_id, :cantidad, :precio, :fecha_venta)
                    """)
        db.execute(query, platos.model_dump())
        db.commit()
        return True
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al registrar la venta del plato: {e}")
        raise Exception("Error de base de datos al crear la venta del plato")

def get_ventaPlato_by_id(db: Session, id: int):
    try:
        query = text("""SELECT vp.id_venta_plato, vp.plato_id, vp.cantidad, vp.precio, vp.fecha_venta, p.nombre_plato
                     FROM venta_platos vp
                     LEFT JOIN platos p ON vp.plato_id = p.id_plato
                     WHERE vp.id_venta_plato = :id
                """)
        result = db.execute(query, {"id": id}).mappings().first()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener la venta por ID: {e}")
        raise Exception("Error de base de datos al obtener la venta por ID")

def update_ventaPlato_by_id(db: Session, ventaP_id: int, ventaP: VentaPlatoUpdate):
    try:
        ventaP_data = ventaP.model_dump(exclude_unset=True)
        if not ventaP_data:
            return False
        set_clauses = ", ".join([f"{key} = :{key}" for key in ventaP_data.keys()])
        query = text(f"""
            UPDATE venta_platos
            SET {set_clauses}
            WHERE id_venta_plato = :id_venta_plato
        """)
        
        ventaP_data["id_venta_plato"] = ventaP_id
        result = db.execute(query, ventaP_data)
        db.commit()
        return result.rowcount > 0
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al actualizar la venta {ventaP_id}: {e}")
        raise Exception("Error de base de datos al actualizar la venta")

def get_ventas_by_date_range(db: Session, fecha_inicio: str, fecha_fin: str):
    """
    Obtiene las ventas cuya fecha de inicio o fin esté dentro de un rango de fechas.
    Ignora las horas (usa DATE(fecha_hora_init) y DATE(fecha_hora_fin)).
    """
    try:
        query = text("""
                    SELECT vp.id_venta_plato, vp.plato_id, vp.cantidad, vp.precio, vp.fecha_venta, p.nombre_plato
                    FROM venta_platos AS vp
                    LEFT JOIN platos AS p ON vp.plato_id = p.id_plato
                    WHERE DATE(vp.fecha_venta) BETWEEN :fecha_inicio AND :fecha_fin
                    ORDER BY vp.fecha_venta DESC
                """)
        result = db.execute(query, {
            "fecha_inicio": fecha_inicio,
            "fecha_fin": fecha_fin
        }).mappings().all()
        
        return [dict(row) for row in result]

    except SQLAlchemyError as e:
        raise Exception(f"Error al consultar las ventas por rango de fechas: {e}")

def all_ventas_platos(db: Session):
    try:
        query = text("""SELECT vp.id_venta_plato, vp.plato_id, vp.cantidad, vp.precio, vp.fecha_venta, p.nombre_plato
                        FROM venta_platos vp
                        LEFT JOIN platos p ON vp.plato_id = p.id_plato
                    """)
        result = db.execute(query).mappings().all()
        return result
    
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener todas las ventas: {e}")
        raise Exception("Error de base de datos al obtener todas las ventas")

def get_ventas_platos_paginated(db: Session, skip: int = 0, limit: int = 10):

    """
    Obtiene inventario de producción con paginación.
    Compatible con PostgreSQL, MySQL y SQLite.
    """
    try:
        # Total de producción
        count_query = text("""
            SELECT COUNT(id_venta_plato) AS total
            FROM venta_platos
        """)

        total_result = db.execute(count_query).scalar()

        # Producción paginada
        data_query = text(""" 
                        SELECT vp.id_venta_plato, vp.plato_id, vp.cantidad, vp.precio, vp.fecha_venta, p.nombre_plato
                        FROM venta_platos vp
                        LEFT JOIN platos p ON vp.plato_id = p.id_plato
                        LIMIT :limit OFFSET :skip
                    """)
            
        ventas_list = db.execute(data_query, {"limit": limit, "skip": skip}).mappings().all()

        return {
                "total": total_result or 0,
                "ventaPlatos": ventas_list
            }

    except SQLAlchemyError as e:
        logger.error(f"Error al obtener las ventas: {e}", exc_info=True)
        raise Exception("Error de base de datos al obtener las ventas")
    