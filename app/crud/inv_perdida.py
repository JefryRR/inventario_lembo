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
            INSERT INTO inv_perdida (
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
                   pr.nombre_producto, u.nombre_user
            FROM inv_perdida p
            JOIN inv_productos pr ON p.inv_prod_id = pr.id_producto
            JOIN users u ON p.user_id = u.id_user
            WHERE p.id_perdida = :id
        """)
        result = db.execute(query, {"id": id}).mappings().first()
        if result:
            return PerdidaOut(**result)
        return None
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener pérdida por id: {e}")
        raise Exception("Error de base de datos al obtener la pérdida")
    
def all_perdidas(db: Session) -> list[PerdidaOut]:
    try:
        query = text("""
            SELECT p.id_perdida, p.inv_prod_id, p.cantidad, p.motivo,
                   p.fecha_reporte, p.user_id, p.observaciones,
                   pr.nombre_producto, u.nombre_user
            FROM inv_perdida p
            JOIN inv_productos pr ON p.inv_prod_id = pr.id_producto
            JOIN users u ON p.user_id = u.id_user
            ORDER BY p.fecha_reporte DESC
        """)
        results = db.execute(query).mappings().all()
        return [PerdidaOut(**row) for row in results]
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener todas las pérdidas: {e}")
        raise Exception("Error de base de datos al obtener las pérdidas")
    
def update_perdida_by_id(db: Session, id: int, perdida_update: PerdidaUpdate) -> Optional[bool]:
    try:
    # Solo los campos enviados por el cliente
        perdida_data = perdida_update.model_dump(exclude_unset=True)
        if not perdida_data:
             return False  # nada que actualizar
         # Construir dinámicamente la sentencia UPDATE
        set_clauses = ", ".join([f"{key} = :{key}" for key in perdida_data.keys()])
        sentencia = text(f"""
             UPDATE inv_perdida
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
    
def get_perdidas_paginated(db: Session, page: int = 1, page_size: int = 10) -> PaginatedPerdidas:
    try:
        offset = (page - 1) * page_size
        total_query = text("SELECT COUNT(*) FROM inv_perdida")
        total_perdidas = db.execute(total_query).scalar()
        
        query = text("""
            SELECT p.id_perdida, p.inv_prod_id, p.cantidad, p.motivo,
                   p.fecha_reporte, p.user_id, p.observaciones,
                   pr.nombre_producto, u.nombre_user
            FROM inv_perdida p
            JOIN inv_productos pr ON p.inv_prod_id = pr.id_producto
            JOIN users u ON p.user_id = u.id_user
            ORDER BY p.fecha_reporte DESC
            LIMIT :limit OFFSET :offset
        """)
        results = db.execute(query, {"limit": page_size, "offset": offset}).mappings().all()
        perdidas = [PerdidaOut(**row) for row in results]
        
        total_pages = (total_perdidas + page_size - 1) // page_size
        
        return PaginatedPerdidas(
            page=page,
            page_size=page_size,
            total_perdidas=total_perdidas,
            total_pages=total_pages,
            perdidas=perdidas
        )
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener pérdidas paginadas: {e}")
        raise Exception("Error de base de datos al obtener las pérdidas")