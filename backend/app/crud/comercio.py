from fastapi import HTTPException
from datetime import date
from sqlalchemy.orm import Session # type: ignore
from sqlalchemy import text # type: ignore
from sqlalchemy.exc import SQLAlchemyError # type: ignore
from typing import Optional
from app.schemas.comercio import (ComercializacionCreate, ComercializacionUpdate, ComercializacionOut)
import logging

logger = logging.getLogger(__name__)

def create_comercializacion(db: Session, comercializacion: ComercializacionCreate, user_id: int):
	try:
		query_conversion = text("""
			SELECT conversion
			FROM unidades_medida
			WHERE id_unidad = :unid_medida_id
		""")

		result_conv = db.execute(
			query_conversion,
			{"unid_medida_id": comercializacion.unid_medida_id}
		).mappings().first()

		if not result_conv:
			raise Exception("Unidad de medida no encontrada")

		stock_actual = db.execute(
			text("""
				SELECT cantidad
				FROM inv_produccion
				WHERE id_inventario = :producto_id
				FOR UPDATE
			"""),
			{"producto_id": comercializacion.producto_id}
		).mappings().first()

		if not stock_actual:
			raise HTTPException(status_code=404, detail="Inventario de producción no encontrado")

		params = comercializacion.model_dump()
		params["cant_convertida"] = float(params["cantidad"]) * float(result_conv["conversion"])
		params["user_id"] = user_id

		if float(stock_actual["cantidad"] or 0) < float(params["cant_convertida"] or 0):
			raise HTTPException(status_code=409, detail="No hay suficiente stock de producción para registrar la comercialización")

		db.execute(
			text("""
				UPDATE inv_produccion
				SET cantidad = cantidad - :cant_convertida
				WHERE id_inventario = :producto_id
			"""),
			{
				"cant_convertida": params["cant_convertida"],
				"producto_id": comercializacion.producto_id,
			}
		)

		query = text("""
			INSERT INTO comercializacion (
				producto_id, lote_id, fecha_comercializacion, cantidad,
				unid_medida_id, lugar_comercializacion, observacion,
				user_id, vendio_todo, cant_no_vendida, cant_convertida
			) VALUES (
				:producto_id, :lote_id, :fecha_comercializacion, :cantidad,
				:unid_medida_id, :lugar_comercializacion, :observacion,
				:user_id, :vendio_todo, :cant_no_vendida, :cant_convertida
			)
		""")

		result = db.execute(query, params)
		db.commit()
		return result.lastrowid
	except HTTPException:
		db.rollback()
		raise
	except SQLAlchemyError as e:
		db.rollback()
		logger.error(f"Error al crear comercialización: {e}")
		raise Exception("Error de base de datos al crear la comercialización")

def registrar_vencidos_como_perdidas(db: Session):
    try:
        vencidos = db.execute(text("""
            SELECT c.producto_id, 
					CASE 
        				WHEN c.cantidad > 0 THEN c.cantidad
        				ELSE c.cant_no_vendida
    				END AS cantidad, 
					ip.fecha_vencimiento, ip.unid_medida_id, ip.nombre_producto,
				    ip.valor_unitario
            FROM comercializacion c
            LEFT JOIN inv_produccion ip ON c.producto_id = ip.id_inventario
            WHERE ip.fecha_vencimiento < CURDATE()
            AND c.cantidad > 0
            AND c.producto_id NOT IN (
                SELECT inv_prod_id FROM inv_perdidas
                WHERE motivo = 'vencimiento'
                AND origen = 'comercializacion'
            )
        """)).mappings().all()

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
                "inv_prod_id": row["producto_id"],
                "cantidad": row["cantidad"],
                "origen": "comercializacion",
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


def get_comercializacion_by_id(db: Session, id: int) -> Optional[ComercializacionOut]:
	try:
		query = text("""
			SELECT c.id_comercializacion, c.producto_id, c.lote_id, c.fecha_comercializacion,
				   c.cantidad, c.unid_medida_id, c.lugar_comercializacion, p.fecha_vencimiento,
				   c.observacion, c.user_id, c.vendio_todo, c.cant_no_vendida,
				   c.cant_convertida, p.nombre_producto, u.simbolo, us.nombre_user, l_p.sublote
			FROM comercializacion c
			LEFT JOIN inv_produccion p ON c.producto_id = p.id_inventario
			LEFT JOIN lote_produccion l_p ON c.lote_id = l_p.id_lote
			LEFT JOIN unidades_medida u ON c.unid_medida_id = u.id_unidad
			LEFT JOIN users us ON c.user_id = us.id_user
			WHERE c.id_comercializacion = :id
		""")
		result = db.execute(query, {"id": id}).mappings().first()

		if not result:
			return None

		return ComercializacionOut.model_validate(dict(result))
	except SQLAlchemyError as e:
		logger.error(f"Error al obtener comercialización por id: {e}")
		raise Exception("Error de base de datos al obtener la comercialización")


