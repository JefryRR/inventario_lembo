from sqlalchemy.orm import Session 
from sqlalchemy import text 
from sqlalchemy.exc import SQLAlchemyError 
from datetime import date
from app.schemas.solicitud_maq import SolicitudMaqCreate, SolicitudMaqUpdate
from typing import Optional

import logging

logger = logging.getLogger(__name__)

#Crear una nueva solicitud de maquinaria
def create_solic_maq(db: Session, solicitud: SolicitudMaqCreate):
    try:
        #Verificamos si ya existe una solicitud con el mismo user_id
        existing_solicitud = get_solicitud_by_id(db, solicitud.user_id)

        # Si ya existe una solicitud con el mismo user_id, lanzamos una excepción
        if existing_solicitud:
            raise ValueError("Ya existe una solicitud con ese usuario")

        query = text("""INSERT INTO solicitud_maquinaria 
                        (maquinaria_id, user_id, fecha_solicitud, estado, observaciones
                        ) VALUES (
                        :maquinaria_id, :user_id, :fecha_solicitud, :estado, :observaciones )
                    """)
        db.execute(query, solicitud.model_dump())
        db.commit()
        return True
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al registrar la solicitud de maquinaria: {e}")
        raise Exception("Error de base de datos al registrar la solicitud de maquinaria")

# Obtener una solicitud de maquinaria por su ID
def get_solicitud_by_id(db: Session, id: int):
    try:
        query = text("""SELECT sm.id_solicitud_maq, sm.maquinaria_id, sm.user_id, sm.fecha_solicitud, sm.fecha_entrega, 
                     sm.fecha_devolucion, sm.estado, sm.observaciones, u.nombre_user, m.nombre_maq
                     FROM solicitud_maquinaria AS sm
                     LEFT JOIN users AS u ON sm.user_id = u.id_user
                     LEFT JOIN maquinaria AS m ON sm.maquinaria_id = m.id_maquina
                     WHERE sm.id_solicitud_maq = :id_solicitud
                """)
        result = db.execute(query, {"id_solicitud": id}).mappings().first()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener la solicitud por ID: {e}")
        raise Exception("Error de base de datos al obtener la solicitud por ID")

# Obtener el estado actual de una solicitud
def _get_estado_actual(db: Session, solicitud_id: int):
    query = text("""
        SELECT estado
        FROM solicitud_maquinaria
        WHERE id_solicitud_maq = :id_solicitud_maq
    """)
    return db.execute(query, {"id_solicitud_maq": solicitud_id}).scalar_one_or_none()

# Actualizar una solicitud de maquinaria por su ID
def update_solicitud(db: Session, solicitud_id: int, maquina: SolicitudMaqUpdate):
    try:
        #Obtenemos el estado actual de la solicitud
        estado_actual = _get_estado_actual(db, solicitud_id)

        # Verificamos si la solicitud está en un estado que no permite modificaciones
        if estado_actual in ('devuelta', 'cancelada'):
            raise ValueError("No se puede modificar una solicitud que está devuelta o cancelada")

        maquina_data = maquina.model_dump(exclude_unset=True)
        if not maquina_data:
            return False

        # Actualizamos las fechas según el nuevo estado
        if maquina_data.get("estado") == 'entregada' and estado_actual != 'entregada':
            maquina_data["fecha_entrega"] = date.today()
        elif maquina_data.get("estado") == 'devuelta' and estado_actual != 'devuelta':
            maquina_data["fecha_devolucion"] = date.today()

        set_clauses = ", ".join([f"{key} = :{key}" for key in maquina_data.keys()])
        query = text(f"""
            UPDATE solicitud_maquinaria
            SET {set_clauses}
            WHERE id_solicitud_maq = :id_solicitud_maq
        """)
        
        maquina_data["id_solicitud_maq"] = solicitud_id
        result = db.execute(query, maquina_data)
        db.commit()
        return result.rowcount > 0
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al actualizar la solicitud {solicitud_id}: {e}")
        raise Exception("Error de base de datos al actualizar la solicitud")

# Obtener todas las solicitudes de maquinaria
def get_all_solicitudes(db: Session):
    try:
        query = text("""SELECT sm.id_solicitud_maq, sm.maquinaria_id, sm.user_id, sm.fecha_solicitud, sm.fecha_entrega, 
                     sm.fecha_devolucion, sm.estado, sm.observaciones, u.nombre_user, m.nombre_maq
                     FROM solicitud_maquinaria AS sm
                     LEFT JOIN users AS u ON sm.user_id = u.id_user
                     LEFT JOIN maquinaria AS m ON sm.maquinaria_id = m.id_maquina
                    """)
        result = db.execute(query).mappings().all()
        return result
    
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener todas las solicitudes: {e}")
        raise Exception("Error de base de datos al obtener todas las solicitudes")

