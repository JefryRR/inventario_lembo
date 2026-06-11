from sqlalchemy.orm import Session # type: ignore
from sqlalchemy import text # type: ignore
from sqlalchemy.exc import SQLAlchemyError # type: ignore
from datetime import date
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
                     l_g.nombre_lote, l.categoria_id, l.especie_id, c.nombre_categoria, e.nombre_especie, u_m.simbolo
                     FROM inv_produccion pr
                     LEFT JOIN lote_produccion AS l ON pr.lote_id = l.id_lote
                     LEFT JOIN lotes_granja AS l_g ON l.lote_granj_id = l_g.id_lote_g
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
        return {"dias_restantes": 0, "nivel_alerta": "Sin stock"}

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

def registrar_vencidos_como_perdidas(db: Session):
    try:
        query = text("""
            SELECT pr.id_inventario, pr.cantidad, pr.fecha_vencimiento, pr.unid_medida_id
            FROM inv_produccion pr
            WHERE pr.fecha_vencimiento < CURDATE()
            AND pr.cantidad > 0
            AND pr.id_inventario NOT IN (
                SELECT inv_prod_id FROM inv_perdidas
                WHERE motivo = 'vencimiento'
                AND origen = 'produccion'
            )
        """)
        vencidos = db.execute(query).mappings().all()

        for row in vencidos:
            insert = text("""
                INSERT INTO inv_perdidas (
                    inv_prod_id, cantidad, origen, motivo,
                    fecha_reporte, user_id, cant_convertida, 
                    unid_medida_id, observaciones
                ) VALUES (
                    :inv_prod_id, :cantidad, :origen, :motivo,
                    :fecha_reporte, :user_id, :cant_convertida,
                    :unid_medida_id, :observaciones
                )
            """)
            db.execute(insert, {
                "inv_prod_id": row["id_inventario"],
                "cantidad": row["cantidad"],
                "origen": "produccion",
                "unid_medida_id": row["unid_medida_id"],
                "motivo": "vencimiento",
                "fecha_reporte": date.today(),
                "user_id": None,
                "observaciones": f"Registrado automáticamente. Fecha de vencimiento: {row['fecha_vencimiento']}",
                "cant_convertida": row["cantidad"]  # Se asume que la cantidad ya está en la unidad base o que el trigger lo ajustará
            })

        db.commit()
        return len(vencidos)  # retorna cuántos se registraron
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al registrar vencidos: {e}")
        raise Exception("Error al registrar productos vencidos como pérdidas")

def get_reporte_encabezado(db: Session, inv_prod_id: int):
    try:
        query = text("""
           SELECT 
            pr.id_inventario,
            pr.nombre_producto,
            pr.fecha_ingreso,
            pr.fecha_vencimiento,
            pr.valor_unitario,
            um.simbolo,
            l_g.nombre_lote,
    
            -- Cantidad inicial: reconstruida sumando todo lo que salió
            CASE
                WHEN pr.fecha_vencimiento IS NOT NULL
                     AND pr.fecha_vencimiento < CURRENT_DATE
                THEN COALESCE(ventas_netas.total_vendido_neto, 0)
                     + COALESCE(pe.total_perdido, 0)
                ELSE pr.cantidad
                    + COALESCE(ventas_netas.total_vendido_neto, 0)
                    + COALESCE(pe.total_perdido, 0)
            END AS cantidad_inicial,
    
            -- Stock actual: pr.cantidad ya tiene descontado ventas y pérdidas
            CASE 
                WHEN pr.fecha_vencimiento IS NOT NULL 
                     AND pr.fecha_vencimiento < CURRENT_DATE 
                THEN 0
                ELSE pr.cantidad
            END AS stock_actual,
    
            COALESCE(ventas_netas.total_vendido_neto, 0) AS total_vendido,
            COALESCE(pe.total_perdido, 0)                AS total_perdido
    
            FROM inv_produccion pr
            LEFT JOIN lote_produccion l ON pr.lote_id = l.id_lote
            LEFT JOIN lotes_granja AS l_g ON l.lote_granj_id = l_g.id_lote_g
        
            LEFT JOIN (
                SELECT 
                    inv_prod_id, 
                    SUM(cant_convertida) AS total_vendido_neto
                FROM detalle_ventas
                WHERE estado_venta = 'Vendido'
                GROUP BY inv_prod_id
            ) ventas_netas ON ventas_netas.inv_prod_id = pr.id_inventario
        
            LEFT JOIN (
                SELECT inv_prod_id, SUM(cant_convertida) AS total_perdido
                FROM inv_perdidas
                GROUP BY inv_prod_id
            ) pe ON pe.inv_prod_id = pr.id_inventario
                     
            LEFT JOIN unidades_medida um ON pr.unid_medida_id = um.id_unidad
        
            WHERE pr.id_inventario = :inv_prod_id   
        """)
        return db.execute(query, {"inv_prod_id": inv_prod_id}).mappings().first()
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener encabezado del reporte: {e}")
        raise Exception("Error al obtener encabezado del reporte")
    
