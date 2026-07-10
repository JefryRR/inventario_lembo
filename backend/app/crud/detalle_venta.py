from fastapi import HTTPException
from sqlalchemy.orm import Session # type: ignore
from sqlalchemy import text # type: ignore
from sqlalchemy.exc import SQLAlchemyError # type: ignore
from typing import Optional
from app.schemas.detalle_venta import DetalleVentaCreate, DetalleVentaUpdate, DetalleVentaOut, EstadoVenta
import logging

logger = logging.getLogger(__name__)

def create_detalle_venta(db: Session, detalle: DetalleVentaCreate):
    try:
        query_conversion = text("""
            SELECT conversion
            FROM unidades_medida
            WHERE id_unidad = :unid_medida_id
        """)
        
        result_conv = db.execute(
            query_conversion, 
            {"unid_medida_id": detalle.unid_medida_id}
        ).mappings().first()

        if not result_conv:
            logger.error("Unidad de medida no encontrada")
            raise Exception("Unidad de medida no encontrada")
        
        query = text("""
                     INSERT INTO detalle_ventas (
                        cantidad, unid_medida_id,
                        precio_venta, inv_prod_id, venta_id, estado_venta, cant_convertida
                     ) VALUES (
                        :cantidad, :unid_medida_id,
                        :precio_venta, :inv_prod_id, :venta_id, :estado_venta, :cant_convertida
                    )
                    """)

        params = detalle.model_dump()
        params["cant_convertida"] = params["cantidad"] * float(result_conv["conversion"])
        logger.info(f"params a insertar: {params}")
        result = db.execute(query, params)
        db.commit()
        return result.lastrowid
    
    except SQLAlchemyError as e:
        db.rollback()
        orig = getattr(e, 'orig', None)
        
        # Errores del trigger (SIGNAL SQLSTATE) vienen en orig como (1644, 'mensaje')
        if orig and hasattr(orig, 'args') and len(orig.args) >= 2:
            trigger_msg = orig.args[1]  # El texto limpio del SIGNAL

            if "no hay suficiente stock" in trigger_msg.lower():
                raise HTTPException(status_code=409, detail="No hay suficiente stock para registrar la venta")
            
            if "unidad de venta" in trigger_msg.lower():
                raise HTTPException(status_code=409, detail="La unidad de venta y la del inventario son incompatibles")
            
            if orig.args[0] == 1264 or "out of range" in trigger_msg.lower():
                raise HTTPException(
                    status_code=422,
                    detail="La cantidad ingresada es demasiado grande. Verifique el valor y las unidades."
                )
            
        logger.error(f"Error al registrar la venta: {e}")
        raise
    
def get_detalle_venta_by_id(db: Session, id: int) -> Optional[DetalleVentaOut]:
    try:
        query = text("""
            SELECT d_v.id_detalle_venta, d_v.cantidad, d_v.unid_medida_id,
                   d_v.precio_venta, d_v.inv_prod_id, d_v.venta_id, d_v.estado_venta, 
                    d_v.cant_convertida, v.nombre_comprador, u_m.simbolo, pr.nombre_producto
            FROM detalle_ventas d_v
            LEFT JOIN ventas AS v ON d_v.venta_id = v.id_venta
            LEFT JOIN unidades_medida AS u_m ON d_v.unid_medida_id = u_m.id_unidad
            LEFT JOIN inv_produccion AS pr ON d_v.inv_prod_id = pr.id_inventario
            WHERE d_v.id_detalle_venta = :id
        """)
        result = db.execute(query, {"id": id}).mappings().first()

        if not result:
            return None

        # Convert mapping to DetalleVentaOut model instance
        return DetalleVentaOut.model_validate(dict(result))
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener detalle de venta por id: {e}")
        raise Exception("Error de base de datos al obtener el detalle de venta")