def get_all_comercializaciones(db: Session):
	try:
		query = text("""
			SELECT c.id_comercializacion, c.producto_id, c.lote_id, c.fecha_comercializacion,
				   c.cantidad, c.unid_medida_id, c.lugar_comercializacion, p.fecha_vencimiento,
				   c.observacion, c.user_id, c.vendio_todo, c.cant_no_vendida,
				   c.cant_convertida, p.nombre_producto, u.simbolo, us.nombre_user, l_p.sublote
			FROM comercializacion c
			LEFT JOIN inv_produccion p ON c.producto_id = p.id_inventario
			LEFT JOIN lote_produccion l_p ON c.lote_id = l_p.id_lote
			LEFT JOIN unidades_medida u ON c.unid_medida_id = u.id_unidad
			LEFT JOIN users us ON c.user_id = us.id_user
			ORDER BY c.id_comercializacion DESC
		""")
		result = db.execute(query).mappings().all()
		return result
	except SQLAlchemyError as e:
		logger.error(f"Error al obtener las comercializaciones: {e}")
		raise Exception("Error de base de datos al obtener las comercializaciones")

def get_comercializaciones_disponibles(db: Session):
	"""
	Devuelve solo las comercializaciones que tienen remanente disponible
	para usarse como ingrediente (cant_no_vendida > 0).
	"""
	try:
		query = text("""
			SELECT c.id_comercializacion, c.producto_id, c.lote_id, c.fecha_comercializacion,
				   c.cantidad, c.unid_medida_id, c.lugar_comercializacion, p.fecha_vencimiento,
				   c.observacion, c.user_id, c.vendio_todo, c.cant_no_vendida,
				   c.cant_convertida, p.nombre_producto, u.simbolo, us.nombre_user, l_p.sublote
			FROM comercializacion c
			LEFT JOIN inv_produccion p ON c.producto_id = p.id_inventario
			LEFT JOIN lote_produccion l_p ON c.lote_id = l_p.id_lote
			LEFT JOIN unidades_medida u ON c.unid_medida_id = u.id_unidad
			LEFT JOIN users us ON c.user_id = us.id_user
			WHERE c.cant_no_vendida IS NOT NULL AND c.cant_no_vendida > 0
			ORDER BY c.id_comercializacion DESC
		""")
		result = db.execute(query).mappings().all()
		return result
	except SQLAlchemyError as e:
		logger.error(f"Error al obtener las comercializaciones disponibles: {e}")
		raise Exception("Error de base de datos al obtener las comercializaciones disponibles")

def get_comercializaciones_by_date_range(db: Session, fecha_inicio: str, fecha_fin: str):
    """
    Obtiene las comercializaciones cuya fecha de inicio o fin esté dentro de un rango de fechas.
    Ignora las horas (usa DATE(fecha_hora_init) y DATE(fecha_hora_fin)).
    """
    try:
        query = text("""
                    SELECT c.id_comercializacion, c.producto_id, c.lote_id, c.fecha_comercializacion, c.cantidad, 
                     c.unid_medida_id, c.lugar_comercializacion, p.fecha_vencimiento, c.observacion, c.user_id, c.vendio_todo, c.cant_no_vendida, 
                     p.nombre_producto, u.simbolo, us.nombre_user, l_p.sublote
                     FROM comercializacion AS c
                     LEFT JOIN inv_produccion AS p ON c.producto_id = p.id_inventario
                     LEFT JOIN unidades_medida AS u ON c.unid_medida_id = u.id_unidad
                     LEFT JOIN users AS us ON c.user_id = us.id_user
                     LEFT JOIN lote_produccion AS l_p ON c.lote_id = l_p.id_lote
                     WHERE DATE(c.fecha_comercializacion) BETWEEN :fecha_inicio AND :fecha_fin
                    ORDER BY c.fecha_comercializacion DESC
                """)
        result = db.execute(query, {
            "fecha_inicio": fecha_inicio,
            "fecha_fin": fecha_fin
        }).mappings().all()
        
        return [dict(row) for row in result]

    except SQLAlchemyError as e:
        raise Exception(f"Error al consultar las comercializaciones por rango de fechas: {e}")
                     