# Cambiar el estado de una solicitud
def change_solicitud_estado(db: Session, solicitud_id: int, nuevo_estado: str):
    """
    Cambia el estado de un solicitud.
    """
    try:
        # Obtenemos el estado actual de la solicitud
        estado_actual = _get_estado_actual(db, solicitud_id)
        if estado_actual is None:
            raise ValueError(f"No se encontró la solicitud con id {solicitud_id}")

        if estado_actual in ('devuelta', 'cancelada'):
            raise ValueError("No se puede modificar una solicitud que está devuelta o cancelada")

        parametros = {"nuevo_estado": nuevo_estado, "solicitud_id": solicitud_id}
        fecha_entrega_sql = ""
        fecha_devolucion_sql = ""

        # Actualizamos las fechas según el nuevo estado
        if nuevo_estado == 'entregada' and estado_actual != 'entregada':
            fecha_entrega_sql = ", fecha_entrega = :fecha_entrega"
            parametros["fecha_entrega"] = date.today()
        elif nuevo_estado == 'devuelta' and estado_actual != 'devuelta':
            fecha_devolucion_sql = ", fecha_devolucion = :fecha_devolucion"
            parametros["fecha_devolucion"] = date.today()

        query = text("""
            UPDATE solicitud_maquinaria
            SET estado = :nuevo_estado
            {fecha_entrega_sql}
            {fecha_devolucion_sql}
            WHERE id_solicitud_maq = :solicitud_id
        """.format(fecha_entrega_sql=fecha_entrega_sql, fecha_devolucion_sql=fecha_devolucion_sql))

        result = db.execute(query, parametros)
        db.commit()
        return result.rowcount > 0
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al cambiar el estado del solicitud {solicitud_id}: {e}")
        raise Exception("Error de base de datos al cambiar el estado del solicitud")

# Obtener solicitudes por rango de fechas
def get_solicitudes_by_date_range(db: Session, fecha_inicio: str, fecha_fin: str):
    """
    Obtiene las solicitudes cuya fecha de inicio o fin esté dentro de un rango de fechas.
    Ignora las horas (usa DATE(fecha_hora_init) y DATE(fecha_hora_fin)).
    """
    try:
        query = text("""
                    SELECT sm.id_solicitud_maq, sm.maquinaria_id, sm.user_id, sm.fecha_solicitud, sm.fecha_entrega, 
                     sm.fecha_devolucion, sm.estado, sm.observaciones, u.nombre_user, m.nombre_maq
                     FROM solicitud_maquinaria AS sm
                     LEFT JOIN users AS u ON sm.user_id = u.id_user
                     LEFT JOIN maquinaria AS m ON sm.maquinaria_id = m.id_maquina
                     WHERE DATE(sm.fecha_solicitud) BETWEEN :fecha_inicio AND :fecha_fin
                        OR (sm.fecha_entrega IS NOT NULL AND DATE(sm.fecha_entrega) BETWEEN :fecha_inicio AND :fecha_fin)
                        OR (sm.fecha_devolucion IS NOT NULL AND DATE(sm.fecha_devolucion) BETWEEN :fecha_inicio AND :fecha_fin)
                    ORDER BY sm.fecha_solicitud DESC
                """)
        result = db.execute(query, {
            "fecha_inicio": fecha_inicio,
            "fecha_fin": fecha_fin
        }).mappings().all()
        
        return [dict(row) for row in result]

    except SQLAlchemyError as e:
        raise Exception(f"Error al consultar las solicitudes por rango de fechas: {e}")

# Obtener solicitudes de maquinaria con paginación y búsqueda
def get_solicitudes_paginated(db: Session, skip: int = 0, limit: int = 10, search: Optional[str] = None):

    """
    Obtiene solicitudes con paginación.
    Compatible con PostgreSQL, MySQL y SQLite.
    """
    try:
        # Total de solicitudes
        where_clause = ""
        params = {"limit": limit, "skip": skip}

        if search:
            where_clause = "WHERE LOWER(u.nombre_user) LIKE LOWER(:search) OR LOWER(m.nombre_maq) LIKE LOWER(:search) OR LOWER(sm.estado) LIKE LOWER(:search)"
            params["search"] = f"%{search}%"

        count_query = text(f"""
            SELECT COUNT(id_solicitud_maq) AS total
            FROM solicitud_maquinaria AS sm
            LEFT JOIN users AS u ON sm.user_id = u.id_user
            LEFT JOIN maquinaria AS m ON sm.maquinaria_id = m.id_maquina
            {where_clause}
            ORDER BY fecha_solicitud DESC
        """)

        total_result = db.execute(count_query, params).scalar()

        # Solicitudes paginadas
        data_query = text(f""" 
                        SELECT sm.id_solicitud_maq, sm.maquinaria_id, sm.user_id, sm.fecha_solicitud, sm.fecha_entrega, 
                         sm.fecha_devolucion, sm.estado, sm.observaciones, u.nombre_user, m.nombre_maq
                         FROM solicitud_maquinaria AS sm
                         LEFT JOIN users AS u ON sm.user_id = u.id_user
                         LEFT JOIN maquinaria AS m ON sm.maquinaria_id = m.id_maquina
                         {where_clause}
                         ORDER BY sm.fecha_solicitud DESC
                        LIMIT :limit OFFSET :skip
                    """)
            
        solicitudes_maq_list = db.execute(data_query, params).mappings().all()

        return {
            "total": total_result or 0,
            "solicitudes": solicitudes_maq_list
        }

    except SQLAlchemyError as e:
        logger.error(f"Error al obtener las solicitudes: {e}", exc_info=True)
        raise Exception("Error de base de datos al obtener las solicitudes")
    