def get_reporte_movimientos(db: Session, inv_prod_id: int):
    try:
        query = text("""
            -- Ventas individuales
            SELECT 
                'venta'                     as tipo,
                dv.id_detalle_venta         as id_registro,
                dv.cant_convertida          as cantidad,
                dv.precio_venta             as valor,
                dv.estado_venta             as estado,
                v.nombre_comprador          as referencia,
                v.fecha_venta               as fecha,
                ' '                        as motivo
            FROM detalle_ventas dv
            LEFT JOIN ventas v ON dv.venta_id = v.id_venta
            WHERE dv.inv_prod_id = :inv_prod_id

            UNION ALL

            -- Pérdidas y devoluciones individuales
            SELECT 
                'perdida'                   as tipo,
                p.id_perdida                as id_registro,
                p.cant_convertida           as cantidad,
                ip.valor_unitario           as valor,
                ' '                        as estado,
                p.observaciones             as referencia,
                p.fecha_reporte             as fecha,
                p.motivo                    as motivo
            FROM inv_perdidas p
            LEFT JOIN inv_produccion ip ON p.inv_prod_id = ip.id_inventario
            WHERE p.inv_prod_id = :inv_prod_id            ORDER BY fecha ASC
        """)
        return db.execute(query, {"inv_prod_id": inv_prod_id}).mappings().all()
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener movimientos del reporte: {e}")
        raise Exception("Error al obtener movimientos del reporte")

def get_reporte_produccion_detallado(db: Session, inv_prod_id: int):
    encabezado = get_reporte_encabezado(db, inv_prod_id)
    if not encabezado:
        return None
    
    movimientos = get_reporte_movimientos(db, inv_prod_id)

    return {
        "encabezado": dict(encabezado),
        "movimientos": [dict(m) for m in movimientos]
    }

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

def get_produccion_by_date_range(db: Session, fecha_inicio: str, fecha_fin: str):
    """
    Obtiene las tareas cuya fecha de inicio o fin esté dentro de un rango de fechas.
    Ignora las horas (usa DATE(fecha_hora_init) y DATE(fecha_hora_fin)).
    """
    try:
        query = text("""
                    SELECT pr.id_inventario, pr.nombre_producto, pr.cantidad, pr.unid_medida_id,
                        pr.fecha_ingreso, pr.fecha_vencimiento, pr.lote_id, pr.valor_unitario,
                        l_g.nombre_lote, l.categoria_id, l.especie_id, c.nombre_categoria, e.nombre_especie, u_m.simbolo
                        FROM inv_produccion pr
                        LEFT JOIN lote_produccion AS l ON pr.lote_id = l.id_lote
                        LEFT JOIN lotes_granja AS l_g ON l.lote_granj_id = l_g.id_lote_g
                        LEFT JOIN categorias AS c ON l.categoria_id = c.id_categoria
                        LEFT JOIN especies AS e ON l.especie_id = e.id_especie
                        LEFT JOIN unidades_medida AS u_m ON pr.unid_medida_id = u_m.id_unidad
                    WHERE DATE(pr.fecha_ingreso) BETWEEN :fecha_inicio AND :fecha_fin
                    ORDER BY pr.fecha_ingreso DESC
                """)
        result = db.execute(query, {
            "fecha_inicio": fecha_inicio,
            "fecha_fin": fecha_fin
        }).mappings().all()
        
        return [dict(row) for row in result]

    except SQLAlchemyError as e:
        raise Exception(f"Error al consultar los productos por rango de fechas: {e}")

