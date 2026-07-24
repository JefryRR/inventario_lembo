from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import text 
from sqlalchemy.exc import SQLAlchemyError 
from app.schemas.inv_insumos import InsumoCreate, InsumoUpdate
from typing import Optional
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)

# Crear un nuevo insumo
def create_insumo(db: Session, insumo: InsumoCreate, factura_url: str | None = None, fecha_compra: date | None = None, usuario_id: int | None = None):
    try:
        # Validar duplicado
        insumo_exitente = db.execute(
            text("SELECT id_insumo FROM inv_insumos WHERE nombre_producto = :nombre_producto"),
            {"nombre_producto": insumo.nombre_producto}
        ).fetchone()

        if insumo_exitente:
            raise ValueError("Ya existe un insumo con ese nombre")
        
        # Obtener conversión
        conv = db.execute(text("""
            SELECT conversion FROM unidades_medida
            WHERE id_unidad = :unid_medida_id
        """), {"unid_medida_id": insumo.unid_medida_id}).scalar()

        if not conv:
            raise ValueError("Unidad de medida no encontrada")

        # Insertar insumo con cant_convertida
        query = text("""
            INSERT INTO inv_insumos(
                nombre_producto, cantidad, unid_medida_id, 
                precio_unitario, min_stock, fecha_ingreso, fecha_vencimiento, tipo_id)
            VALUES (
                :nombre_producto, :cantidad, :unid_medida_id, 
                :precio_unitario, :min_stock, :fecha_ingreso, :fecha_vencimiento, :tipo_id)
        """)
        params = insumo.model_dump()

        db.execute(query, params)
        id_insumo = db.execute(text("SELECT LAST_INSERT_ID()")).scalar()

        # Insertar factura en la misma transacción si viene
        if factura_url and fecha_compra and usuario_id:
            db.execute(text("""
                INSERT INTO facturas_compra (insumo_id, factura_url, fecha_compra, usuario_id)
                VALUES (:insumo_id, :factura_url, :fecha_compra, :usuario_id)
            """), {
                "insumo_id": id_insumo,
                "factura_url": factura_url,
                "fecha_compra": fecha_compra,
                "usuario_id": usuario_id
            })

        db.commit()
        return id_insumo

    except ValueError:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Error al registrar el insumo: {e}")
        db.rollback()
        raise Exception("Error de base de datos al registrar el insumo")

# Obtener un insumo por su ID
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

# Obtener todos los insumos
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
        logger.error(f"Error al obtener todos los insumos: {e}")
        raise

# Obtener la factura asociada a un insumo por su ID
def get_factura_by_id(db: Session, insumo_id: int):
    try:
        query = text("""
            SELECT f_c.factura_url, f_c.fecha_compra, f_c.usuario_id, f_c.insumo_id, u.nombre_user
            FROM facturas_compra AS f_c
            LEFT JOIN users u on f_c.usuario_id = u.id_user
            WHERE f_c.insumo_id = :insumo_id
        """)
        result = db.execute(query, {"insumo_id": insumo_id}).fetchone()
        return dict(result._mapping)
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener la factura por id: {e}")
        raise