def update_comercializacion_by_id(db: Session, id: int, comercializacion: ComercializacionUpdate):
	try:
		comercializacion_data = comercializacion.model_dump(exclude_unset=True)
		if not comercializacion_data:
			raise Exception("No se enviaron campos para actualizar")

		actual = db.execute(
			text("""
				SELECT producto_id, lote_id, cantidad, unid_medida_id, cant_convertida
				FROM comercializacion
				WHERE id_comercializacion = :id_comercializacion
				FOR UPDATE
			"""),
			{"id_comercializacion": id}
		).mappings().first()

		if not actual:
			raise Exception("Comercialización no encontrada")

		cantidad = comercializacion_data.get("cantidad", actual["cantidad"])
		unid_medida_id = comercializacion_data.get("unid_medida_id", actual["unid_medida_id"])
		producto_id = comercializacion_data.get("producto_id", actual["producto_id"])
		cantidad_convertida_original = float(actual["cant_convertida"] or 0)
		cantidad_convertida_nueva = float(actual["cant_convertida"] or 0)

		if "cantidad" in comercializacion_data or "unid_medida_id" in comercializacion_data:
			conv = db.execute(
				text("""
					SELECT conversion
					FROM unidades_medida
					WHERE id_unidad = :unid_medida_id
				"""),
				{"unid_medida_id": unid_medida_id}
			).mappings().first()

			if not conv:
				raise Exception("Unidad de medida no encontrada")

			cantidad_convertida_nueva = float(cantidad) * float(conv["conversion"])

			if producto_id == actual["producto_id"]:
				db.execute(
					text("""
						UPDATE inv_produccion
						SET cantidad = cantidad + :cantidad_devuelta
						WHERE id_inventario = :producto_id
					"""),
					{
						"cantidad_devuelta": cantidad_convertida_original,
						"producto_id": actual["producto_id"],
					}
				)

				stock_producto = db.execute(
					text("""
						SELECT cantidad
						FROM inv_produccion
						WHERE id_inventario = :producto_id
						FOR UPDATE
					"""),
					{"producto_id": producto_id}
				).mappings().first()

				if not stock_producto:
					raise HTTPException(status_code=404, detail="Inventario de producción no encontrado")

				if float(stock_producto["cantidad"] or 0) < cantidad_convertida_nueva:
					raise HTTPException(status_code=409, detail="No hay suficiente stock de producción para actualizar la comercialización")

				db.execute(
					text("""
						UPDATE inv_produccion
						SET cantidad = cantidad - :cantidad_nueva
						WHERE id_inventario = :producto_id
					"""),
					{
						"cantidad_nueva": cantidad_convertida_nueva,
						"producto_id": producto_id,
					}
				)
			else:
				stock_producto = db.execute(
					text("""
						SELECT cantidad
						FROM inv_produccion
						WHERE id_inventario = :producto_id
						FOR UPDATE
					"""),
					{"producto_id": producto_id}
				).mappings().first()

				if not stock_producto:
					raise HTTPException(status_code=404, detail="Inventario de producción no encontrado")

				if float(stock_producto["cantidad"] or 0) < cantidad_convertida_nueva:
					raise HTTPException(status_code=409, detail="No hay suficiente stock de producción para actualizar la comercialización")

				if cantidad_convertida_original > 0:
					db.execute(
						text("""
							UPDATE inv_produccion
							SET cantidad = cantidad + :cantidad_devuelta
							WHERE id_inventario = :producto_id
						"""),
						{
							"cantidad_devuelta": cantidad_convertida_original,
							"producto_id": actual["producto_id"],
						}
					)

				db.execute(
					text("""
						UPDATE inv_produccion
						SET cantidad = cantidad - :cantidad_nueva
						WHERE id_inventario = :producto_id
					"""),
					{
						"cantidad_nueva": cantidad_convertida_nueva,
						"producto_id": producto_id,
					}
				)

			comercializacion_data["cant_convertida"] = cantidad_convertida_nueva

		else:
			comercializacion_data["cant_convertida"] = cantidad_convertida_original

		if producto_id != actual["producto_id"] and "cantidad" not in comercializacion_data and "unid_medida_id" not in comercializacion_data:
			# Si solo cambia el producto, recalcular con la cantidad ya guardada.
			conv = db.execute(
				text("""
					SELECT conversion
					FROM unidades_medida
					WHERE id_unidad = :unid_medida_id
				"""),
				{"unid_medida_id": unid_medida_id}
			).mappings().first()

			if not conv:
				raise Exception("Unidad de medida no encontrada")

			cantidad_convertida_nueva = float(cantidad) * float(conv["conversion"])
			stock_producto = db.execute(
				text("""
					SELECT cantidad
					FROM inv_produccion
					WHERE id_inventario = :producto_id
					FOR UPDATE
				"""),
				{"producto_id": producto_id}
			).mappings().first()

			if not stock_producto:
				raise HTTPException(status_code=404, detail="Inventario de producción no encontrado")

			if float(stock_producto["cantidad"] or 0) < cantidad_convertida_nueva:
				raise HTTPException(status_code=409, detail="No hay suficiente stock de producción para actualizar la comercialización")

			if cantidad_convertida_original > 0:
				db.execute(
					text("""
						UPDATE inv_produccion
						SET cantidad = cantidad + :cantidad_devuelta
						WHERE id_inventario = :producto_id
					"""),
					{
						"cantidad_devuelta": cantidad_convertida_original,
						"producto_id": actual["producto_id"],
					}
				)

			db.execute(
				text("""
					UPDATE inv_produccion
					SET cantidad = cantidad - :cantidad_nueva
					WHERE id_inventario = :producto_id
				"""),
				{
					"cantidad_nueva": cantidad_convertida_nueva,
					"producto_id": producto_id,
				}
			)

			comercializacion_data["cant_convertida"] = cantidad_convertida_nueva

		set_clauses = ", ".join([f"{key} = :{key}" for key in comercializacion_data.keys()])
		query = text(f"""
			UPDATE comercializacion
			SET {set_clauses}
			WHERE id_comercializacion = :id
		""")

		comercializacion_data["id"] = id
		result = db.execute(query, comercializacion_data)
		db.commit()
		return result.rowcount > 0
	except SQLAlchemyError as e:
		db.rollback()
		logger.error(f"Error al actualizar comercialización: {e}")
		raise Exception("Error de base de datos al actualizar la comercialización")
	
