from sqlalchemy.orm import Session # type: ignore
from sqlalchemy import text # type: ignore
from sqlalchemy.exc import SQLAlchemyError # type: ignore
from typing import Optional
from app.schemas.detalle_venta import DetalleVentaCreate, DetalleVentaUpdate, DetalleVentaOut, EstadoVenta
import logging

logger = logging.getLogger(__name__)

def create_detalle_venta(db: Session, detalle: DetalleVentaCreate) -> Optional[bool]:
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
        
        factor_conversion = result_conv["conversion"]

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
        params["cant_convertida"] = params["cantidad"] * factor_conversion
        logger.info(f"params a insertar: {params}")
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
            or "no hay suficiente stock" in mensaje_completo
            or "no se puede crear el detalle de venta" in mensaje_completo
        ):
            raise Exception(f"Error: No hay suficiente stock para realizar esta venta o apartado")
        raise Exception("Error de base de datos al crear el detalle de venta")
    
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
            detalle_data["cant_convertida"] = cantidad * conv["conversion"]
   
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
        logger.error(f"Error al actualizar detalle de venta {id}: {e}")
        raise Exception("Error de base de datos al actualizar el detalle de venta")

def change_status_det_venta(db: Session, id_det_venta: int, estado: EstadoVenta) -> Optional[bool]:
    try:
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