# Función para registrar automáticamente los insumos vencidos como pérdidas
def registrar_vencidos_como_perdidas(db: Session):
    try:
        # Obtener insumos vencidos que aún no han sido registrados como pérdidas
        vencidos = db.execute(text("""
            SELECT ii.id_insumo, ii.cantidad, 
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

        # Registrar cada insumo vencido como pérdida
        for row in vencidos:
            db.execute(text("""
                INSERT INTO inv_perdidas (
                    inv_prod_id, cantidad, origen, motivo,
                    fecha_reporte, user_id,
                    unid_medida_id, observaciones
                ) VALUES (
                    :inv_prod_id, :cantidad, :origen, :motivo,
                    :fecha_reporte, :user_id,
                    :unid_medida_id, :observaciones
                )
            """), {
                "inv_prod_id": row["id_insumo"],
                "cantidad": row["cantidad"],
                "origen": "insumo",
                "motivo": "vencimiento",
                "fecha_reporte": date.today(),
                "user_id": None,
                "unid_medida_id": row["unid_medida_id"],
                "observaciones": f"Registrado automáticamente. Fecha de vencimiento: {row['fecha_vencimiento']}"
            })

        db.commit()
        return len(vencidos)
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al registrar vencidos: {e}")
        raise Exception("Error al registrar productos vencidos como pérdidas")

# Actualizar un insumo por su ID
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

# Función para calcular el nivel de alerta de un insumo según su fecha de vencimiento y cantidad
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
        fecha_vencimiento = fecha_vencimiento.date() # type: ignore

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

#Función para obtener el encabezado del reporte de insumo
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

                -- Cantidad inicial:
                CASE 
                    WHEN ii.fecha_vencimiento IS NOT NULL 
                         AND ii.fecha_vencimiento < CURRENT_DATE 
                    THEN COALESCE(pe.total_perdido, ii.cantidad)
                    ELSE ii.cantidad
                        + COALESCE(sol.total_entregado, 0)
                        - COALESCE(sol.total_devuelto, 0)
                        + COALESCE(pe.total_perdido, 0)
                        + COALESCE(ipl.total_entregado_plato, 0)
                END AS cantidad_inicial,
                               
                -- Cantidad actual: si está vencido, es 0; si no, es lo que haya en inv_insumos.
                CASE 
                    WHEN ii.fecha_vencimiento IS NOT NULL 
                         AND ii.fecha_vencimiento < CURRENT_DATE 
                    THEN 0
                    ELSE ii.cantidad
                END AS stock_actual,

                -- Total perdido: si está vencido, es lo ya registrado
                -- (o el remanente como fallback si aún no se registró la pérdida).
                -- Si no está vencido, es simplemente lo que haya en inv_perdidas.
                CASE 
                    WHEN ii.fecha_vencimiento IS NOT NULL 
                         AND ii.fecha_vencimiento < CURRENT_DATE 
                    THEN COALESCE(pe.total_perdido, ii.cantidad)
                    ELSE COALESCE(pe.total_perdido, 0)
                END AS total_perdido,

                COALESCE(sol.total_entregado, 0)+COALESCE(ipl.total_entregado_plato, 0) AS total_solicitado,
                COALESCE(sol.total_devuelto, 0) AS total_devuelto
                               
            FROM inv_insumos ii
            LEFT JOIN unidades_medida um ON ii.unid_medida_id = um.id_unidad
            LEFT JOIN (
                SELECT inv_prod_id, SUM(cantidad) AS total_perdido
                FROM inv_perdidas
                WHERE origen = 'insumo'
                GROUP BY inv_prod_id
            ) pe ON pe.inv_prod_id = ii.id_insumo
            LEFT JOIN (
                SELECT 
                    si.insumo_id,
                    SUM(CASE WHEN hsi.estado_solicitud_act = 'entregado' THEN hsi.cantidad_actual ELSE 0 END) AS total_entregado,
                    SUM(CASE WHEN hsi.estado_solicitud_act = 'devuelto' THEN hsi.cantidad_actual ELSE 0 END) AS total_devuelto
                FROM h_solicitud_insumo hsi
                INNER JOIN solicitud_insumo si ON hsi.solicitud_ins_id = si.id_solicitud
                WHERE hsi.estado_solicitud_act IN ('entregado', 'devuelto')
                GROUP BY si.insumo_id
            ) sol ON sol.insumo_id = ii.id_insumo
            LEFT JOIN (
                SELECT inp.inventario_id, SUM(inp.cant_conv_inv) AS total_entregado_plato, inp.origen_inv
                    FROM ingredientes_plato inp
                WHERE inp.origen_inv = 2
                GROUP BY inp.inventario_id
            )ipl ON ipl.inventario_id = ii.id_insumo
            WHERE ii.id_insumo = :id_insumo
        """), {"id_insumo": id_insumo}).mappings().first()
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener encabezado del reporte de insumo: {e}")
        raise Exception("Error al obtener encabezado del reporte de insumo")

