from datetime import date
from unittest import result
from sqlalchemy.orm import Session
from sqlalchemy import text 
from typing import Optional
from sqlalchemy.exc import SQLAlchemyError 
from fastapi import HTTPException
from app.schemas.solicitud import SolicitudCreate, SolicitudUpdate, SolicitudStatus

import logging

logger = logging.getLogger(__name__)

def create_solicitud(db: Session, solicitud: SolicitudCreate, user_id: int):
    try:
        conv = db.execute(text("""
            SELECT conversion FROM unidades_medida
            WHERE id_unidad = :unid_med_id
        """), {"unid_med_id": solicitud.unid_med_id}).scalar()

        if not conv:
            raise Exception("Unidad de medida no encontrada")

        query = text("""
                    INSERT INTO solicitud_insumo(
                    solicitante, ficha, insumo_id, tipo_insumo_id, cantidad_in, unid_med_id, 
                    fecha_solicitud, cant_convertida, estado_solicitud, user_id)
                    VALUES (:solicitante, :ficha, :insumo_id, :tipo_insumo_id, :cantidad_in, :unid_med_id, 
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
        orig = getattr(e, 'orig', None)
        mensaje_orig = str(orig) if orig else str(e)
        mensaje_completo = f"{str(e)} {mensaje_orig}".lower()

        if "1264" in mensaje_completo or "out of range" in mensaje_completo:
            raise HTTPException(status_code=422, detail="La cantidad ingresada es demasiado grande. Verifique las unidades.")

        # Errores del trigger (SIGNAL SQLSTATE) vienen en orig como (1644, 'mensaje')
        if orig and hasattr(orig, 'args') and len(orig.args) >= 2:
            trigger_msg = orig.args[1]  # El texto limpio del SIGNAL

            if "no hay suficiente stock" in trigger_msg.lower():
                raise HTTPException(status_code=409, detail="No hay suficiente stock para registrar el tratamiento")
            
            if "unidad" in trigger_msg.lower() and "incompatible" in trigger_msg.lower():
                raise HTTPException(status_code=409, detail="La unidad de la solicitud y del inventario son incompatibles")
            
            if "límite permitido" in trigger_msg.lower() or "supera el límite" in trigger_msg.lower():
                raise HTTPException(status_code=422, detail="La cantidad ingresada es demasiado grande. Verifique las unidades.")
            
        logger.error(f"Error al registrar la solicitud: {e}")
        raise

def get_solicitud_by_id(db: Session, solicitud_id: int):
    try:
        query = text("""SELECT sol.id_solicitud, sol.solicitante, sol.ficha, sol.insumo_id, sol.tipo_insumo_id, sol.cantidad_in, sol.unid_med_id,
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
    try:
        query = text("""SELECT sol.id_solicitud, sol.solicitante, sol.ficha, sol.insumo_id, sol.tipo_insumo_id, sol.cantidad_in, sol.unid_med_id,
                     sol.fecha_solicitud, sol.fecha_entrega, sol.fecha_devolucion, sol.cant_devolver, sol.estado_solicitud, t_i.nombre_tipo, 
                     u_m.simbolo, ii.nombre_producto, us.nombre_user, sol.user_id
                     FROM solicitud_insumo AS sol
                     INNER JOIN  tipo_insumo AS t_i ON sol.tipo_insumo_id = t_i.id_tipo_insumo
                     LEFT JOIN unidades_medida AS u_m ON sol.unid_med_id = u_m.id_unidad
                     LEFT JOIN inv_insumos AS ii ON sol.insumo_id = ii.id_insumo
                     LEFT JOIN users AS us ON sol.user_id = us.id_user
                     ORDER BY sol.fecha_solicitud DESC
                     """)
        result = db.execute(query).mappings().all()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener todas las solicitudses: {e}")
        raise

def update_solicitud_by_id(db: Session, solicitud_id: int, solicitud: SolicitudUpdate, user_id: int):
    try:
        solicitud_data = solicitud.model_dump(exclude_unset=True)

        if not solicitud_data:
            return False

        # 1. Verificar si se está intentando actualizar la cantidad o la unidad de medida
        if "cantidad_in" in solicitud_data or "unid_med_id" in solicitud_data:
            
            # Necesitamos ambos valores para el cálculo. Si uno no viene en el update, lo buscamos de la BD actual
            cantidad_in = solicitud_data.get("cantidad_in")
            unid_med_id = solicitud_data.get("unid_med_id")

            if cantidad_in is None or unid_med_id is None:
                # Buscamos el registro actual para rellenar el dato faltante
                solicitud_actual = db.execute(
                    text("SELECT cantidad_in, unid_med_id FROM solicitud_insumo WHERE id_solicitud = :id"),
                    {"id": solicitud_id}
                ).fetchone()
                
                if not solicitud_actual:
                    return False # El ingrediente no existe
                
                if cantidad_in is None:
                    cantidad_in = solicitud_actual.cantidad_in
                if unid_med_id is None:
                    unid_med_id = solicitud_actual.unid_med_id

            # 2. Buscar la conversión correspondiente
            conv_inv = db.execute(text("""
                SELECT conversion FROM unidades_medida
                WHERE id_unidad = :unid_medida_id
            """), {"unid_medida_id": unid_med_id}).scalar()

            if not conv_inv:
                raise Exception("Unidad de medida no encontrada")

            # 3. Calcular la nueva cantidad convertida e inyectarla en los datos a actualizar
            solicitud_data["cant_convertida"] = float(cantidad_in) * float(conv_inv)

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

        nuevo_estado = solicitud_data.get("estado_solicitud")
        
        if nuevo_estado and nuevo_estado != estado_actual:
            historial_query = text("""
                INSERT INTO h_solicitud_insumo(
                    solicitud_ins_id, estado_solicitud_act, cantidad_actual, user_id
                ) VALUES (
                    :solicitud_id, :estado_nuevo, :cantidad_actual, :user_id
                )
            """)

            cantidad_actual = None
            if nuevo_estado == "entregado":
                cantidad_actual = solicitud_data.get("cant_convertida")
            elif nuevo_estado == "devuelto":
                cantidad_actual = solicitud_data.get("cant_devolver")

            db.execute(historial_query, {
                "solicitud_id": solicitud_id,
                "estado_nuevo": nuevo_estado,
                "cantidad_actual": cantidad_actual,
                "user_id": user_id,
            })

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

def get_historial_solicitud(db: Session, id_solicitud: int | None = None, skip: int = 0, limit: int = 10):
    try:
        where_clause = "WHERE h.solicitud_ins_id = :id_solicitud" if id_solicitud is not None else ""
        params: dict = {"limit": limit, "skip": skip}
        if id_solicitud is not None:
            params["id_solicitud"] = id_solicitud

        count_query = text(f"""
            SELECT COUNT(*) AS total
            FROM h_solicitud_insumo h
            {where_clause}
        """)
        total_result = db.execute(count_query, params).scalar()

        data_query = text(f"""
            SELECT * FROM (
                SELECT
                    h.id_hist_solic,
                    h.solicitud_ins_id,
                    h.estado_solicitud_act,
                    h.cantidad_actual,
                    si.solicitante,
                    si.fecha_solicitud,
                    si.fecha_entrega,
                    si.fecha_devolucion,
                    h.user_id,
                    u.nombre_user
                FROM h_solicitud_insumo h
                INNER JOIN solicitud_insumo si ON h.solicitud_ins_id = si.id_solicitud
                INNER JOIN users u ON h.user_id = u.id_user
            ) sub
            {where_clause.replace('h.', 'sub.')}
            ORDER BY sub.fecha_solicitud DESC
            LIMIT :limit OFFSET :skip
        """)
        historial_list = db.execute(data_query, params).mappings().all()

        return {"total": total_result or 0, "historial": historial_list}
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener el historial de las solicitudes de insumo: {e}", exc_info=True)
        raise Exception("Error de base de datos al obtener el historial de las solicitudes de insumo")

def get_solicitud_by_date_range(db: Session, fecha_inicio: str, fecha_fin: str):
    """
    Obtiene las solicitudes cuya fecha de inicio o fin esté dentro de un rango de fechas.
    Ignora las horas (usa DATE(fecha_hora_init) y DATE(fecha_hora_fin)).
    """
    try:
        query = text("""
                SELECT sol.id_solicitud, sol.solicitante, sol.ficha, sol.insumo_id, sol.tipo_insumo_id, sol.cantidad_in, sol.unid_med_id,
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
                        SELECT sol.id_solicitud, sol.solicitante, sol.ficha, sol.insumo_id, sol.tipo_insumo_id, sol.cantidad_in, sol.unid_med_id,
                        sol.fecha_solicitud, sol.fecha_entrega, sol.fecha_devolucion, sol.cant_devolver, sol.estado_solicitud, 
                        t_i.nombre_tipo, u_m.simbolo, ii.nombre_producto, us.nombre_user
                        FROM solicitud_insumo AS sol
                        INNER JOIN  tipo_insumo AS t_i ON sol.tipo_insumo_id = t_i.id_tipo_insumo
                        LEFT JOIN unidades_medida AS u_m ON sol.unid_med_id = u_m.id_unidad
                        LEFT JOIN inv_insumos AS ii ON sol.insumo_id = ii.id_insumo
                        LEFT JOIN users AS us ON sol.user_id = us.id_user
                        ORDER BY sol.fecha_solicitud DESC
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