from sqlalchemy.orm import Session # type: ignore
from sqlalchemy import text # type: ignore
from sqlalchemy.exc import SQLAlchemyError # type: ignore
from datetime import date
from app.schemas.maquinaria import MaquinariaCreate, MaquinariaUpdate

import logging

logger = logging.getLogger(__name__)

def create_maquina(db: Session, maquina: MaquinariaCreate):
    try:
        existing_maquina = get_maquina_by_num_serie(db, maquina.num_serie)
        if existing_maquina:
            raise ValueError("Ya existe una máquina con ese número de serie")

        query = text("""INSERT INTO maquinaria 
                        (nombre_maq, tipo_maq, marca, modelo, num_serie, fecha_compra, ubicacion, observaciones
                        ) VALUES (
                        :nombre_maq, :tipo_maq, :marca, :modelo, :num_serie, :fecha_compra, :ubicacion, :observaciones )
                    """)
        db.execute(query, maquina.model_dump())
        db.commit()
        return True
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al registrar la máquina: {e}")
        raise Exception("Error de base de datos al registrar la máquina")

def get_maquina_by_id(db: Session, id: int):
    try:
        query = text("""SELECT id_maquina, nombre_maq, tipo_maq, marca, modelo,
                  num_serie, fecha_compra, estado, ubicacion, observaciones
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
                  num_serie, fecha_compra, estado, ubicacion, observaciones
                     FROM maquinaria
                     WHERE num_serie = :num_serie
                """)
        result = db.execute(query, {"num_serie": num_serie}).mappings().first()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener la máquina por número de serie: {e}")
        raise Exception("Error de base de datos al obtener la máquina")

# def get_reporte_encabezado(db: Session, inv_prod_id: int):
#     try:
#         query = text("""
#            SELECT 
#             pr.id_inventario,
#             pr.nombre_producto,
#             pr.fecha_ingreso,
#             pr.fecha_vencimiento,
#             pr.valor_unitario,
#             um.simbolo,
#             l_g.nombre_lote,
    
#             -- Cantidad inicial: reconstruida sumando todo lo que salió
#             CASE
#                 WHEN pr.fecha_vencimiento IS NOT NULL
#                      AND pr.fecha_vencimiento < CURRENT_DATE
#                 THEN COALESCE(ventas_netas.total_vendido_neto, 0)
#                      + COALESCE(pe.total_perdido, 0)
#                 ELSE pr.cantidad
#                     + COALESCE(ventas_netas.total_vendido_neto, 0)
#                     + COALESCE(pe.total_perdido, 0)
#             END AS cantidad_inicial,
    
#             -- Stock actual: pr.cantidad ya tiene descontado ventas y pérdidas
#             CASE 
#                 WHEN pr.fecha_vencimiento IS NOT NULL 
#                      AND pr.fecha_vencimiento < CURRENT_DATE 
#                 THEN 0
#                 ELSE pr.cantidad
#             END AS stock_actual,
    
#             COALESCE(ventas_netas.total_vendido_neto, 0) AS total_vendido,
#             COALESCE(pe.total_perdido, 0)                AS total_perdido
    
#             FROM maquinaria pr
#             LEFT JOIN lote_maquina l ON pr.lote_id = l.id_lote
#             LEFT JOIN lotes_granja AS l_g ON l.lote_granj_id = l_g.id_lote_g
        
#             LEFT JOIN (
#                 SELECT 
#                     inv_prod_id, 
#                     SUM(cant_convertida) AS total_vendido_neto
#                 FROM detalle_ventas
#                 WHERE estado_venta = 'Vendido'
#                 GROUP BY inv_prod_id
#             ) ventas_netas ON ventas_netas.inv_prod_id = pr.id_inventario
        
#             LEFT JOIN (
#                 SELECT inv_prod_id, SUM(cant_convertida) AS total_perdido
#                 FROM inv_perdidas
#                 GROUP BY inv_prod_id
#             ) pe ON pe.inv_prod_id = pr.id_inventario
                     
#             LEFT JOIN unidades_medida um ON pr.unid_medida_id = um.id_unidad
        
#             WHERE pr.id_inventario = :inv_prod_id   
#         """)
#         return db.execute(query, {"inv_prod_id": inv_prod_id}).mappings().first()
#     except SQLAlchemyError as e:
#         logger.error(f"Error al obtener encabezado del reporte: {e}")
#         raise Exception("Error al obtener encabezado del reporte")
    
