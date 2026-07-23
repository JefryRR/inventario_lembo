from sqlalchemy.orm import Session # type: ignore
from sqlalchemy import text # type: ignore
from sqlalchemy.exc import SQLAlchemyError # type: ignore
from datetime import date, datetime
from app.schemas.maquinaria import MaquinariaCreate, MaquinariaUpdate
from typing import Optional

import logging

logger = logging.getLogger(__name__)

def create_maquina(db: Session, maquina: MaquinariaCreate, user_id: int):
    try:
        existing_maquina = get_maquina_by_num_serie(db, maquina.num_serie)
        if existing_maquina:
            raise ValueError("Ya existe una máquina con ese número de serie")

        query = text("""INSERT INTO maquinaria 
                        (nombre_maq, tipo_maq, marca, modelo, num_serie, fecha_compra, ubicacion, observaciones
                        ) VALUES (
                        :nombre_maq, :tipo_maq, :marca, :modelo, :num_serie, :fecha_compra, :ubicacion, :observaciones )
                    """)
        result = db.execute(query, maquina.model_dump())

        id_maquina = result.lastrowid  # o db.execute(text("SELECT LASTVAL()")).scalar() según motor

        historial_query = text("""
            INSERT INTO historial_maquinaria (id_maquina, estado, user_id, fecha_cambio, observaciones)
            VALUES (:id_maquina, 'operativa', :user_id, :fecha_cambio, :observaciones)
        """)
        db.execute(historial_query, {
            "id_maquina": id_maquina,
            "user_id": user_id,
            "fecha_cambio": datetime.now(),
            "observaciones": maquina.observaciones,
        })

        db.commit()
        return True
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al registrar la máquina: {e}")
        raise Exception("Error de base de datos al registrar la máquina")

def get_maquina_by_id(db: Session, id: int):
    try:
        query = text("""SELECT id_maquina, nombre_maq, tipo_maq, marca, modelo,
                  num_serie, fecha_compra, estado, ubicacion, observaciones, fecha_de_baja
                     FROM maquinaria
                     WHERE id_maquina = :id_maq
                """)
        result = db.execute(query, {"id_maq": id}).mappings().first()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener la máquina por ID: {e}")
        raise Exception("Error de base de datos al obtener la máquina")

def get_maquina_by_num_serie(db: Session, num_serie: str):
    try:
        query = text("""SELECT id_maquina, nombre_maq, tipo_maq, marca, modelo,
                  num_serie, fecha_compra, estado, ubicacion, observaciones, fecha_de_baja
                     FROM maquinaria
                     WHERE num_serie = :num_serie
                """)
        result = db.execute(query, {"num_serie": num_serie}).mappings().first()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener la máquina por número de serie: {e}")
        raise Exception("Error de base de datos al obtener la máquina")

def update_maquina(db: Session, maquina_id: int, maquina: MaquinariaUpdate, user_id: int):
    try:
        estado_actual = db.execute(
            text("SELECT estado FROM maquinaria WHERE id_maquina = :id_maquina"),
            {"id_maquina": maquina_id}
        ).scalar_one_or_none()

        if estado_actual is None:
            raise ValueError(f"No se encontró la máquina con id {maquina_id}")

        if estado_actual == 'de_baja':
            raise ValueError("No se puede modificar los datos de la máquina que está de baja")

        maquina_data = maquina.model_dump(exclude_unset=True)
        if not maquina_data:
            return False
        
        if maquina_data.get("estado") == 'de_baja' and estado_actual != 'de_baja':
            maquina_data["fecha_de_baja"] = date.today()

        set_clauses = ", ".join([f"{key} = :{key}" for key in maquina_data.keys()])
        query = text(f"""
            UPDATE maquinaria
            SET {set_clauses}
            WHERE id_maquina = :id_maquina
        """)
        
        maquina_data["id_maquina"] = maquina_id
        result = db.execute(query, maquina_data)

        nuevo_estado = maquina_data.get("estado")
        if nuevo_estado and nuevo_estado != estado_actual:
            historial_query = text("""
                INSERT INTO historial_maquinaria (id_maquina, estado, user_id, fecha_cambio, observaciones)
                VALUES (:id_maquina, :estado, :user_id, :fecha_cambio, :observaciones)
            """)
            db.execute(historial_query, {
                "id_maquina": maquina_id,
                "estado": nuevo_estado,
                "user_id": user_id,
                "fecha_cambio": datetime.now(),
                "observaciones": maquina_data.get("observaciones"),
            })

        db.commit()
        return result.rowcount > 0
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al actualizar la máquina {maquina_id}: {e}")
        raise Exception("Error de base de datos al actualizar la máquina")

