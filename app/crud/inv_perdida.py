from sqlalchemy.orm import Session # type: ignore
from sqlalchemy import text # type: ignore
from sqlalchemy.exc import SQLAlchemyError # type: ignore
from typing import Optional
from app.schemas.inv_perdida import PerdidaCreate, PerdidaUpdate, PerdidaOut, PaginatedPerdidas

import logging

logger = logging.getLogger(__name__)

def create_perdida(db: Session, perdida: PerdidaCreate) -> Optional[bool]:
    try:
        query = text("""
            INSERT INTO inv_perdidas (
                inv_prod_id, cantidad, motivo,
                fecha_reporte, user_id, observaciones
            ) VALUES (
                :inv_prod_id, :cantidad, :motivo,
                :fecha_reporte, :user_id, :observaciones
            )
        """)
        db.execute(query, perdida.model_dump())
        db.commit()
        return True
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al crear la pérdida: {e}")
        raise Exception("Error de base de datos al crear la pérdida")
    
def get_perdida_by_id(db: Session, id: int) -> Optional[PerdidaOut]:
    try:
        query = text("""
            SELECT p.id_perdida, p.inv_prod_id, p.cantidad, p.motivo,
                   p.fecha_reporte, p.user_id, p.observaciones,
                   u.nombre_user
            FROM inv_perdidas p
            LEFT JOIN inv_produccion AS pr ON p.inv_prod_id = pr.id_inventario
            LEFT JOIN users AS u ON p.user_id = u.id_user
            WHERE p.id_perdida = :id
        """)
        result = db.execute(query, {"id": id}).mappings().first()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener pérdida por id: {e}")
        raise Exception("Error de base de datos al obtener la pérdida")
    
def all_perdidas(db: Session) -> list[PerdidaOut]:
    try:
        query = text("""
            SELECT p.id_perdida, p.inv_prod_id, p.cantidad, p.motivo,
                   p.fecha_reporte, p.user_id, p.observaciones,
                   pr.nombre_producto, u.nombre_user
            FROM inv_perdidas p
            LEFT JOIN inv_produccion AS pr ON p.inv_prod_id = pr.id_inventario
            LEFT JOIN users AS u ON p.user_id = u.id_user
            ORDER BY p.fecha_reporte DESC
        """)
        results = db.execute(query).mappings().all()
        return results
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener todas las pérdidas: {e}")
        raise Exception("Error de base de datos al obtener las pérdidas")
    
def update_perdida_by_id(db: Session, id: int, perdida_update: PerdidaUpdate):
    try:
    # Solo los campos enviados por el usuario
        perdida_data = perdida_update.model_dump(exclude_unset=True)
        if not perdida_data:
            return False  # nada que actualizar
         # Construir dinámicamente la sentencia UPDATE
        set_clauses = ", ".join([f"{key} = :{key}" for key in perdida_data.keys()])
        sentencia = text(f"""
             UPDATE inv_perdidas
             SET {set_clauses}
             WHERE id_perdida = :id_perdida
         """)
         # Agregar el id_perdida
        perdida_data["id_perdida"] = id
        result = db.execute(sentencia, perdida_data)
        db.commit()
        return result.rowcount > 0
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al actualizar pérdida {id}: {e}")
        raise Exception("Error de base de datos al actualizar la pérdida")
    
def get_perdidas_paginated(db: Session, skip: int = 0, limit: int = 10):
    """
    Obtiene pérdidas con paginación.
    Compatible con PostgreSQL, MySQL y SQLite.
    """
    try:
        # Total de pérdidas
        count_query = text("""
            SELECT COUNT(p.id_perdida) AS total
            FROM inv_perdidas p
        """)

        total_result = db.execute(count_query).scalar()

        # Pérdidas paginadas
        data_query = text("""
            SELECT p.id_perdida, p.inv_prod_id, p.cantidad, p.motivo,
                   p.fecha_reporte, p.user_id, p.observaciones,
                   pr.nombre_producto, u.nombre_user
            FROM inv_perdidas p
            LEFT JOIN inv_produccion AS pr ON p.inv_prod_id = pr.id_inventario
            LEFT JOIN users AS u ON p.user_id = u.id_user
            ORDER BY p.fecha_reporte DESC
            LIMIT :limit OFFSET :skip
        """)

        total_result = db.execute(count_query).scalar()

        # Pérdidas paginadas
        data_query = text(""" 
                        SELECT  p.id_perdida, p.inv_prod_id, p.cantidad, p.motivo,
                        p.fecha_reporte, p.user_id, p.observaciones,
                        pr.nombre_producto, u.nombre_user
                        FROM inv_perdidas AS p
                        INNER JOIN inv_produccion AS pr ON p.inv_prod_id = pr.id_inventario
                        INNER JOIN users AS u ON p.user_id = u.id_user
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
            "perdidas": perdidas_list
        }

    except SQLAlchemyError as e:
        logger.error( f"Error al obtener las pérdidas: {e}", exc_info=True)

        raise Exception(
            "Error de base de datos al obtener las pérdidas"
        )