# Función para obtener los movimientos del reporte de insumo 
def get_reporte_movimientos_insumo(db: Session, id_insumo: int):
    try:
        return db.execute(text("""
            SELECT *
            FROM (
                SELECT 
                    'perdida' AS tipo,
                    p.id_perdida AS id_registro,
                    p.cantidad AS cantidad,
                    ii.precio_unitario AS valor,
                    p.motivo AS motivo,
                    p.observaciones AS observaciones,
                    p.unid_medida_id AS unidad_medida,
                    p.fecha_reporte AS fecha,
                    u.nombre_user AS registrado_por,
                    um_.simbolo AS simbolo
                FROM inv_perdidas p
                LEFT JOIN inv_insumos ii ON p.inv_prod_id = ii.id_insumo
                LEFT JOIN users u ON p.user_id = u.id_user
                LEFT JOIN unidades_medida um_ ON p.unid_medida_id = um_.id_unidad
                WHERE p.inv_prod_id = :id_insumo
                  AND p.origen = 'insumo'

                UNION ALL

                SELECT
                    'solicitud' AS tipo,
                    hsi.id_hist_solic AS id_registro,
                    hsi.cantidad_actual AS cantidad,
                    ii.precio_unitario AS valor,
                    hsi.estado_solicitud_act AS motivo,
                    CONCAT('solicitante: ', COALESCE(si.solicitante, '')) AS observaciones,
                    CASE
                        WHEN hsi.estado_solicitud_act = 'entregado' THEN si.fecha_entrega
                        WHEN hsi.estado_solicitud_act = 'devuelto' THEN si.fecha_devolucion
                        ELSE si.fecha_solicitud
                    END AS fecha,
                    si.unid_med_id AS unidad_medida,
                    u.nombre_user AS registrado_por,
                    um.simbolo AS simbolo
                FROM h_solicitud_insumo hsi
                LEFT JOIN solicitud_insumo si ON hsi.solicitud_ins_id = si.id_solicitud
                LEFT JOIN inv_insumos ii ON si.insumo_id = ii.id_insumo
                LEFT JOIN users u ON hsi.user_id = u.id_user
                LEFT JOIN unidades_medida um ON si.unid_med_id = um.id_unidad
                WHERE si.insumo_id = :id_insumo
                
                UNION ALL
                               
                SELECT
                    'Plato' AS tipo,
                    inp.id_ingrediente AS id_registro,
                    inp.cant_conv_inv AS cantidad,
                    ii.precio_unitario AS valor,
                    'Entregado' AS motivo,
                    CONCAT('Destinado para el plato: ', COALESCE(pl.nombre_plato, '')) AS observaciones,
                    inp.fecha_registro AS fecha,
                    'Área de Cocina' AS registrado_por,
                    inp.unid_med_id AS unidad_medida,
                    um_.simbolo AS simbolo
                FROM ingredientes_plato inp
                LEFT JOIN platos pl ON inp.plato_id = pl.id_plato
                LEFT JOIN inv_insumos ii ON inp.inventario_id = ii.id_insumo
                LEFT JOIN unidades_medida um_ ON inp.unid_med_id = um_.id_unidad
                WHERE inp.inventario_id = :id_insumo AND inp.origen_inv = 2
            ) movimientos
            ORDER BY movimientos.fecha ASC, movimientos.id_registro ASC
        """), {"id_insumo": id_insumo}).mappings().all()
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener movimientos del reporte de insumo: {e}")
        raise Exception("Error al obtener movimientos del reporte de insumo")

# Función para obtener el reporte detallado de un insumo
def get_reporte_insumo_detallado(db: Session, id_insumo: int):
    encabezado = get_reporte_encabezado_insumo(db, id_insumo)
    if not encabezado:
        return None

    movimientos = get_reporte_movimientos_insumo(db, id_insumo)

    return {
        "encabezado": dict(encabezado),
        "movimientos": [dict(m) for m in movimientos]
    }

# Función para obtener insumos por rango de fechas
def get_insumos_by_date_range(db: Session, fecha_inicio: str, fecha_fin: str):
    """
    Obtiene las tareas cuya fecha de inicio o fin esté dentro de un rango de fechas.
    Ignora las horas (usa DATE(fecha_init) y DATE(fecha_fin)).
    """
    try:
        query = text("""
            SELECT i_in.id_insumo, i_in.nombre_producto, i_in.cantidad, i_in.unid_medida_id, i_in.precio_unitario,
                        i_in.min_stock, i_in.fecha_ingreso, i_in.fecha_vencimiento, i_in.tipo_id, t_i.nombre_tipo, u_m.simbolo
                        FROM inv_insumos AS i_in
                        INNER JOIN  tipo_insumo AS t_i ON i_in.tipo_id = t_i.id_tipo_insumo
                        LEFT JOIN unidades_medida AS u_m ON i_in.unid_medida_id = u_m.id_unidad
            WHERE DATE(i_in.fecha_ingreso) BETWEEN :fecha_inicio AND :fecha_fin
            ORDER BY i_in.fecha_ingreso DESC
        """)
        result = db.execute(query, {
            "fecha_inicio": fecha_inicio,
            "fecha_fin": fecha_fin
        }).mappings().all()
        
        return [dict(row) for row in result]

    except SQLAlchemyError as e:
        raise Exception(f"Error al consultar los insumos por rango de fechas: {e}")

