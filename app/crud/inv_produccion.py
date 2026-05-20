from sqlalchemy.orm import Session # type: ignore
from sqlalchemy import text # type: ignore
from sqlalchemy.exc import SQLAlchemyError # type: ignore
from app.schemas.inv_produccion import ProduccionCreate, ProduccionUpdate

import logging

logger = logging.getLogger(__name__)

def create_produccion(db: Session, produccion: ProduccionCreate):
    try:

        query = text("""INSERT INTO inv_produccion 
                    (cantidad, unid_medida, fecha_ingreso, fecha_vencimiento, lote_id, valor_unitario, categoria_id, especie_id)
                    VALUES (:cantidad, :unid_medida, :fecha_ingreso, :fecha_vencimiento, :lote_id, :valor_unitario, :categoria_id, :especie_id)
        """)
        db.execute(query, produccion.model_dump())
        db.commit()
        return True
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al crear producción: {e}")
        raise Exception("Error de base de datos al crear la producción")

def get_produccion_by_id(db: Session, id: int):
    try:
        query = text("""SELECT pr.id_inventario, pr.cantidad, pr.unid_medida,
                     pr.fecha_ingreso, pr.fecha_vencimiento, pr.lote_id, pr.valor_unitario, pr.categoria_id,
                     pr.especie_id, l.nombre_lote, c.nombre_categoria, e.nombre_especie
                     FROM inv_produccion pr
                     LEFT JOIN lote_produccion AS l ON pr.lote_id = l.id_lote
                     LEFT JOIN categorias AS c ON pr.categoria_id = c.id_categoria
                     LEFT JOIN especies AS e ON pr.especie_id = e.id_especie
                     WHERE pr.id_inventario = :id
                """)
        result = db.execute(query, {"id": id}).mappings().first()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener producción por ID: {e}")
        raise Exception("Error de base de datos al obtener la producción")

def all_produccion(db: Session):
    try:
        query = text("""SELECT pr.id_inventario, pr.cantidad, pr.unid_medida,
                     pr.fecha_ingreso, pr.fecha_vencimiento, pr.lote_id, pr.valor_unitario, pr.categoria_id,
                     pr.especie_id, l.nombre_lote, c.nombre_categoria, e.nombre_especie
                     FROM inv_produccion pr
                     LEFT JOIN lote_produccion AS l ON pr.lote_id = l.id_lote
                     LEFT JOIN categorias AS c ON pr.categoria_id = c.id_categoria
                     LEFT JOIN especies AS e ON pr.especie_id = e.id_especie
                    """)
        result = db.execute(query).mappings().all()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener todas las producciones: {e}")
        raise Exception("Error de base de datos al obtener todas las producciones")

def update_produccion(db: Session, produccion_id: int, produccion: ProduccionUpdate):
    try:
        produccion_data = produccion.model_dump(exclude_unset=True)
        if not produccion_data:
            return False
        set_clauses = ", ".join([f"{key} = :{key}" for key in produccion_data.keys()])
        query = text(f"""
            UPDATE inv_produccion
            SET {set_clauses}
            WHERE id_inventario = :id_inventario
        """)
        
        produccion_data["id_inventario"] = produccion_id
        result = db.execute(query, produccion_data)
        db.commit()
        return result.rowcount > 0
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al actualizar la producción {produccion_id}: {e}")
        raise Exception("Error de base de datos al actualizar la produccción")

def get_produccion_paginated(db: Session, skip: int = 0, limit: int = 10):
    """
    Obtiene inventario de producción con paginación.
    Compatible con PostgreSQL, MySQL y SQLite.
    """
    try:
        # Total de producción
        count_query = text("""
            SELECT COUNT(pr.id_inventario) AS total
            FROM inv_produccion AS pr
            LEFT JOIN lote_produccion AS l ON pr.lote_id = l.id_lote
            LEFT JOIN categorias AS c ON pr.categoria_id = c.id_categoria
            LEFT JOIN especies AS e ON pr.especie_id = e.id_especie
        """)

        total_result = db.execute(count_query).scalar()

        # Producción paginada
        data_query = text(""" 
                        SELECT  pr.id_inventario, pr.cantidad, pr.unid_medida, pr.fecha_ingreso, pr.fecha_vencimiento,
                        pr.lote_id, pr.valor_unitario, l.nombre_lote,
                        pr.especie_id, pr.categoria_id,
                        e.nombre_especie, c.nombre_categoria
                        FROM inv_produccion AS pr
                        LEFT JOIN lote_produccion AS l ON pr.lote_id = l.id_lote
                        LEFT JOIN categorias AS c ON pr.categoria_id = c.id_categoria
                        LEFT JOIN especies AS e ON pr.especie_id = e.id_especie
                        LIMIT :limit OFFSET :skip
                    """)

        prod_list = db.execute(
            data_query,
            {
                "limit": limit,
                "skip": skip
            }
        ).mappings().all()

        return {
            "total": total_result or 0,
            "produccion": prod_list
        }

    except SQLAlchemyError as e:
        logger.error(f"Error al obtener la producción: {e}", exc_info=True)
        raise Exception("Error de base de datos al obtener la producción")