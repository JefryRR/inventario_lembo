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
                        (plato_id, origen_inv, inventario_id, cant_inv, cant_conv_inv, unid_med_id, fecha_registro
                        ) VALUES (
                        :plato_id, :origen_inv, :inventario_id, :cant_inv, :cant_conv_inv, :unid_med_id, :fecha_registro
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
        query = text("""
            SELECT 
                ip.id_ingrediente, 
                ip.plato_id, 
                ip.origen_inv, 
                ip.inventario_id, 
                ip.cant_inv, 
                ip.unid_med_id, 
                ip.fecha_registro, 
                p.nombre_plato, 
                um.simbolo,
                -- COALESCE toma el primer valor que NO sea null. 
                -- Si no encuentra el producto ni el insumo, pondrá 'Producto no encontrado'
                COALESCE(pr.nombre_producto, ins.nombre_producto, 'Producto no encontrado') AS nombre_producto
            FROM ingredientes_plato AS ip
            LEFT JOIN platos AS p ON ip.plato_id = p.id_plato
            LEFT JOIN inv_produccion AS pr ON ip.origen_inv = 1 AND ip.inventario_id = pr.id_inventario
            LEFT JOIN inv_insumos AS ins ON ip.origen_inv = 2 AND ip.inventario_id = ins.id_insumo
            LEFT JOIN unidades_medida AS um ON ip.unid_med_id = um.id_unidad
            WHERE ip.id_ingrediente = :id
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
        
        # 1. Verificar si se está intentando actualizar la cantidad o la unidad de medida
        if "cant_inv" in ingrediente_data or "unid_med_id" in ingrediente_data:
            
            # Necesitamos ambos valores para el cálculo. Si uno no viene en el update, lo buscamos de la BD actual
            cant_inv = ingrediente_data.get("cant_inv")
            unid_med_id = ingrediente_data.get("unid_med_id")

            if cant_inv is None or unid_med_id is None:
                # Buscamos el registro actual para rellenar el dato faltante
                ingrediente_actual = db.execute(
                    text("SELECT cant_inv, unid_med_id FROM ingredientes_plato WHERE id_ingrediente = :id"),
                    {"id": ingrediente_id}
                ).fetchone()
                
                if not ingrediente_actual:
                    return False # El ingrediente no existe
                
                if cant_inv is None:
                    cant_inv = ingrediente_actual.cant_inv
                    
                if unid_med_id is None:
                    unid_med_id = ingrediente_actual.unid_med_id

            # 2. Buscar la conversión correspondiente
            conv_inv = db.execute(text("""
                SELECT conversion FROM unidades_medida
                WHERE id_unidad = :unid_medida_id
            """), {"unid_medida_id": unid_med_id}).scalar()

            if not conv_inv:
                raise Exception("Unidad de medida no encontrada")

            # 3. Calcular la nueva cantidad convertida e inyectarla en los datos a actualizar
            ingrediente_data["cant_conv_inv"] = float(cant_inv) * float(conv_inv)

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

def get_ingredientes_by_date_range(db: Session, fecha_inicio: str, fecha_fin: str):
    """
    Obtiene los ingredientes cuya fecha de inicio o fin esté dentro de un rango de fechas.
    Ignora las horas (usa DATE(fecha_hora_init) y DATE(fecha_hora_fin)).
    """
    try:
        query = text("""
                    SELECT 
                        ip.id_ingrediente, 
                        ip.plato_id, 
                        ip.origen_inv, 
                        ip.inventario_id, 
                        ip.cant_inv, 
                        ip.unid_med_id, 
                        ip.fecha_registro, 
                        p.nombre_plato, 
                        um.simbolo,
                        -- COALESCE toma el primer valor que NO sea null. 
                        -- Si no encuentra el producto ni el insumo, pondrá 'Producto no encontrado'
                        COALESCE(pr.nombre_producto, ins.nombre_producto, 'Producto no encontrado') AS nombre_producto
                    FROM ingredientes_plato AS ip
                    LEFT JOIN platos AS p ON ip.plato_id = p.id_plato
                    LEFT JOIN inv_produccion AS pr ON ip.origen_inv = 1 AND ip.inventario_id = pr.id_inventario
                    LEFT JOIN inv_insumos AS ins ON ip.origen_inv = 2 AND ip.inventario_id = ins.id_insumo
                    LEFT JOIN unidades_medida AS um ON ip.unid_med_id = um.id_unidad
                    WHERE DATE(ip.fecha_registro) BETWEEN :fecha_inicio AND :fecha_fin
                    ORDER BY ip.fecha_registro DESC
                """)
        result = db.execute(query, {
            "fecha_inicio": fecha_inicio,
            "fecha_fin": fecha_fin
        }).mappings().all()
        
        return [dict(row) for row in result]

    except SQLAlchemyError as e:
        raise Exception(f"Error al consultar los ingredientes por rango de fechas: {e}")

def all_ingredientes(db: Session):
    try:
        query = text("""SELECT 
                        ip.id_ingrediente, 
                        ip.plato_id, 
                        ip.origen_inv, 
                        ip.inventario_id, 
                        ip.cant_inv, 
                        ip.unid_med_id, 
                        ip.fecha_registro, 
                        p.nombre_plato, 
                        um.simbolo,
                        -- COALESCE toma el primer valor que NO sea null. 
                        -- Si no encuentra el producto ni el insumo, pondrá 'Producto no encontrado'
                        COALESCE(pr.nombre_producto, ins.nombre_producto, 'Producto no encontrado') AS nombre_producto
                    FROM ingredientes_plato AS ip
                    LEFT JOIN platos AS p ON ip.plato_id = p.id_plato
                    LEFT JOIN inv_produccion AS pr ON ip.origen_inv = 1 AND ip.inventario_id = pr.id_inventario
                    LEFT JOIN inv_insumos AS ins ON ip.origen_inv = 2 AND ip.inventario_id = ins.id_insumo
                    LEFT JOIN unidades_medida AS um ON ip.unid_med_id = um.id_unidad
                    """)
        result = db.execute(query).mappings().all()
        return result
    
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener todas las producciones: {e}")
        raise Exception("Error de base de datos al obtener todas las producciones")

def get_ingredientes_paginated(db: Session, skip: int = 0, limit: int = 10):

    """
    Obtiene ingredientes con paginación.
    Compatible con PostgreSQL, MySQL y SQLite.
    """
    try:
        # Total de ingredientes
        count_query = text("""
            SELECT COUNT(id_ingrediente) AS total
            FROM ingredientes_plato
        """)

        total_result = db.execute(count_query).scalar()

        # Ingredientes paginados
        data_query = text(""" 
                            SELECT 
                                ip.id_ingrediente, 
                                ip.plato_id, 
                                ip.origen_inv, 
                                ip.inventario_id, 
                                ip.cant_inv, 
                                ip.unid_med_id, 
                                ip.fecha_registro, 
                                p.nombre_plato, 
                                um.simbolo,
                                -- COALESCE toma el primer valor que NO sea null. 
                                -- Si no encuentra el producto ni el insumo, pondrá 'Producto no encontrado'
                                COALESCE(pr.nombre_producto, ins.nombre_producto, 'Producto no encontrado') AS nombre_producto
                            FROM ingredientes_plato AS ip
                            LEFT JOIN platos AS p ON ip.plato_id = p.id_plato
                            LEFT JOIN inv_produccion AS pr ON ip.origen_inv = 1 AND ip.inventario_id = pr.id_inventario
                            LEFT JOIN inv_insumos AS ins ON ip.origen_inv = 2 AND ip.inventario_id = ins.id_insumo
                            LEFT JOIN unidades_medida AS um ON ip.unid_med_id = um.id_unidad
                            LIMIT :limit OFFSET :skip
                        """)
            
        ingredientes_list = db.execute(
        data_query,
        {
            "limit": limit,
            "skip": skip
        }
        ).mappings().all()

        return {
            "total": total_result or 0,
            "ingredientes": ingredientes_list
        }

    except SQLAlchemyError as e:
        logger.error(f"Error al obtener los ingredientes: {e}", exc_info=True)
        raise Exception("Error de base de datos al obtener los ingredientes")
    