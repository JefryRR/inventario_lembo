from datetime import date

from sqlalchemy.orm import Session # type: ignore
from sqlalchemy import text # type: ignore
from sqlalchemy.exc import SQLAlchemyError # type: ignore
from typing import Optional
from app.schemas.inv_perdida import PerdidaCreate, PerdidaUpdate, PerdidaOut

import logging

logger = logging.getLogger(__name__)

def create_perdida(db: Session, perdida: PerdidaCreate, user_id: int) -> Optional[bool]:
    try:

        duplicado = db.execute(text("""
            SELECT COUNT(*) FROM inv_perdidas
            WHERE inv_prod_id = :inv_prod_id
            AND DATE(fecha_reporte) = DATE(:fecha_reporte)
            AND motivo = :motivo
            AND origen = :origen                                    
        """), {"inv_prod_id": perdida.inv_prod_id, "fecha_reporte": perdida.fecha_reporte, "motivo": perdida.motivo, "origen": perdida.origen}).scalar()

        if duplicado and duplicado > 0:
            raise Exception("Ya existe una pérdida registrada para este producto, si desea modificarla, informe al administrador.")
        
        if perdida.origen == "produccion":
            disponible = db.execute(text("""
                SELECT cantidad
                FROM inv_produccion
                WHERE id_inventario = :inv_prod_id
            """), {"inv_prod_id": perdida.inv_prod_id}).mappings().first()

            if not disponible:
                raise ValueError("Producto no encontrado en inventario de producción")

            if float(disponible["cantidad"] or 0) <= 0:
                raise ValueError("No se puede descontar la pérdida porque el inventario de producción está en 0")
            
            # Validación de vencimiento según origen
            if perdida.origen == "produccion":
                vencimiento = db.execute(text("""
                    SELECT fecha_vencimiento
                    FROM inv_produccion
                    WHERE id_inventario = :inv_prod_id
                """), {"inv_prod_id": perdida.inv_prod_id}).scalar()

                if vencimiento and vencimiento.date() < date.today():
                    raise ValueError("No se puede registrar la pérdida porque el inventario ya está vencido.")

            if perdida.origen == "insumo":
                vencimiento = db.execute(text("""
                    SELECT fecha_vencimiento
                    FROM inv_insumos
                    WHERE id_insumo = :inv_prod_id
                """), {"inv_prod_id": perdida.inv_prod_id}).scalar()

                if vencimiento and vencimiento.date() < date.today():
                    raise ValueError("No se puede registrar la pérdida porque el insumo ya está vencido.")
            
        if perdida.origen == "insumo":
            insumo_disp = db.execute(text("""
                                        SELECT cantidad
                                        FROM inv_insumos
                                        WHERE id_insumo = :inv_prod_id
                                     """), {"inv_prod_id": perdida.inv_prod_id}).mappings().first()

            if not insumo_disp:
                 raise ValueError("Producto no encontrado en inventario de insumos")
        
            if float(insumo_disp["cantidad"] or 0) <= 0:
                raise ValueError("No se puede descontar la pérdida porque el inventario de insumos está en 0")
            

        conv = db.execute(text("""
            SELECT conversion FROM unidades_medida
            WHERE id_unidad = :unid_medida_id
        """), {"unid_medida_id": perdida.unid_medida_id}).scalar()

        if not conv:
            raise Exception("Unidad de medida no encontrada")

        query = text("""
            INSERT INTO inv_perdidas (
                inv_prod_id, cantidad, origen, motivo, fecha_reporte, 
                user_id, observaciones, unid_medida_id, cant_convertida
            ) VALUES (
                :inv_prod_id, :cantidad, :origen, :motivo, :fecha_reporte,
                :user_id, :observaciones, :unid_medida_id, :cant_convertida
            )
        """)
        params = perdida.model_dump()
        params["origen"] = perdida.origen.value
        params["motivo"] = perdida.motivo.value
        params["user_id"] = user_id
        params["cant_convertida"] = float(perdida.cantidad) * float(conv)
        db.execute(query, params)
        db.commit()
        return True
    except ValueError:
        raise
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al crear la pérdida: {e}")
        raise Exception("Error de base de datos al crear la pérdida")
           
