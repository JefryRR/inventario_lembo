from sqlalchemy.orm import Session 
from sqlalchemy import text 
from sqlalchemy.exc import SQLAlchemyError 
from app.schemas.platos import PlatoCreate, PlatoUpdate
from typing import Optional

import logging

logger = logging.getLogger(__name__)

# Crear un plato nuevo
def create_platos(db: Session, platos: PlatoCreate):
    try:
        query = text("""INSERT INTO platos 
                        (nombre_plato, estado, fecha_registro
                        ) VALUES (
                        :nombre_plato, :estado, :fecha_registro)
                    """)
        db.execute(query, platos.model_dump())
        db.commit()
        return True
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al crear el plato: {e}")
        raise Exception("Error de base de datos al crear el plato")

# Obtener un plato por su ID
def get_plato_by_id(db: Session, id: int):
    try:
        query = text("""SELECT id_plato, nombre_plato, estado, fecha_registro
                     FROM platos
                     WHERE id_plato = :id
                """)
        result = db.execute(query, {"id": id}).mappings().first()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener plato por ID: {e}")
        raise Exception("Error de base de datos al obtener el plato")

# Actualizar un plato por su ID
def update_plato_by_id(db: Session, plato_id: int, plato: PlatoUpdate):
    try:
        plato_data = plato.model_dump(exclude_unset=True)
        if not plato_data:
            return False
        set_clauses = ", ".join([f"{key} = :{key}" for key in plato_data.keys()])
        query = text(f"""
            UPDATE platos
            SET {set_clauses}
            WHERE id_plato = :id_plato
        """)
        
        plato_data["id_plato"] = plato_id
        result = db.execute(query, plato_data)
        db.commit()
        return result.rowcount > 0
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al actualizar el plato {plato_id}: {e}")
        raise Exception("Error de base de datos al actualizar el plato")

# Obtener los platos por un rango de fechas
def get_platos_by_date_range(db: Session, fecha_inicio: str, fecha_fin: str):
    """
    Obtiene los platos cuya fecha de inicio o fin esté dentro de un rango de fechas.
    Ignora las horas (usa DATE(fecha_hora_init) y DATE(fecha_hora_fin)).
    """
    try:
        query = text("""
                    SELECT id_plato, nombre_plato, estado, fecha_registro
                    FROM platos
                    WHERE DATE(fecha_registro) BETWEEN :fecha_inicio AND :fecha_fin
                    ORDER BY fecha_registro DESC
                """)
        result = db.execute(query, {
            "fecha_inicio": fecha_inicio,
            "fecha_fin": fecha_fin
        }).mappings().all()
        
        return [dict(row) for row in result]

    except SQLAlchemyError as e:
        raise Exception(f"Error al consultar los platos por rango de fechas: {e}")

# Obtener todos los platos
def all_platos(db: Session):
    try:
        query = text("""SELECT id_plato, nombre_plato, estado, fecha_registro
                        FROM platos
                        ORDER BY fecha_registro DESC
                    """)
        result = db.execute(query).mappings().all()
        return result
    
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener todas las producciones: {e}")
        raise Exception("Error de base de datos al obtener todas los platos")

# Cambiar el estado de un plato
def change_plato_estado(db: Session, plato_id: int, nuevo_estado: bool):
    """
    Cambia el estado de un plato.
    """
    try:
        query = text("""
            UPDATE platos
            SET estado = :nuevo_estado
            WHERE id_plato = :plato_id
        """)
        result = db.execute(query, {"nuevo_estado": nuevo_estado, "plato_id": plato_id})
        db.commit()
        return result.rowcount > 0
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al cambiar el estado del plato {plato_id}: {e}")
        raise Exception("Error de base de datos al cambiar el estado del plato")

# Obtener todos los platos con paginación y búsqueda
def get_platos_paginated(db: Session, skip: int = 0, limit: int = 10, search: Optional[str] = None):

    """
    Obtiene inventario de producción con paginación.
    Compatible con PostgreSQL, MySQL y SQLite.
    """
    try:
        where_clause = ""
        params = {"limit": limit, "skip": skip}
        
        if search:
            where_clause = "WHERE LOWER(nombre_plato) LIKE LOWER(:search)"
            params["search"] = f"%{search}%"
        
        # Total de producción
        count_query = text(f"""
            SELECT COUNT(id_plato) AS total
            FROM platos
            {where_clause}
        """)

        total_result = db.execute(count_query, params).scalar()

        # Producción paginada
        data_query = text(f""" 
                        SELECT id_plato, nombre_plato, estado, fecha_registro
                        FROM platos
                        {where_clause}
                        ORDER BY fecha_registro DESC
                        LIMIT :limit OFFSET :skip
                    """)
            
        platos_list = db.execute( data_query, params ).mappings().all()

        return {
            "total": total_result or 0,
            "platos": platos_list
        }

    except SQLAlchemyError as e:
        logger.error(f"Error al obtener los platos: {e}", exc_info=True)
        raise Exception("Error de base de datos al obtener los platos")
    