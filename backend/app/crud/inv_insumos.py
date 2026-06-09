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
        
        conv = db.execute(text("""
            SELECT conversion FROM unidades_medida
            WHERE id_unidad = :unid_medida_id
        """), {"unid_medida_id": insumo.unid_medida_id}).scalar()

        if not conv:
            raise Exception("Unidad de medida no encontrada")

        query = text("""
                    INSERT INTO inv_insumos(
                    nombre_producto, cantidad, cant_convertida, unid_medida_id, precio_unitario, min_stock, fecha_ingreso, fecha_vencimiento, tipo_id)
                    VALUES (:nombre_producto, :cantidad, :cant_convertida, :unid_medida_id, :precio_unitario, :min_stock, :fecha_ingreso, 
                    :fecha_vencimiento, :tipo_id)
                    """)
        params = insumo.model_dump()
        params["cant_convertida"] = float(insumo.cantidad) * float(conv)                                                    
        db.execute(query, params)
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
    registrar_vencidos_como_perdidas(db);  # Registrar vencidos antes de obtener la lista
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

def registrar_vencidos_como_perdidas(db: Session):
    try:
        vencidos = db.execute(text("""
            SELECT ii.id_insumo, ii.cantidad, ii.cant_convertida, 
                   ii.fecha_vencimiento, ii.unid_medida_id
            FROM inv_insumos ii
            WHERE ii.fecha_vencimiento < CURDATE()
            AND ii.cantidad > 0
            AND ii.id_insumo NOT IN (
                SELECT inv_prod_id FROM inv_perdidas
                WHERE motivo = 'vencimiento'
                AND origen = 'insumo'
            )
        """)).mappings().all()

        for row in vencidos:
            db.execute(text("""
                INSERT INTO inv_perdidas (
                    inv_prod_id, cantidad, origen, motivo,
                    fecha_reporte, user_id, cant_convertida, 
                    unid_medida_id, observaciones
                ) VALUES (
                    :inv_prod_id, :cantidad, :origen, :motivo,
                    :fecha_reporte, :user_id, :cant_convertida,
                    :unid_medida_id, :observaciones
                )
            """), {
                "inv_prod_id": row["id_insumo"],
                "cantidad": row["cantidad"],
                "origen": "insumo",
                "motivo": "vencimiento",
                "fecha_reporte": date.today(),
                "user_id": None,  # Aquí podrías asignar un ID de usuario si tienes esa información
                "cant_convertida": row["cant_convertida"],
                "unid_medida_id": row["unid_medida_id"],
                "observaciones": f"Registrado automáticamente. Fecha de vencimiento: {row['fecha_vencimiento']}"
            })

        db.commit()
        return len(vencidos)
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al registrar vencidos: {e}")
        raise Exception("Error al registrar productos vencidos como pérdidas")

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

def get_reporte_encabezado_insumo(db: Session, id_insumo: int):
    try:
        return db.execute(text("""
            SELECT 
                ii.id_insumo,
                ii.nombre_producto,
                ii.fecha_ingreso,
                ii.fecha_vencimiento,
                ii.precio_unitario,
                um.simbolo,

                -- Cantidad inicial: stock actual + todo lo que se perdió
                ii.cantidad 
                + COALESCE(pe.total_perdido, 0)
                AS cantidad_inicial,
                
                CASE 
                    WHEN ii.fecha_vencimiento IS NOT NULL 
                         AND ii.fecha_vencimiento < CURRENT_DATE 
                    THEN 0
                    ELSE ii.cantidad
                END AS stock_actual,

                -- Total perdido: pérdidas registradas + stock restante si venció
                COALESCE(pe.total_perdido, 0) + 
                CASE 
                    WHEN ii.fecha_vencimiento IS NOT NULL 
                         AND ii.fecha_vencimiento < CURRENT_DATE 
                         AND pe.total_perdido IS NULL
                    THEN ii.cantidad
                    ELSE 0
                END AS total_perdido

            FROM inv_insumos ii
            LEFT JOIN unidades_medida um ON ii.unid_medida_id = um.id_unidad
            LEFT JOIN (
                SELECT inv_prod_id, SUM(cant_convertida) AS total_perdido
                FROM inv_perdidas
                WHERE origen = 'insumo'
                GROUP BY inv_prod_id
            ) pe ON pe.inv_prod_id = ii.id_insumo

            WHERE ii.id_insumo = :id_insumo
        """), {"id_insumo": id_insumo}).mappings().first()
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener encabezado del reporte de insumo: {e}")
        raise Exception("Error al obtener encabezado del reporte de insumo")

def get_reporte_movimientos_insumo(db: Session, id_insumo: int):
    try:
        return db.execute(text("""
            SELECT 
                'perdida'               AS tipo,
                p.id_perdida            AS id_registro,
                p.cant_convertida       AS cantidad,
                ii.precio_unitario       AS valor,
                p.motivo                AS motivo,
                p.observaciones         AS observaciones,
                p.fecha_reporte         AS fecha,
                u.nombre_user           AS registrado_por
            FROM inv_perdidas p
            LEFT JOIN inv_insumos ii ON p.inv_prod_id = ii.id_insumo
            LEFT JOIN users u ON p.user_id = u.id_user
            WHERE p.inv_prod_id = :id_insumo
            AND p.origen = 'insumo'
            ORDER BY p.fecha_reporte ASC
        """), {"id_insumo": id_insumo}).mappings().all()
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener movimientos del reporte de insumo: {e}")
        raise Exception("Error al obtener movimientos del reporte de insumo")

def get_reporte_insumo_detallado(db: Session, id_insumo: int):
    encabezado = get_reporte_encabezado_insumo(db, id_insumo)
    if not encabezado:
        return None

    movimientos = get_reporte_movimientos_insumo(db, id_insumo)

    return {
        "encabezado": dict(encabezado),
        "movimientos": [dict(m) for m in movimientos]
    }

def get_insumos_paginated(db: Session, skip: int = 0, limit: int = 10):
    """
    Obtiene insumos con paginación.
    Compatible con PostgreSQL, MySQL y SQLite.
    """
    registrar_vencidos_como_perdidas(db);  # Registrar vencidos antes de obtener la lista
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