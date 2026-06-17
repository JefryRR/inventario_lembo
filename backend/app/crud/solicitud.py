from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import text 
from typing import Optional
from sqlalchemy.exc import SQLAlchemyError 
from app.schemas.solicitud import SolicitudCreate, SolicitudUpdate, SolicitudStatus

import logging

logger = logging.getLogger(__name__)

def create_solicitud(db: Session, solicitud: SolicitudCreate, user_id: int):
    try:

        solicitud_exitente = db.execute(
            text("SELECT id_solicitud FROM solicitud_insumo WHERE solicitante = :solicitante"),
            {"solicitante": solicitud.solicitante}
        ).fetchone()

        if solicitud_exitente:
            raise Exception("Ya existe un solicitud a nombre de ese solicitante")
        

        # estado_insumo = db.execute(text("""
        #     SELECT fecha_vencimiento FROM inv_insumos
        #     WHERE id_insumo = :insumo_id
        # """), {"insumo_id": solicitud.insumo_id}).scalar()

        # if estado_insumo <= date.today():
        #     raise Exception("No se puede crear la solicitud porque el insumo está vencido")

        conv = db.execute(text("""
            SELECT conversion FROM unidades_medida
            WHERE id_unidad = :unid_med_id
        """), {"unid_med_id": solicitud.unid_med_id}).scalar()

        if not conv:
            raise Exception("Unidad de medida no encontrada")

        query = text("""
                    INSERT INTO solicitud_insumo(
                    solicitante, insumo_id, tipo_insumo_id, cantidad_in, unid_med_id, 
                    fecha_solicitud, cant_convertida, estado_solicitud, user_id)
                    VALUES (:solicitante, :insumo_id, :tipo_insumo_id, :cantidad_in, :unid_med_id, 
                    :fecha_solicitud, :cant_convertida, :estado_solicitud, :user_id)
                    """)
        params = solicitud.model_dump()
        params["cant_convertida"] = float(solicitud.cantidad_in) * float(conv) 
        params["user_id"] = user_id                                                 
        db.execute(query, params)
        db.commit()
        return True
    except SQLAlchemyError as e:
        db.rollback()
        mensaje_error = f"{e}"
        mensaje_origen = f"{getattr(e, 'orig', '')}"
        mensaje_completo = f"{mensaje_error} {mensaje_origen}".lower()
        if (
            "45000" in mensaje_completo
            or "1644" in mensaje_completo
            or "No hay suficiente stock" in mensaje_completo
            or "No se puede crear la solicitud" in mensaje_completo
        ):
            raise Exception(f"No hay suficiente stock para registrar esta solicitud.")
        logger.error(f"Error al registrar la solicitud: {e}")
        raise

def get_solicitud_by_id(db: Session, solicitud_id: int):
    try:
        query = text("""SELECT sol.id_solicitud, sol.solicitante, sol.insumo_id, sol.tipo_insumo_id, sol.cantidad_in, sol.unid_med_id,
                     sol.fecha_solicitud, sol.fecha_entrega, sol.fecha_devolucion, sol.cant_devolver, sol.estado_solicitud, t_i.nombre_tipo, sol.user_id,
                     u_m.simbolo, ii.nombre_producto, us.nombre_user
                     FROM solicitud_insumo AS sol
                     INNER JOIN  tipo_insumo AS t_i ON sol.tipo_insumo_id = t_i.id_tipo_insumo
                     LEFT JOIN unidades_medida AS u_m ON sol.unid_med_id = u_m.id_unidad
                     LEFT JOIN inv_insumos AS ii ON sol.insumo_id = ii.id_insumo
                     LEFT JOIN users AS us ON sol.user_id = us.id_user
                     WHERE sol.id_solicitud = :id""")
        result = db.execute(query, {"id": solicitud_id}).fetchone()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener el solicitud por id: {e}")
        raise

def get_all_solicitudes(db: Session):
    #registrar_vencidos_como_perdidas(db);  # Registrar vencidos antes de obtener la lista
    try:
        query = text("""SELECT sol.id_solicitud, sol.solicitante, sol.insumo_id, sol.tipo_insumo_id, sol.cantidad_in, sol.unid_med_id,
                     sol.fecha_solicitud, sol.fecha_entrega, sol.fecha_devolucion, sol.cant_devolver, sol.estado_solicitud, t_i.nombre_tipo, 
                     u_m.simbolo, ii.nombre_producto, us.nombre_user
                     FROM solicitud_insumo AS sol
                     INNER JOIN  tipo_insumo AS t_i ON sol.tipo_insumo_id = t_i.id_tipo_insumo
                     LEFT JOIN unidades_medida AS u_m ON sol.unid_med_id = u_m.id_unidad
                     LEFT JOIN inv_insumos AS ii ON sol.insumo_id = ii.id_insumo
                     LEFT JOIN users AS us ON sol.user_id = us.id_user
                     """)
        result = db.execute(query).mappings().all()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener todas las solicitudses: {e}")
        raise