def get_det_venta_by_id_venta(db: Session, id_venta: int):
    try:
        query = text("""
            SELECT d_v.id_detalle_venta, d_v.cantidad, d_v.unid_medida_id,
                   d_v.precio_venta, d_v.inv_prod_id, d_v.venta_id, d_v.estado_venta, 
                    d_v.cant_convertida, v.nombre_comprador, u_m.simbolo, pr.nombre_producto
            FROM detalle_ventas d_v
            LEFT JOIN ventas AS v ON d_v.venta_id = v.id_venta
            LEFT JOIN unidades_medida AS u_m ON d_v.unid_medida_id = u_m.id_unidad
            LEFT JOIN inv_produccion AS pr ON d_v.inv_prod_id = pr.id_inventario
            WHERE d_v.venta_id = :id_venta and v.fecha_venta = current_date
        """)
        result = db.execute(query, {"id_venta": id_venta}).mappings().all()

        if not result:
            return None

        # Convert mapping to DetalleVentaOut model instance
        return [DetalleVentaOut.model_validate(dict(row)) for row in result ]
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener detalle de venta por id: {e}")
        raise Exception("Error de base de datos al obtener el detalle de venta")

def get_all_detalles_venta(db: Session) -> list[DetalleVentaOut]:
    try:
        query = text("""
                     SELECT d_v.id_detalle_venta, d_v.cantidad, d_v.unid_medida_id,
                     d_v.precio_venta, d_v.inv_prod_id, d_v.venta_id, d_v.estado_venta, d_v.cant_convertida, 
                     v.nombre_comprador, u_m.simbolo, pr.nombre_producto
                     FROM detalle_ventas d_v
                     LEFT JOIN ventas AS v ON d_v.venta_id = v.id_venta
                     LEFT JOIN unidades_medida AS u_m ON d_v.unid_medida_id = u_m.id_unidad
                     LEFT JOIN inv_produccion AS pr ON d_v.inv_prod_id = pr.id_inventario
                     ORDER BY d_v.id_detalle_venta DESC
                    """)
        results = db.execute(query).mappings().all()
        return results
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener todos los detalles de venta: {e}")
        raise Exception("Error de base de datos al obtener los detalles de venta")
    
def update_detalle_venta_by_id(db: Session, id: int, detalle_update: DetalleVentaUpdate):
    try:
        detalle_data = detalle_update.model_dump(exclude_unset=True)
        if not detalle_data:
            return False

     # Obtener los valores actuales del registro para lo que no venga en el request
        actual = db.execute(
                        text("""
                                SELECT cantidad, unid_medida_id, estado_venta FROM detalle_ventas
                                WHERE id_detalle_venta = :detalle_venta_id
                            """), {"detalle_venta_id": id}).mappings().first()
        if not actual:
            raise Exception("Detalle de venta no encontrado")

        # No permitir ninguna modificación si el detalle ya está anulado
        if actual["estado_venta"] == "Anulado":
            raise Exception("No se puede modificar un detalle en estado 'Anulado'")

        if "cantidad" in detalle_data and actual["estado_venta"] in ("Vendido", "Devuelto"):
            raise Exception(f"No se puede modificar la cantidad de una venta en estado '{actual['estado_venta']}'")

        if "cantidad" in detalle_data or "unid_medida_id" in detalle_data:
            cantidad = detalle_data.get("cantidad", actual["cantidad"])
            unid_medida_id = detalle_data.get("unid_medida_id", actual["unid_medida_id"])

         # Obtener el factor de conversión
            conv = db.execute(text("""
                SELECT conversion FROM unidades_medida
                 WHERE id_unidad = :unid_medida_id
                """), {"unid_medida_id": unid_medida_id}).mappings().first()
                
            if not conv:
                raise Exception("Unidad de medida no encontrada")
        
         # Agregar el valor recalculado al dict
            detalle_data["cant_convertida"] = cantidad * float(conv["conversion"])
                        
                     # Construir dinámicamente la sentencia UPDATE
        set_clauses = ", ".join([f"{key} = :{key}" for key in detalle_data.keys()])
        sentencia = text(f"""
             UPDATE detalle_ventas
             SET {set_clauses}
             WHERE id_detalle_venta = :id_detalle_venta
         """)
         # Agregar el id_detalle_venta
        detalle_data["id_detalle_venta"] = id
        result = db.execute(sentencia, detalle_data)
        db.commit()
        return result.rowcount > 0
    
    except SQLAlchemyError as e:
        db.rollback()
        orig = getattr(e, 'orig', None)
        
        # Errores del trigger (SIGNAL SQLSTATE) vienen en orig como (1644, 'mensaje')
        if orig and hasattr(orig, 'args') and len(orig.args) >= 2:
            trigger_msg = orig.args[1]  # El texto limpio del SIGNAL

            if "no hay suficiente stock" in trigger_msg.lower():
                raise HTTPException(status_code=409, detail="No hay suficiente stock para registrar el tratamiento")
            
            if "unidades del tratamiento" in trigger_msg.lower():
                raise HTTPException(status_code=409, detail="Las unidades del tratamiento y del inventario son incompatibles")
            
            if orig.args[0] == 1264 or "out of range" in trigger_msg.lower():
                raise HTTPException(
                    status_code=422,
                    detail="La cantidad ingresada es demasiado grande. Verifique el valor y las unidades."
                )
            # Cualquier otro SIGNAL del trigger, mostrar el mensaje limpio
            raise HTTPException(status_code=409, detail=trigger_msg)
        logger.error(f"Error al actualizar detalle de venta {id}: {e}")
        raise Exception("Error de base de datos al actualizar el detalle de venta")

