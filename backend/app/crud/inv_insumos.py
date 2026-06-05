from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import text 
from sqlalchemy.exc import SQLAlchemyError 
from app.schemas.inv_insumos import InsumoCreate, InsumoUpdate

import logging

logger = logging.getLogger(__name__)

def create_insumo(db: Session, insumo: InsumoCreate):
    try:

        insumo_exitente = db.execute(
            text("SELECT id_insumo FROM inv_insumos WHERE nombre_producto = :nombre_producto"),
            {"nombre_producto": insumo.nombre_producto}
        ).fetchone()

        if insumo_exitente:
            raise Exception("Ya existe un insumo con ese nombre")
        
        query = text("""
                    INSERT INTO inv_insumos(
                    nombre_producto, cantidad, unid_medida_id, precio_unitario, min_stock, fecha_ingreso, fecha_vencimiento, tipo_id)
                    VALUES (:nombre_producto, :cantidad, :unid_medida_id, :precio_unitario, :min_stock, :fecha_ingreso, 
                    :fecha_vencimiento, :tipo_id)
                    """)
        db.execute(query, insumo.model_dump())
        db.commit()
        return True
    except SQLAlchemyError as e:
        logger.error(f"Error al registrar el insumo: {e}")
        db.rollback()
        raise

def get_insumo_by_id(db: Session, insumo_id: int):
    try:
        query = text("""SELECT i_in.id_insumo, i_in.nombre_producto, i_in.cantidad, i_in.unid_medida_id, i_in.precio_unitario,
                      i_in.min_stock, i_in.fecha_ingreso, i_in.fecha_vencimiento, i_in.tipo_id, t_i.nombre_tipo, u_m.simbolo
                     FROM inv_insumos AS i_in
                     INNER JOIN  tipo_insumo AS t_i ON i_in.tipo_id = t_i.id_tipo_insumo
                     LEFT JOIN unidades_medida AS u_m ON i_in.unid_medida_id = u_m.id_unidad
                     WHERE i_in.id_insumo = :id""")
        result = db.execute(query, {"id": insumo_id}).fetchone()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener el insumo por id: {e}")
        raise

def get_all_insumos(db: Session):
    try:
        query = text("""SELECT i_in.id_insumo, i_in.nombre_producto, i_in.cantidad, i_in.unid_medida_id, i_in.precio_unitario,
                      i_in.min_stock, i_in.fecha_ingreso, i_in.fecha_vencimiento, i_in.tipo_id, t_i.nombre_tipo, u_m.simbolo
                     FROM inv_insumos AS i_in
                     INNER JOIN  tipo_insumo AS t_i ON i_in.tipo_id = t_i.id_tipo_insumo
                     LEFT JOIN unidades_medida AS u_m ON i_in.unid_medida_id = u_m.id_unidad
                     """)
        
        result = db.execute(query).mappings().all()

        resultado = []

        for row in result:
            data = dict(row)
            alerta = get_nivel_alerta(data.get("fecha_vencimiento", ""), data.get("cantidad", 0))
            data["dias_restantes"] = alerta["dias_restantes"]
            data["nivel_alerta"] = alerta["nivel_alerta"]
            resultado.append(data)
            
        return resultado
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener todas las insumoses: {e}")
        raise

def update_insumo_by_id(db: Session, insumo_id: int, insumo: InsumoUpdate):
    try:
         # Solo los campos enviados por el cliente
        insumo_data = insumo.model_dump(exclude_unset=True)
        if not insumo_data:
             return False  # nada que actualizar
         # Construir dinámicamente la sentencia UPDATE
        set_clauses = ", ".join([f"{key} = :{key}" for key in insumo_data.keys()])
        sentencia = text(f"""
             UPDATE inv_insumos
             SET {set_clauses}
             WHERE id_insumo = :id_insumo
         """)
         # Agregar el id_insumo
        insumo_data["id_insumo"] = insumo_id
        result = db.execute(sentencia, insumo_data)
        db.commit()
        return result.rowcount > 0
    except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Error al actualizar insumo {insumo_id}: {e}")
            raise Exception("Error de base de datos al actualizar el insumo")

