from sqlalchemy.orm import Session # type: ignore
from sqlalchemy import text # type: ignore
from sqlalchemy.exc import SQLAlchemyError # type: ignore
from datetime import date, timedelta
from app.schemas.inv_produccion import ProduccionCreate, ProduccionUpdate

import logging

logger = logging.getLogger(__name__)

def create_produccion(db: Session, produccion: ProduccionCreate):
    try:

        query = text("""INSERT INTO inv_produccion 
                        (nombre_producto, cantidad, unid_medida_id, fecha_ingreso, fecha_vencimiento, lote_id, valor_unitario 
                        ) VALUES (
                        :nombre_producto, :cantidad, :unid_medida_id, :fecha_ingreso, :fecha_vencimiento, :lote_id, :valor_unitario )
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
        query = text("""SELECT pr.id_inventario, pr.nombre_producto, pr.cantidad, pr.unid_medida_id,
                     pr.fecha_ingreso, pr.fecha_vencimiento, pr.lote_id, pr.valor_unitario,
                     l.nombre_lote, l.categoria_id, l.especie_id, c.nombre_categoria, e.nombre_especie, u_m.simbolo
                     FROM inv_produccion pr
                     LEFT JOIN lote_produccion AS l ON pr.lote_id = l.id_lote
                     LEFT JOIN categorias AS c ON l.categoria_id = c.id_categoria
                     LEFT JOIN especies AS e ON l.especie_id = e.id_especie
                     LEFT JOIN unidades_medida AS u_m ON pr.unid_medida_id = u_m.id_unidad
                     WHERE pr.id_inventario = :id
                """)
        result = db.execute(query, {"id": id}).mappings().first()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener producción por ID: {e}")
        raise Exception("Error de base de datos al obtener la producción")

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
        return {"dias_restantes": 0, "nivel_alerta": "sin_stock"}

    hoy = date.today()
    dias = (fecha_vencimiento - hoy).days

    # Si es el mismo día, contar como 1 día restante
    if fecha_vencimiento == hoy:
        dias = 1

    if dias <= 0:
        nivel = "Este inventario está vencido"
    elif dias <= 7:
        nivel = f"Crítico: El inventario debe ser priorizado, días restantes: {dias}."
    elif dias <= 15:
        nivel = f"Urgente: El inventario está próximo a vencer, días restantes: {dias}."
    elif dias <= 30:
        nivel = f"El inventario está próximo a vencer, días restantes: {dias}."
    else:
        nivel = "El inventario está en buen estado"

    return {"dias_restantes": dias, "nivel_alerta": nivel}

def all_produccion(db: Session):
    
    try:
        query = text("""SELECT pr.id_inventario, pr.nombre_producto, pr.cantidad, pr.unid_medida_id,
                     pr.fecha_ingreso, pr.fecha_vencimiento, pr.lote_id, pr.valor_unitario,
                     l.nombre_lote, l.categoria_id, l.especie_id, c.nombre_categoria, e.nombre_especie, u_m.simbolo
                     FROM inv_produccion pr
                     LEFT JOIN lote_produccion AS l ON pr.lote_id = l.id_lote
                     LEFT JOIN categorias AS c ON l.categoria_id = c.id_categoria
                     LEFT JOIN especies AS e ON l.especie_id = e.id_especie
                     LEFT JOIN unidades_medida AS u_m ON pr.unid_medida_id = u_m.id_unidad
                    """)
        result = db.execute(query).mappings().all()

        resultado = []

        for row in result:
            data = dict(row)
            alerta = get_nivel_alerta(data.get("fecha_vencimiento"), data.get("cantidad", 0))
            data["dias_restantes"] = alerta["dias_restantes"]
            data["nivel_alerta"] = alerta["nivel_alerta"]
            resultado.append(data)
            
        return resultado
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
            LEFT JOIN categorias AS c ON l.categoria_id = c.id_categoria
            LEFT JOIN especies AS e ON l.especie_id = e.id_especie
            LEFT JOIN unidades_medida AS u_m ON pr.unid_medida_id = u_m.id_unidad
        """)

        total_result = db.execute(count_query).scalar()

        # Producción paginada
        data_query = text(""" 
                        SELECT pr.id_inventario, pr.nombre_producto, pr.cantidad, pr.unid_medida_id,
                        pr.fecha_ingreso, pr.fecha_vencimiento, pr.lote_id, pr.valor_unitario,
                        l.nombre_lote, l.categoria_id, l.especie_id, c.nombre_categoria, e.nombre_especie, u_m.simbolo
                        FROM inv_produccion pr
                        LEFT JOIN lote_produccion AS l ON pr.lote_id = l.id_lote
                        LEFT JOIN categorias AS c ON l.categoria_id = c.id_categoria
                        LEFT JOIN especies AS e ON l.especie_id = e.id_especie
                        LEFT JOIN unidades_medida AS u_m ON pr.unid_medida_id = u_m.id_unidad
                        LIMIT :limit OFFSET :skip
                    """)
            
        prod_list = db.execute(
            data_query,
            {
                "limit": limit,
                "skip": skip
            }
        ).mappings().all()

        resultado = []

        for row in prod_list:
            data = dict(row)
            alerta = get_nivel_alerta(data.get("fecha_vencimiento"), data.get("cantidad", 0))
            data["dias_restantes"] = alerta["dias_restantes"]
            data["nivel_alerta"] = alerta["nivel_alerta"]
            resultado.append(data)

        return {
            "total": total_result or 0,
            "produccion": resultado
        }

    except SQLAlchemyError as e:
        logger.error(f"Error al obtener la producción: {e}", exc_info=True)
        raise Exception("Error de base de datos al obtener la producción")
    