def change_vendio_todo_status(db: Session, id: int, vendio_todo: bool):
	try:
		query = text("""
			UPDATE comercializacion
			SET vendio_todo = :vendio_todo
			WHERE id_comercializacion = :id
		""")
		result = db.execute(query, {"vendio_todo": vendio_todo, "id": id})
		db.commit()
		return result.rowcount > 0
	except SQLAlchemyError as e:
		db.rollback()
		logger.error(f"Error al cambiar el estado de vendio_todo: {e}")
		raise Exception("Error de base de datos al cambiar el estado de vendio_todo")

def get_comercializaciones_paginated(db: Session, skip: int = 0, limit: int = 10):
	try:
		count_query = text("""
			SELECT COUNT(c.id_comercializacion) AS total
			FROM comercializacion AS c
		""")

		total_result = db.execute(count_query).scalar()

		data_query = text("""
			SELECT c.id_comercializacion, c.producto_id, c.lote_id, c.fecha_comercializacion,
				   c.cantidad, c.unid_medida_id, c.lugar_comercializacion, p.fecha_vencimiento,
				   c.observacion, c.user_id, c.vendio_todo, c.cant_no_vendida,
				   c.cant_convertida, p.nombre_producto, u.simbolo, us.nombre_user, l_p.sublote
			FROM comercializacion AS c
			LEFT JOIN inv_produccion AS p ON c.producto_id = p.id_inventario
			LEFT JOIN unidades_medida AS u ON c.unid_medida_id = u.id_unidad
			LEFT JOIN users AS us ON c.user_id = us.id_user
			LEFT JOIN lote_produccion AS l_p ON c.lote_id = l_p.id_lote
			ORDER BY c.id_comercializacion DESC
			LIMIT :limit OFFSET :skip
		""")

		comercializaciones_list = db.execute(
			data_query,
			{
				"limit": limit,
				"skip": skip,
			}
		).mappings().all()

		return {
			"total": total_result or 0,
			"comercializaciones": comercializaciones_list,
		}
	except SQLAlchemyError as e:
		logger.error(f"Error al obtener las comercializaciones: {e}", exc_info=True)
		raise Exception("Error de base de datos al obtener las comercializaciones")
