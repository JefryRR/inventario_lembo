from sqlalchemy.orm import Session # type: ignore
from sqlalchemy import text # type: ignore
from sqlalchemy.exc import SQLAlchemyError # type: ignore
from datetime import date
from app.schemas.ingredientes import IngredienteCreate, IngredienteUpdate
import logging

logger = logging.getLogger(__name__)

def create_ingrediente(db: Session, ingredientes: IngredienteCreate):
    try:

        query = text("""INSERT INTO ingredientes_plato 
                        (plato_id, origen_inv, inventario_id, cant_inv, cant_conv_inv, unid_med_id
                        ) VALUES (
                        :plato_id, :origen_inv, :inventario_id, :cant_inv, :cant_conv_inv, :unid_med_id
                        )
                    """)
        
        conv_prod = db.execute(text("""
            SELECT conversion FROM unidades_medida
            WHERE id_unidad = :unid_medida_id
        """), {"unid_medida_id": ingredientes.unid_med_id}).scalar()

        if not conv_prod:
            raise Exception("Unidad de medida no encontrada")
        
        conv_inv = db.execute(text("""
            SELECT conversion FROM unidades_medida
            WHERE id_unidad = :unid_medida_id
        """), {"unid_medida_id": ingredientes.unid_med_id}).scalar()

        if not conv_inv:
            raise Exception("Unidad de medida no encontrada")
        
        params = ingredientes.model_dump()
        params["cant_conv_inv"] = ingredientes.cant_inv * float(conv_inv)
       
        db.execute(query, params)
        db.commit()
        return True
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al crear el ingrediente: {e}")
        raise Exception("Error de base de datos al crear el ingrediente")

def get_ingrediente_by_id(db: Session, id: int):
    try:
        query = text("""SELECT i.id_ingrediente, i.plato_id, i.origen_inv, i.inventario_id, i.cant_inv, i.cant_conv_inv, i.unid_med_id,
                     p.nombre AS nombre_plato, pr.nombre AS nombre_producto, u.simbolo AS simbolo
                     FROM ingredientes_plato as i
                     LEFT JOIN platos as p ON i.plato_id = p.id_plato
                     LEFT JOIN inv_produccion as pr ON i.inventario_id = pr.id_producto
                     LEFT JOIN unidades_medida as u ON i.unid_med_id = u.id_unidad
                     WHERE i.id_ingrediente = :id
                """)
        result = db.execute(query, {"id": id}).mappings().first()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener ingrediente por ID: {e}")
        raise Exception("Error de base de datos al obtener el ingrediente")

def update_ingrediente_by_id(db: Session, ingrediente_id: int, ingrediente: IngredienteUpdate):
    try:
        ingrediente_data = ingrediente.model_dump(exclude_unset=True)
        if not ingrediente_data:
            return False
        set_clauses = ", ".join([f"{key} = :{key}" for key in ingrediente_data.keys()])
        query = text(f"""
            UPDATE ingredientes_plato
            SET {set_clauses}
            WHERE id_ingrediente = :id_ingrediente
        """)
        
        ingrediente_data["id_ingrediente"] = ingrediente_id
        result = db.execute(query, ingrediente_data)
        db.commit()
        return result.rowcount > 0
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al actualizar el ingrediente {ingrediente_id}: {e}")
        raise Exception("Error de base de datos al actualizar el ingrediente")

# def get_ingredientes_by_date_range(db: Session, fecha_inicio: str, fecha_fin: str):
#     """
#     Obtiene los ingredientes cuya fecha de inicio o fin esté dentro de un rango de fechas.
#     Ignora las horas (usa DATE(fecha_hora_init) y DATE(fecha_hora_fin)).
#     """
#     try:
#         query = text("""
#                     SELECT id_ingrediente, plato_id, origen_inv, inventario_id, cant_inv, cant_conv_inv, unid_med_id
#                     FROM ingredientes_plato
#                     WHERE DATE(fecha_registro) BETWEEN :fecha_inicio AND :fecha_fin
#                     ORDER BY fecha_registro DESC
#                 """)
#         result = db.execute(query, {
#             "fecha_inicio": fecha_inicio,
#             "fecha_fin": fecha_fin
#         }).mappings().all()
        
#         return [dict(row) for row in result]

#     except SQLAlchemyError as e:
#         raise Exception(f"Error al consultar los ingredientes por rango de fechas: {e}")

def all_ingredientes(db: Session):
    try:
        query = text("""SELECT i.id_ingrediente, i.plato_id, i.origen_inv, i.inventario_id, i.cant_inv, i.cant_conv_inv, i.unid_med_id,
                        p.nombre AS nombre_plato, pr.nombre AS nombre_producto, u.simbolo AS simbolo
                        FROM ingredientes_plato as i
                        LEFT JOIN platos as p ON i.plato_id = p.id_plato
                        LEFT JOIN inv_produccion as pr ON i.inventario_id = pr.id_producto
                        LEFT JOIN unidades_medida as u ON i.unid_med_id = u.id_unidad
                    """)
        result = db.execute(query).mappings().all()
        return result
    
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener todas las producciones: {e}")
        raise Exception("Error de base de datos al obtener todas las producciones")

def get_ingredientes_paginated(db: Session, skip: int = 0, limit: int = 10):

    """
    Obtiene inventario de producción con paginación.
    Compatible con PostgreSQL, MySQL y SQLite.
    """
    try:
        # Total de producción
        count_query = text("""
            SELECT COUNT(id_ingrediente) AS total
            FROM ingredientes_plato
        """)

        total_result = db.execute(count_query).scalar()

        # Producción paginada
        data_query = text(""" 
                            SELECT i.id_ingrediente, i.plato_id, i.origen_inv, i.inventario_id, i.cant_inv, i.cant_conv_inv, i.unid_med_id,
                            p.nombre AS nombre_plato, pr.nombre AS nombre_producto, u.simbolo AS simbolo
                            FROM ingredientes_plato as i
                            LEFT JOIN platos as p ON i.plato_id = p.id_plato
                            LEFT JOIN inv_produccion as pr ON i.inventario_id = pr.id_producto
                            LEFT JOIN unidades_medida as u ON i.unid_med_id = u.id_unidad
                            LIMIT :limit OFFSET :skip
                        """)
            
        platos_list = db.execute(
            data_query,
            {
                "limit": limit,
                "skip": skip
            }
        ).mappings().all()

        return {
            "total": total_result or 0,
            "ingredientes": platos_list
        }

    except SQLAlchemyError as e:
        logger.error(f"Error al obtener los ingredientes: {e}", exc_info=True)
        raise Exception("Error de base de datos al obtener los ingredientes")
    