def change_status_det_venta(db: Session, id_det_venta: int, estado: EstadoVenta) -> Optional[bool]:
    try:
        actual = db.execute(
            text("""
                SELECT estado_venta
                FROM detalle_ventas
                WHERE id_detalle_venta = :id_detalle_venta
            """),
            {"id_detalle_venta": id_det_venta}
        ).mappings().first()

        if not actual:
            raise Exception("Detalle de venta no encontrado")

        estado_actual = actual["estado_venta"]
        estado_nuevo = estado.value

        if estado_actual == "Vendido" and estado_nuevo != "Anulado":
            raise Exception("Una vez vendido solo se puede cambiar a estado 'Anulado'")

        # Si ya está anulado, no permitir cambios de estado
        if estado_actual == "Anulado":
            raise Exception("No se puede modificar un detalle en estado 'Anulado'")

        sentencia = text("""
            UPDATE detalle_ventas
            SET estado_venta = :estado
            WHERE id_detalle_venta = :id_detalle_venta
        """)
        result = db.execute(sentencia, {"estado": estado.value, "id_detalle_venta": id_det_venta})
        db.commit()
        return result.rowcount > 0
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al cambiar estado del detalle de venta {id_det_venta}: {e}")
        raise Exception("Error de base de datos al cambiar el estado del detalle de venta")

def get_detalles_venta_paginated(db: Session, skip: int = 0, limit: int = 10):
    """
    Obtiene detalles de venta con paginación.
    Compatible con PostgreSQL, MySQL y SQLite.
    """
    try:
        # Total de detalles de venta
        count_query = text("""
            SELECT COUNT(d_v.id_detalle_venta) AS total
            FROM detalle_ventas d_v
        """)     

        total_result = db.execute(count_query).scalar()

        # Detalles de venta paginados
        data_query = text(""" 
                        SELECT  d_v.id_detalle_venta, d_v.cantidad, d_v.unid_medida_id,
                        d_v.precio_venta, d_v.inv_prod_id, d_v.venta_id, d_v.estado_venta, d_v.cant_convertida, 
                        v.nombre_comprador, u_m.simbolo, pr.nombre_producto
                        FROM detalle_ventas AS d_v
                        LEFT JOIN inv_produccion AS pr ON d_v.inv_prod_id = pr.id_inventario
                        LEFT JOIN ventas AS v ON d_v.venta_id = v.id_venta
                        LEFT JOIN unidades_medida AS u_m ON d_v.unid_medida_id = u_m.id_unidad
                        LIMIT :limit OFFSET :skip
                    """)

        perdidas_list = db.execute(
            data_query,
            {
                "limit": limit,
                "skip": skip
            }
        ).mappings().all()

        return {
            "total": total_result or 0,
            "detalles": perdidas_list
        }

    except SQLAlchemyError as e:
        logger.error( f"Error al obtener los detalles de venta: {e}", exc_info=True)
        raise Exception("Error de base de datos al obtener los detalles de venta")

def delete_detalle_venta_by_id(db: Session, id: int):
    try:
        result = db.execute(
            text("DELETE FROM detalle_ventas WHERE id_detalle_venta = :id"),
            {"id": id}
        )
        db.commit()
        return result.rowcount > 0
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al eliminar detalle de venta {id}: {e}")
        raise Exception("Error de base de datos al eliminar el detalle de venta")