<<<<<<< HEAD
# Función para obtener insumos con paginación y filtrado por estado
def get_insumos_paginated(db: Session, skip: int = 0, limit: int = 10, estado: Optional[str] = None):
=======
def get_insumos_paginated(db: Session, skip: int = 0, limit: int = 10, estado: Optional[str] = None, search: Optional[str] = None):
>>>>>>> 4d7f0f246392f0e0fa2474862b82d6893f3f228c
    """
    Obtiene insumos con paginación.
    Compatible con PostgreSQL, MySQL y SQLite.
    """
    try:
        # Construir cláusula WHERE según el estado, para filtrar por los insumos vigentes, vencidos, sin stock, críticos o urgentes.
        where_clause = ""
        params = {"limit": limit, "skip": skip}

        if estado:
            hoy = date.today()
            params["hoy"] = hoy
            if estado == "vencido":
                where_clause = "WHERE i_in.fecha_vencimiento < :hoy AND i_in.cantidad > 0"
            elif estado == "sin_stock":
                where_clause = "WHERE i_in.cantidad <= 0"
            elif estado == "critico":
                where_clause = """WHERE i_in.fecha_vencimiento >= :hoy 
                    AND i_in.fecha_vencimiento <= :hoy_mas_7 AND i_in.cantidad > 0"""
                params["hoy_mas_7"] = hoy + timedelta(days=7)
            elif estado == "urgente":
                where_clause = """WHERE i_in.fecha_vencimiento > :hoy_mas_7 
                    AND i_in.fecha_vencimiento <= :hoy_mas_15 AND i_in.cantidad > 0"""
                params["hoy_mas_7"] = hoy + timedelta(days=7)
                params["hoy_mas_15"] = hoy + timedelta(days=15)
            elif estado == "vigente":
                where_clause = "WHERE i_in.fecha_vencimiento > :hoy_mas_15 AND i_in.cantidad > 0"
                params["hoy_mas_15"] = hoy + timedelta(days=15)

        if search:
            where_clause = "WHERE LOWER(i_in.nombre_producto) LIKE LOWER(:search) OR LOWER(t_i.nombre_tipo) LIKE LOWER(:search)"
            params["search"] = f"%{search}%"

        # Total de insumos
        count_query = text(f"""
            SELECT COUNT(i_in.id_insumo) AS total
            FROM inv_insumos AS i_in
            LEFT JOIN tipo_insumo AS t_i ON i_in.tipo_id = t_i.id_tipo_insumo
            LEFT JOIN unidades_medida AS u_m ON i_in.unid_medida_id = u_m.id_unidad

            {where_clause}
        """)

        total_result = db.execute(count_query, params).scalar()

        # Insumos paginados
        data_query = text(f""" 
                        SELECT i_in.id_insumo, i_in.nombre_producto, i_in.cantidad, i_in.unid_medida_id, i_in.precio_unitario,
                        i_in.min_stock, i_in.fecha_ingreso, i_in.fecha_vencimiento, i_in.tipo_id, t_i.nombre_tipo, u_m.simbolo
                        FROM inv_insumos AS i_in
                        LEFT JOIN  tipo_insumo AS t_i ON i_in.tipo_id = t_i.id_tipo_insumo
                        LEFT JOIN unidades_medida AS u_m ON i_in.unid_medida_id = u_m.id_unidad
                        {where_clause}
                        ORDER BY i_in.fecha_vencimiento ASC
                        LIMIT :limit OFFSET :skip
                    """)

        insumos_list = db.execute(data_query, params).mappings().all()

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