def update_solicitud_by_id(db: Session, solicitud_id: int, solicitud: SolicitudUpdate):
    try:
        solicitud_data = solicitud.model_dump(exclude_unset=True)

        if not solicitud_data:
            return False

        # Obtener estado actual
        estado_actual = db.execute(
            text("""
                SELECT estado_solicitud
                FROM solicitud_insumo
                WHERE id_solicitud = :id_solicitud
            """),
            {"id_solicitud": solicitud_id}
        ).scalar()

        # Si cambia por primera vez a entregado
        if (
            solicitud_data.get("estado_solicitud") == "entregado"
            and estado_actual != "entregado"
        ):
            solicitud_data["fecha_entrega"] = date.today()

        # Si cambia por primera vez a devuelto
        if (
            solicitud_data.get("estado_solicitud") == "devuelto"
            and estado_actual != "devuelto"
        ):
            solicitud_data["fecha_devolucion"] = date.today()

        set_clauses = ", ".join(
            [f"{key} = :{key}" for key in solicitud_data.keys()]
        )

        sentencia = text(f"""
            UPDATE solicitud_insumo
            SET {set_clauses}
            WHERE id_solicitud = :id_solicitud
        """)

        solicitud_data["id_solicitud"] = solicitud_id

        result = db.execute(sentencia, solicitud_data)
        db.commit()

        return result.rowcount > 0

    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al actualizar solicitud {solicitud_id}: {e}")
        raise Exception("Error de base de datos al actualizar la solicitud")
    
def change_status_solicitud(db: Session, solicitud_id: int, estado: SolicitudStatus) -> Optional[bool]:
    try:
        sentencia = text("""
            UPDATE solicitud_insumo
            SET estado_solicitud = :estado
            WHERE id_solicitud = :id_solicitud
        """)
        result = db.execute(sentencia, {"estado": estado.value, "id_solicitud": solicitud_id})
        db.commit()
        return result.rowcount > 0
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al cambiar estado de la solicitud {solicitud_id}: {e}")
        raise Exception("Error de base de datos al cambiar el estado de la solicitud")

def get_solicitud_by_date_range(db: Session, fecha_inicio: str, fecha_fin: str):
    """
    Obtiene las tareas cuya fecha de inicio o fin esté dentro de un rango de fechas.
    Ignora las horas (usa DATE(fecha_hora_init) y DATE(fecha_hora_fin)).
    """
    try:
        query = text("""
                SELECT sol.id_solicitud, sol.solicitante, sol.insumo_id, sol.tipo_insumo_id, sol.cantidad_in, sol.unid_med_id,
                    sol.fecha_solicitud, sol.fecha_entrega, sol.fecha_devolucion, sol.cant_devolver, sol.estado_solicitud, 
                    t_i.nombre_tipo, u_m.simbolo, ii.nombre_producto, us.nombre_user
                    FROM solicitud_insumo AS sol
                    INNER JOIN  tipo_insumo AS t_i ON sol.tipo_insumo_id = t_i.id_tipo_insumo
                    LEFT JOIN unidades_medida AS u_m ON sol.unid_med_id = u_m.id_unidad
                    LEFT JOIN inv_insumos AS ii ON sol.insumo_id = ii.id_insumo
                    LEFT JOIN users AS us ON sol.user_id = us.id_user
                WHERE DATE(sol.fecha_solicitud) BETWEEN :fecha_inicio AND :fecha_fin
                ORDER BY sol.fecha_solicitud DESC
            """)
        result = db.execute(query, {
            "fecha_inicio": fecha_inicio,
            "fecha_fin": fecha_fin
        }).mappings().all()
        
        return [dict(row) for row in result]

    except SQLAlchemyError as e:
        raise Exception(f"Error al consultar las solicitudes por rango de fechas: {e}")

def get_solicitudes_paginated(db: Session, skip: int = 0, limit: int = 10):
    """
    Obtiene solicitudes con paginación.
    Compatible con PostgreSQL, MySQL y SQLite.
    """
    try:
        # Total de solicitudes
        count_query = text("""
            SELECT COUNT(si.id_solicitud) AS total
            FROM solicitud_insumo si
        """)

        total_result = db.execute(count_query).scalar()

        # Insumos paginados
        data_query = text(""" 
                        SELECT sol.id_solicitud, sol.solicitante, sol.insumo_id, sol.tipo_insumo_id, sol.cantidad_in, sol.unid_med_id,
                        sol.fecha_solicitud, sol.fecha_entrega, sol.fecha_devolucion, sol.cant_devolver, sol.estado_solicitud, 
                        t_i.nombre_tipo, u_m.simbolo, ii.nombre_producto, us.nombre_user
                        FROM solicitud_insumo AS sol
                        INNER JOIN  tipo_insumo AS t_i ON sol.tipo_insumo_id = t_i.id_tipo_insumo
                        LEFT JOIN unidades_medida AS u_m ON sol.unid_med_id = u_m.id_unidad
                        LEFT JOIN inv_insumos AS ii ON sol.insumo_id = ii.id_insumo
                        LEFT JOIN users AS us ON sol.user_id = us.id_user
                        LIMIT :limit OFFSET :skip
                    """)

        solicitudes_list = db.execute(
            data_query,
            {
                "limit": limit,
                "skip": skip
            }
        ).mappings().all()

        return {
            "total": total_result or 0,
            "solicitudes": solicitudes_list
        }

    except SQLAlchemyError as e:
        logger.error( f"Error al obtener los solicitudes: {e}", exc_info=True)

        raise Exception(
            "Error de base de datos al obtener los solicitudes"
        )