def get_perdida_by_id(db: Session, id: int) -> Optional[PerdidaOut]:
    try:
        result = db.execute(text("""
            SELECT 
                p.*,
                CASE 
                    WHEN p.origen = 'produccion' THEN ip.nombre_producto
                    WHEN p.origen = 'insumo' THEN ii.nombre_producto
                END AS nombre_producto,
                CASE 
                    WHEN p.origen = 'produccion' THEN ip.valor_unitario
                    WHEN p.origen = 'insumo' THEN ii.precio_unitario
                END AS valor_unitario,
                lg.nombre_lote,
                u.nombre_user, um.simbolo
            FROM inv_perdidas p
            LEFT JOIN inv_produccion ip 
                ON p.origen = 'produccion' AND p.inv_prod_id = ip.id_inventario
            LEFT JOIN lote_produccion lp
                ON ip.lote_id = lp.id_lote
            LEFT JOIN lotes_granja lg
                ON lp.lote_granj_id = lg.id_lote_g
            LEFT JOIN inv_insumos ii 
                ON p.origen = 'insumo' AND p.inv_prod_id = ii.id_insumo
            LEFT JOIN users u
                ON p.user_id = u.id_user
            LEFT JOIN unidades_medida um
                ON p.unid_medida_id = um.id_unidad
            WHERE p.id_perdida = :id
        """), {"id": id}).mappings().first()

        if not result:
            raise ValueError("Pérdida no encontrada")

        return result
    except ValueError:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener pérdida por id: {e}")
        raise Exception("Error de base de datos al obtener la pérdida")
    
def update_perdida_by_id(db: Session, id: int, perdida_update: PerdidaUpdate):
    try:
    # Solo los campos enviados por el usuario
        perdida_data = perdida_update.model_dump(exclude_unset=True)
        if not perdida_data:
            return False  # nada que actualizar
         # Construir dinámicamente la sentencia UPDATE
        set_clauses = ", ".join([f"{key} = :{key}" for key in perdida_data.keys()])
        sentencia = text(f"""
             UPDATE inv_perdidas
             SET {set_clauses}
             WHERE id_perdida = :id_perdida
         """)
         # Agregar el id_perdida
        perdida_data["id_perdida"] = id
        result = db.execute(sentencia, perdida_data)
        db.commit()
        return result.rowcount > 0
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al actualizar pérdida {id}: {e}")
        raise Exception("Error de base de datos al actualizar la pérdida")
     
def all_perdidas(db: Session) -> list[PerdidaOut]:
    try:
        query = text("""
                        SELECT p.*,
                            CASE 
                                WHEN p.origen = 'produccion' THEN ip.nombre_producto
                                WHEN p.origen = 'insumo' THEN ii.nombre_producto
                            END AS nombre_producto,
                            CASE 
                                WHEN p.origen = 'produccion' THEN ip.valor_unitario
                                WHEN p.origen = 'insumo' THEN ii.precio_unitario
                            END AS valor_unitario,
                            lg.nombre_lote,
                            u.nombre_user, um.simbolo
                        FROM inv_perdidas p
                        LEFT JOIN inv_produccion ip ON p.origen = 'produccion' AND p.inv_prod_id = ip.id_inventario
                        LEFT JOIN lote_produccion lp ON ip.lote_id = lp.id_lote
                        LEFT JOIN lotes_granja lg ON lp.lote_granj_id = lg.id_lote_g
                        LEFT JOIN inv_insumos ii ON p.origen = 'insumo' AND p.inv_prod_id = ii.id_insumo
                        LEFT JOIN users u ON p.user_id = u.id_user
                        LEFT JOIN unidades_medida um ON p.unid_medida_id = um.id_unidad
                        ORDER BY p.fecha_reporte DESC
                    """)
        results = db.execute(query).mappings().all()
        return results
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener todas las pérdidas: {e}")
        raise Exception("Error de base de datos al obtener las pérdidas")