# def get_reporte_movimientos(db: Session, inv_prod_id: int):
#     try:
#         query = text("""
#             -- Ventas individuales
#             SELECT 
#                 'venta'                     as tipo,
#                 dv.id_detalle_venta         as id_registro,
#                 dv.cant_convertida          as cantidad,
#                 dv.precio_venta             as valor,
#                 dv.estado_venta             as estado,
#                 v.nombre_comprador          as referencia,
#                 v.fecha_venta               as fecha,
#                 ' '                        as motivo
#             FROM detalle_ventas dv
#             LEFT JOIN ventas v ON dv.venta_id = v.id_venta
#             WHERE dv.inv_prod_id = :inv_prod_id

#             UNION ALL

#             -- Pérdidas y devoluciones individuales
#             SELECT 
#                 'perdida'                   as tipo,
#                 p.id_perdida                as id_registro,
#                 p.cant_convertida           as cantidad,
#                 ip.valor_unitario           as valor,
#                 ' '                        as estado,
#                 p.observaciones             as referencia,
#                 p.fecha_reporte             as fecha,
#                 p.motivo                    as motivo
#             FROM inv_perdidas p
#             LEFT JOIN maquinaria ip ON p.inv_prod_id = ip.id_inventario
#             WHERE p.inv_prod_id = :inv_prod_id            ORDER BY fecha ASC
#         """)
#         return db.execute(query, {"inv_prod_id": inv_prod_id}).mappings().all()
#     except SQLAlchemyError as e:
#         logger.error(f"Error al obtener movimientos del reporte: {e}")
#         raise Exception("Error al obtener movimientos del reporte")

# def get_reporte_maquina_detallado(db: Session, inv_prod_id: int):
#     encabezado = get_reporte_encabezado(db, inv_prod_id)
#     if not encabezado:
#         return None
    
#     movimientos = get_reporte_movimientos(db, inv_prod_id)

#     return {
#         "encabezado": dict(encabezado),
#         "movimientos": [dict(m) for m in movimientos]
#     }

def update_maquina(db: Session, maquina_id: int, maquina: MaquinariaUpdate):
    try:

        estado_actual = text("SELECT estado FROM maquinaria WHERE id_maquina = :id_maquina");
        row = db.execute(estado_actual, {"id_maquina": maquina_id}).fetchone()
        if row is None:
            raise ValueError(f"No se encontró la máquina con id {maquina_id}")
        
        if row.estado == 'de_baja':
            raise ValueError("No se puede modificar una máquina que está dada de baja")

        maquina_data = maquina.model_dump(exclude_unset=True)
        if not maquina_data:
            return False
        set_clauses = ", ".join([f"{key} = :{key}" for key in maquina_data.keys()])
        query = text(f"""
            UPDATE maquinaria
            SET {set_clauses}
            WHERE id_maquina = :id_maquina
        """)
        
        maquina_data["id_maquina"] = maquina_id
        result = db.execute(query, maquina_data)
        db.commit()
        return result.rowcount > 0
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al actualizar la máquina {maquina_id}: {e}")
        raise Exception("Error de base de datos al actualizar la máquina")

def all_maquina(db: Session):
    try:
        query = text("""SELECT id_maquina, nombre_maq, tipo_maq, marca, modelo,
                      num_serie, fecha_compra, estado, ubicacion, observaciones
                     FROM maquinaria
                    """)
        result = db.execute(query).mappings().all()
        return result
    
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener todas las maquinaes: {e}")
        raise Exception("Error de base de datos al obtener todas las maquinaes")

def get_maquina_paginated(db: Session, skip: int = 0, limit: int = 10):

    """
    Obtiene inventario de producción con paginación.
    Compatible con PostgreSQL, MySQL y SQLite.
    """
    try:
        # Total de producción
        count_query = text("""
            SELECT COUNT(id_maquina) AS total
            FROM maquinaria
            ORDER BY fecha_compra ASC
        """)

        total_result = db.execute(count_query).scalar()

        # Producción paginada
        data_query = text(""" 
                        SELECT id_maquina, nombre_maq, tipo_maq, marca, modelo,
                            num_serie, fecha_compra, estado, ubicacion, observaciones
                            FROM maquinaria
                            ORDER BY fecha_compra ASC
                        LIMIT :limit OFFSET :skip
                    """)
            
        maquinas_list = db.execute(data_query,
            {
                "limit": limit,
                "skip": skip
            }).mappings().all()

        return {
            "total": total_result or 0,
            "maquinas": maquinas_list
        }

    except SQLAlchemyError as e:
        logger.error(f"Error al obtener las máquinas: {e}", exc_info=True)
        raise Exception("Error de base de datos al obtener las máquinas")
    