from sqlalchemy.orm import Session # type: ignore
from sqlalchemy import text # type: ignore
from sqlalchemy.exc import SQLAlchemyError # type: ignore
from typing import Optional
from app.schemas.inv_produccion import ProduccionCreate, ProduccionUpdate

import logging

logger = logging.getLogger(__name__)

def create_produccion(db: Session, produccion: ProduccionCreate):
    try:
        new_produccion = text("""
            INSERT INTO inv_produccion (nombre, descripcion, cantidad, fecha_produccion)
            VALUES (:nombre, :descripcion, :cantidad, :fecha_produccion)
        """)
        db.execute(new_produccion, {
            "nombre": produccion.nombre,
            "descripcion": produccion.descripcion,
            "cantidad": produccion.cantidad,
            "fecha_produccion": produccion.fecha_produccion
        })
        db.commit()
    except SQLAlchemyError as e:
        logger.error(f"Error al crear producción: {e}")
        db.rollback()
        raise

def get_produccion_by_id(db: Session, produccion_id: int):
    try:
        query = text("SELECT * FROM inv_produccion WHERE id = :id")
        result = db.execute(query, {"id": produccion_id}).fetchone()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener producción por ID: {e}")
        raise

def all_produccion(db: Session):
    try:
        query = text("SELECT * FROM inv_produccion")
        result = db.execute(query).fetchall()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener todas las producciones: {e}")
        raise

def update_produccion(db: Session, produccion_id: int, produccion: ProduccionUpdate):
    try:
        update_query = text("""
            UPDATE inv_produccion
            SET nombre = :nombre, descripcion = :descripcion, cantidad = :cantidad, fecha_produccion = :fecha_produccion
            WHERE id = :id
        """)
        db.execute(update_query, {
            "id": produccion_id,
            "nombre": produccion.nombre,
            "descripcion": produccion.descripcion,
            "cantidad": produccion.cantidad,
            "fecha_produccion": produccion.fecha_produccion
        })
        db.commit()
    except SQLAlchemyError as e:
        logger.error(f"Error al actualizar producción: {e}")
        db.rollback()
        raise

def produccion_paginated(db: Session, skip: int = 0, limit: int = 10):
    try:
        query = text("SELECT * FROM inv_produccion ORDER BY id LIMIT :limit OFFSET :skip")
        result = db.execute(query, {"limit": limit, "skip": skip}).fetchall()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener producciones paginadas: {e}")
        raise