def all_produccion(db: Session):
    registrar_vencidos_como_perdidas(db)
    try:
        query = text("""SELECT pr.id_inventario, pr.nombre_producto, pr.cantidad, pr.unid_medida_id,
                     pr.fecha_ingreso, pr.fecha_vencimiento, pr.lote_id, pr.valor_unitario,
                     l_g.nombre_lote, l.categoria_id, l.especie_id, c.nombre_categoria, e.nombre_especie, u_m.simbolo
                     FROM inv_produccion pr
                     LEFT JOIN lote_produccion AS l ON pr.lote_id = l.id_lote
                     LEFT JOIN lotes_granja AS l_g ON l.lote_granj_id = l_g.id_lote_g
                     LEFT JOIN categorias AS c ON l.categoria_id = c.id_categoria
                     LEFT JOIN especies AS e ON l.especie_id = e.id_especie
                     LEFT JOIN unidades_medida AS u_m ON pr.unid_medida_id = u_m.id_unidad
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
        logger.error(f"Error al obtener todas las producciones: {e}")
        raise Exception("Error de base de datos al obtener todas las producciones")

def get_produccion_paginated(db: Session, skip: int = 0, limit: int = 10):

    """
    Obtiene inventario de producción con paginación.
    Compatible con PostgreSQL, MySQL y SQLite.
    """
    registrar_vencidos_como_perdidas(db)
    try:
        # Total de producción
        count_query = text("""
            SELECT COUNT(pr.id_inventario) AS total
            FROM inv_produccion AS pr
            LEFT JOIN lote_produccion AS l ON pr.lote_id = l.id_lote
            LEFT JOIN categorias AS c ON l.categoria_id = c.id_categoria
            LEFT JOIN especies AS e ON l.especie_id = e.id_especie
            LEFT JOIN unidades_medida AS u_m ON pr.unid_medida_id = u_m.id_unidad
            ORDER BY pr.fecha_vencimiento ASC
        """)

        total_result = db.execute(count_query).scalar()

        # Producción paginada
        data_query = text(""" 
                        SELECT pr.id_inventario, pr.nombre_producto, pr.cantidad, pr.unid_medida_id,
                        pr.fecha_ingreso, pr.fecha_vencimiento, pr.lote_id, pr.valor_unitario,
                        l_g.nombre_lote, l.categoria_id, l.especie_id, c.nombre_categoria, e.nombre_especie, u_m.simbolo
                        FROM inv_produccion pr
                        LEFT JOIN lote_produccion AS l ON pr.lote_id = l.id_lote
                        LEFT JOIN lotes_granja AS l_g ON l.lote_granj_id = l_g.id_lote_g
                        LEFT JOIN categorias AS c ON l.categoria_id = c.id_categoria
                        LEFT JOIN especies AS e ON l.especie_id = e.id_especie
                        LEFT JOIN unidades_medida AS u_m ON pr.unid_medida_id = u_m.id_unidad
                        ORDER BY pr.fecha_vencimiento ASC
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
            alerta = get_nivel_alerta(data.get("fecha_vencimiento", ""), data.get("cantidad", 0))
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
    