def get_historial_maquina(db: Session, id_maquina: int | None = None, skip: int = 0, limit: int = 10):
    try:
        where_clause = "WHERE h.id_maquina = :id_maquina" if id_maquina is not None else ""
        params: dict = {"limit": limit, "skip": skip}
        if id_maquina is not None:
            params["id_maquina"] = id_maquina

        count_query = text(f"""
            SELECT COUNT(*) AS total
            FROM historial_maquinaria h
            {where_clause}
        """)
        total_result = db.execute(count_query, params).scalar()

        data_query = text(f"""
            SELECT * FROM (
                SELECT
                    h.id_historial,
                    h.id_maquina,
                    m.nombre_maq,
                    m.num_serie,
                    h.estado AS estado_actual,
                    h.fecha_cambio,
                    m.marca,
                    m.modelo,
                    m.tipo_maq,
                    m.fecha_compra,
                    h.user_id,
                    u.nombre_user,
                    h.observaciones
                FROM historial_maquinaria h
                INNER JOIN maquinaria m ON h.id_maquina = m.id_maquina
                INNER JOIN users u ON h.user_id = u.id_user
            ) sub
            {where_clause.replace('h.', 'sub.')}
            ORDER BY sub.fecha_cambio DESC
            LIMIT :limit OFFSET :skip
        """)
        historial_list = db.execute(data_query, params).mappings().all()

        return {"total": total_result or 0, "historial": historial_list}
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener el historial de maquinaria: {e}", exc_info=True)
        raise Exception("Error de base de datos al obtener el historial de maquinaria")

def all_maquina(db: Session):
    try:
        query = text("""SELECT id_maquina, nombre_maq, tipo_maq, marca, modelo,
                      num_serie, fecha_compra, estado, ubicacion, observaciones, fecha_de_baja
                     FROM maquinaria
                    """)
        result = db.execute(query).mappings().all()
        return result
    
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener todas las maquinaes: {e}")
        raise Exception("Error de base de datos al obtener todas las maquinaes")

def get_maquina_paginated(db: Session, skip: int = 0, limit: int = 10, search: Optional[str]= None):

    """
    Obtiene inventario de producción con paginación.
    Compatible con PostgreSQL, MySQL y SQLite.
    """
    try:
        where_clause = ""
        params = {"limit": limit, "skip": skip}
        
        if search:
            where_clause = "WHERE LOWER(nombre_maq) LIKE LOWER(:search) OR LOWER(num_serie) LIKE LOWER(:search) OR LOWER(marca) LIKE LOWER(:search) OR LOWER(modelo) LIKE LOWER(:search)"
            params["search"] = f"%{search}%"

        # Total de producción
        count_query = text(f"""
            SELECT COUNT(id_maquina) AS total
            FROM maquinaria
            {where_clause}
            ORDER BY fecha_compra ASC
        """)
        total_result = db.execute(count_query, params).scalar()

        # Producción paginada
        data_query = text(f""" 
                        SELECT id_maquina, nombre_maq, tipo_maq, marca, modelo,
                            num_serie, fecha_compra, estado, ubicacion, observaciones, fecha_de_baja
                            FROM maquinaria
                            {where_clause}
                            ORDER BY fecha_compra ASC
                        LIMIT :limit OFFSET :skip
                    """)
            
        maquinas_list = db.execute(data_query, params).mappings().all()

        return {
            "total": total_result or 0,
            "maquinas": maquinas_list
        }

    except SQLAlchemyError as e:
        logger.error(f"Error al obtener las máquinas: {e}", exc_info=True)
        raise Exception("Error de base de datos al obtener las máquinas")
    