def get_perdidas_by_date_range(db: Session, fecha_inicio: str, fecha_fin: str):
    """
    Obtiene las tareas cuya fecha de inicio o fin esté dentro de un rango de fechas.
    Ignora las horas (usa DATE(fecha_init) y DATE(fecha_fin)).
    """
    try:
        query = text("""
            SELECT p.*,
                CASE 
                    WHEN p.origen = 'produccion' THEN ip.nombre_producto
                    WHEN p.origen = 'insumo' THEN ii.nombre_producto
                END AS nombre_producto,
                CASE 
                    WHEN p.origen = 'produccion' THEN ip.valor_unitario
                    WHEN p.origen = 'insumo' THEN ii.precio_unitario
                END AS valor_unitario,
                lg.nombre_lote,
                u.nombre_user, um.simbolo
            FROM inv_perdidas p
            LEFT JOIN inv_produccion ip ON p.origen = 'produccion' AND p.inv_prod_id = ip.id_inventario
            LEFT JOIN lote_produccion lp ON ip.lote_id = lp.id_lote
            LEFT JOIN lotes_granja lg ON lp.lote_granj_id = lg.id_lote_g
            LEFT JOIN inv_insumos ii ON p.origen = 'insumo' AND p.inv_prod_id = ii.id_insumo
            LEFT JOIN users u ON p.user_id = u.id_user
            LEFT JOIN unidades_medida um ON p.unid_medida_id = um.id_unidad
            WHERE DATE(p.fecha_reporte) BETWEEN :fecha_inicio AND :fecha_fin
            ORDER BY p.fecha_reporte DESC
        """)
        result = db.execute(query, {
            "fecha_inicio": fecha_inicio,
            "fecha_fin": fecha_fin
        }).mappings().all()
        
        return [dict(row) for row in result]

    except SQLAlchemyError as e:
        raise Exception(f"Error al consultar los perdidas por rango de fechas: {e}")

def get_perdidas_paginated(db: Session, skip: int = 0, limit: int = 10):
    try:
        count_query = text("""
            SELECT COUNT(p.id_perdida) AS total
            FROM inv_perdidas p
        """)
        total_result = db.execute(count_query).scalar()

        data_query = text("""SELECT p.*,
                                CASE 
                                    WHEN p.origen = 'produccion' THEN ip.nombre_producto
                                    WHEN p.origen = 'insumo' THEN ii.nombre_producto
                                END AS nombre_producto,
                                CASE 
                                    WHEN p.origen = 'produccion' THEN ip.valor_unitario
                                    WHEN p.origen = 'insumo' THEN ii.precio_unitario
                                END AS valor_unitario,
                                lg.nombre_lote,
                                u.nombre_user, um.simbolo
                            FROM inv_perdidas p
                            LEFT JOIN inv_produccion ip ON p.origen = 'produccion' AND p.inv_prod_id = ip.id_inventario
                            LEFT JOIN lote_produccion lp ON ip.lote_id = lp.id_lote
                            LEFT JOIN lotes_granja lg ON lp.lote_granj_id = lg.id_lote_g
                            LEFT JOIN inv_insumos ii ON p.origen = 'insumo' AND p.inv_prod_id = ii.id_insumo
                            LEFT JOIN users u ON p.user_id = u.id_user
                            LEFT JOIN unidades_medida um ON p.unid_medida_id = um.id_unidad
                            ORDER BY p.fecha_reporte DESC
                            LIMIT :limit OFFSET :skip
                        """)

        perdidas_list = db.execute(
            data_query,
            {"limit": limit, "skip": skip}
        ).mappings().all()

        return {
            "total": total_result or 0,
            "perdidas": perdidas_list
        }
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener las pérdidas: {e}", exc_info=True)
        raise Exception("Error de base de datos al obtener las pérdidas")