def get_nivel_alerta(fecha_vencimiento: date, cantidad: float | int = 0) -> dict:
    """Calcula días restantes y nivel de alerta considerando la cantidad.

    - Si `fecha_vencimiento` es None devuelve estado OK.
    - Si `cantidad` es <= 0 devuelve `sin_stock` (sin alerta por vencimiento).
    - En otro caso, calcula `dias_restantes` y clasifica la alerta.
    """
    if fecha_vencimiento is None:
        return {"dias_restantes": 0, "nivel_alerta": "ok"}

    # Normalizar si viene con time (datetime)
    if hasattr(fecha_vencimiento, "date"):
        fecha_vencimiento = fecha_vencimiento.date()

    # Normalizar cantidad segura
    try:
        cantidad_val = float(cantidad or 0)
    except Exception:
        cantidad_val = 0

    # Si no hay stock, marcar sin_stock
    if cantidad_val <= 0:
        return {"dias_restantes": 0, "nivel_alerta": "Sin stock"}

    hoy = date.today()
    dias = (fecha_vencimiento - hoy).days

    # Si es el mismo día, contar como 1 día restante
    if fecha_vencimiento == hoy:
        dias = 1

    if dias <= 0:
        nivel = "Este insumo está vencido"
    elif dias <= 7:
        nivel = f"Crítico: El insumo debe ser priorizado, días restantes: {dias}."
    elif dias <= 15:
        nivel = f"Urgente: El insumo está próximo a vencer, días restantes: {dias}."
    elif dias <= 30:
        nivel = f"El insumo está próximo a vencer, días restantes: {dias}."
    else:
        nivel = "El insumo está en buen estado"

    return {"dias_restantes": dias, "nivel_alerta": nivel}

def get_insumos_paginated(db: Session, skip: int = 0, limit: int = 10):
    """
    Obtiene insumos con paginación.
    Compatible con PostgreSQL, MySQL y SQLite.
    """
    try:
        # Total de insumos
        count_query = text("""
            SELECT COUNT(inv_insumos.id_insumo) AS total
            FROM inv_insumos
            LEFT JOIN tipo_insumo ON inv_insumos.tipo_id = tipo_insumo.id_tipo_insumo
        """)

        total_result = db.execute(count_query).scalar()

        # Insumos paginados
        data_query = text(""" 
                        SELECT i_in.id_insumo, i_in.nombre_producto, i_in.cantidad, i_in.unid_medida_id, i_in.precio_unitario,
                        i_in.min_stock, i_in.fecha_ingreso, i_in.fecha_vencimiento, i_in.tipo_id, t_i.nombre_tipo, u_m.simbolo
                        FROM inv_insumos AS i_in
                        INNER JOIN  tipo_insumo AS t_i ON i_in.tipo_id = t_i.id_tipo_insumo
                        LEFT JOIN unidades_medida AS u_m ON i_in.unid_medida_id = u_m.id_unidad
                        LIMIT :limit OFFSET :skip
                    """)

        insumos_list = db.execute(
            data_query,
            {
                "limit": limit,
                "skip": skip
            }
        ).mappings().all()

        resultado = []

        for row in insumos_list:
            data = dict(row)
            alerta = get_nivel_alerta(data.get("fecha_vencimiento", ""), data.get("cantidad", 0))
            data["dias_restantes"] = alerta["dias_restantes"]
            data["nivel_alerta"] = alerta["nivel_alerta"]
            resultado.append(data)

        return {
            "total": total_result or 0,
            "insumos": resultado
        }

    except SQLAlchemyError as e:
        logger.error( f"Error al obtener los insumos: {e}", exc_info=True)

        raise Exception(
            "Error de base de datos al obtener los insumos"
        )