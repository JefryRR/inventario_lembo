from sqlalchemy.orm import Session 
from sqlalchemy import text 
from sqlalchemy.exc import SQLAlchemyError 
from fastapi import HTTPException
from app.schemas.ingredientes import IngredienteCreate, IngredienteUpdate
import logging
from typing import Optional

logger = logging.getLogger(__name__)

#Crear un ingrediente
def create_ingrediente(db: Session, ingredientes: IngredienteCreate):
    try:

        query = text("""INSERT INTO ingredientes_plato 
                        (plato_id, origen_inv, inventario_id, cant_inv, cant_conv_inv, unid_med_id, fecha_registro
                        ) VALUES (
                        :plato_id, :origen_inv, :inventario_id, :cant_inv, :cant_conv_inv, :unid_med_id, :fecha_registro
                        )
                    """)

        # Obtener la conversión de la unidad de medida del producto y del inventario
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
        orig = getattr(e, 'orig', None)
        
        # Errores del trigger (SIGNAL SQLSTATE) vienen en orig como (1644, 'mensaje')
        if orig and hasattr(orig, 'args') and len(orig.args) >= 2:
            trigger_msg = orig.args[1]  # El texto limpio del SIGNAL

            if "no hay suficiente stock" in trigger_msg.lower():
                raise HTTPException(status_code=409, detail="No hay suficiente stock para registrar esta producción")

            if "incompatible" in trigger_msg.lower():
                raise HTTPException(status_code=409, detail="La unidad de medida del ingrediente es incompatible con la del inventario")

            if "no se encontró el inventario" in trigger_msg.lower():
                raise HTTPException(status_code=404, detail="No se encontró el inventario")

            if orig.args[0] == 1644 or "out of range" in trigger_msg.lower():
                raise HTTPException(
                    status_code=422,
                    detail="La cantidad ingresada es demasiado grande. Verifique el valor y las unidades."
                    )
        logger.error(f"Error al crear el ingrediente: {e}")
        raise Exception("Error de base de datos al crear el ingrediente")

# Obtener un ingrediente por su ID
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
                pr.fecha_vencimiento, 
                um.simbolo,
                -- COALESCE toma el primer valor que NO sea null. 
                -- Si no encuentra el producto ni el insumo, pondrá 'Producto no encontrado'
                COALESCE(pr.nombre_producto, ins.nombre_producto, 'Producto no encontrado') AS nombre_producto
            FROM ingredientes_plato AS ip
            LEFT JOIN platos AS p ON ip.plato_id = p.id_plato
            LEFT JOIN inv_produccion AS pr ON ip.origen_inv = 1 AND ip.inventario_id = pr.id_inventario
            LEFT JOIN inv_insumos AS ins ON ip.origen_inv = 2 AND ip.inventario_id = ins.id_insumo
            LEFT JOIN comercializacion AS c ON ip.origen_inv = 3 AND ip.inventario_id = c.id_comercializacion
            LEFT JOIN unidades_medida AS um ON ip.unid_med_id = um.id_unidad
            WHERE ip.id_ingrediente = :id
        """)
        
        result = db.execute(query, {"id": id}).mappings().first()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener ingrediente por ID: {e}")
        raise Exception("Error de base de datos al obtener el ingrediente")

# Actualizar un ingrediente por su ID
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
        orig = getattr(e, 'orig', None)
        
        # Errores del trigger (SIGNAL SQLSTATE) vienen en orig como (1644, 'mensaje')
        if orig and hasattr(orig, 'args') and len(orig.args) >= 2:
            trigger_msg = orig.args[1]  # El texto limpio del SIGNAL

            if "no hay suficiente stock" in trigger_msg.lower():
                raise HTTPException(status_code=409, detail="No hay suficiente stock para registrar esta producción")

            if "incompatible" in trigger_msg.lower():
                raise HTTPException(status_code=409, detail="La unidad de medida del ingrediente es incompatible con la del inventario")

            if "no se encontró el inventario" in trigger_msg.lower():
                raise HTTPException(status_code=404, detail="No se encontró el inventario")

            if orig.args[0] == 1644 or "out of range" in trigger_msg.lower():
                raise HTTPException(
                    status_code=422,
                    detail="La cantidad ingresada es demasiado grande. Verifique el valor y las unidades."
                    )
        logger.error(f"Error al actualizar el ingrediente {ingrediente_id}: {e}")
        raise Exception("Error de base de datos al actualizar el ingrediente")

# Eliminar un ingrediente por su ID
def delete_ingrediente_by_id(db: Session, id: int):
    try:
        # 1. Obtener el ingrediente antes de eliminarlo
        ingrediente = db.execute(
            text("""
                SELECT id_ingrediente, origen_inv, inventario_id, cant_conv_inv
                FROM ingredientes_plato
                WHERE id_ingrediente = :id
            """),
            {"id": id}
        ).fetchone()

        if not ingrediente:
            return False

        # 2. Devolver la cantidad al inventario correspondiente
        if ingrediente.origen_inv == 1:
            # Inventario de producción
            inv = db.execute(
                text("SELECT id_inventario, cantidad FROM inv_produccion WHERE id_inventario = :inv_id"),
                {"inv_id": ingrediente.inventario_id}
            ).fetchone()

            if not inv:
                raise Exception(f"Inventario de producción {ingrediente.inventario_id} no encontrado")

            db.execute(
                text("UPDATE inv_produccion SET cantidad = cantidad + :cant WHERE id_inventario = :inv_id"),
                {"cant": ingrediente.cant_conv_inv, "inv_id": ingrediente.inventario_id}
            )

        elif ingrediente.origen_inv == 2:
            # Inventario de insumos
            inv = db.execute(
                text("SELECT id_insumo, cantidad FROM inv_insumos WHERE id_insumo = :inv_id"),
                {"inv_id": ingrediente.inventario_id}
            ).fetchone()

            if not inv:
                raise Exception(f"Inventario de insumos {ingrediente.inventario_id} no encontrado")

            db.execute(
                text("UPDATE inv_insumos SET cantidad = cantidad + :cant WHERE id_insumo = :inv_id"),
                {"cant": ingrediente.cant_conv_inv, "inv_id": ingrediente.inventario_id}
            )

        elif ingrediente.origen_inv == 3:
            # Comercialización (remanente no vendido)
            inv = db.execute(
                text("SELECT id_comercializacion, cant_no_vendida FROM comercializacion WHERE id_comercializacion = :inv_id"),
                {"inv_id": ingrediente.inventario_id}
            ).fetchone()

            if not inv:
                raise Exception(f"Comercialización {ingrediente.inventario_id} no encontrada")

            db.execute(
                text("""
                    UPDATE comercializacion
                    SET cant_no_vendida = COALESCE(cant_no_vendida, 0) + :cant
                    WHERE id_comercializacion = :inv_id
                """),
                {"cant": ingrediente.cant_conv_inv, "inv_id": ingrediente.inventario_id}
            )

        else:
            raise Exception(f"origen_inv inválido: {ingrediente.origen_inv}")

        # 3. Eliminar el ingrediente
        result = db.execute(
            text("DELETE FROM ingredientes_plato WHERE id_ingrediente = :id"),
            {"id": id}
        )

        # 4. Commit único — todo o nada
        db.commit()
        return result.rowcount > 0

    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al eliminar el ingrediente {id}: {e}")
        raise Exception("Error de base de datos al eliminar el ingrediente")

# Obtener ingredientes por rango de fechas
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
                    LEFT JOIN comercializacion AS c ON ip.origen_inv = 3 AND ip.inventario_id = c.id_comercializacion
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

# Obtener todos los ingredientes
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
                        COALESCE(pr.nombre_producto, ins.nombre_producto, prc.nombre_producto, 'Producto no encontrado') AS nombre_producto
                    FROM ingredientes_plato AS ip
                    LEFT JOIN platos AS p ON ip.plato_id = p.id_plato
                    LEFT JOIN inv_produccion AS pr ON ip.origen_inv = 1 AND ip.inventario_id = pr.id_inventario
                    LEFT JOIN inv_insumos AS ins ON ip.origen_inv = 2 AND ip.inventario_id = ins.id_insumo
                    LEFT JOIN comercializacion AS c ON ip.origen_inv = 3 AND ip.inventario_id = c.id_comercializacion
                    LEFT JOIN inv_produccion AS prc ON c.producto_id = prc.id_inventario
                    LEFT JOIN unidades_medida AS um ON ip.unid_med_id = um.id_unidad
                    ORDER BY ip.fecha_registro DESC
                    """)
        result = db.execute(query).mappings().all()
        return result
    
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener todas las producciones: {e}")
        raise Exception("Error de base de datos al obtener todas los ingredientes")

# Función para obtener ingredientes con paginación
def get_ingredientes_paginated(db: Session, skip: int = 0, limit: int = 10, search: Optional[str] = None):
        """
        Obtiene ingredientes con paginación.
        Compatible con PostgreSQL, MySQL y SQLite.
        """
        try:
            where_clause = ""
            params = {"limit": limit, "skip": skip}

            if search:
                where_clause = """WHERE LOWER(p.nombre_plato) LIKE LOWER(:search) OR LOWER(COALESCE(pr.nombre_producto, ins.nombre_producto, prc.nombre_producto, '')) LIKE LOWER(:search)"""
                params["search"] = f"%{search}%"

            count_query = text(f"""
                SELECT COUNT(id_ingrediente) AS total
                FROM ingredientes_plato AS ip
                LEFT JOIN platos AS p ON ip.plato_id = p.id_plato
                LEFT JOIN inv_produccion AS pr ON ip.origen_inv = 1 AND ip.inventario_id = pr.id_inventario
                LEFT JOIN inv_insumos AS ins ON ip.origen_inv = 2 AND ip.inventario_id = ins.id_insumo
                LEFT JOIN comercializacion AS c ON ip.origen_inv = 3 AND ip.inventario_id = c.id_comercializacion
                LEFT JOIN inv_produccion AS prc ON c.producto_id = prc.id_inventario
                LEFT JOIN unidades_medida AS um ON ip.unid_med_id = um.id_unidad
                {where_clause}
            """)

            total_result = db.execute(count_query, params).scalar()

            data_query = text(f""" 
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
                    COALESCE(pr.nombre_producto, ins.nombre_producto, prc.nombre_producto, 'Producto no encontrado') AS nombre_producto
                FROM ingredientes_plato AS ip
                LEFT JOIN platos AS p ON ip.plato_id = p.id_plato
                LEFT JOIN inv_produccion AS pr ON ip.origen_inv = 1 AND ip.inventario_id = pr.id_inventario
                LEFT JOIN inv_insumos AS ins ON ip.origen_inv = 2 AND ip.inventario_id = ins.id_insumo
                LEFT JOIN comercializacion AS c ON ip.origen_inv = 3 AND ip.inventario_id = c.id_comercializacion
                LEFT JOIN inv_produccion AS prc ON c.producto_id = prc.id_inventario
                LEFT JOIN unidades_medida AS um ON ip.unid_med_id = um.id_unidad
                {where_clause}
                ORDER BY ip.fecha_registro DESC
                LIMIT :limit OFFSET :skip
            """)

            ingredientes_list = db.execute(data_query, params).mappings().all()

            return {
                "total": total_result or 0,
                "ingredientes": ingredientes_list
            }

        except SQLAlchemyError as e:
            logger.error(f"Error al obtener los ingredientes: {e}", exc_info=True)
            raise Exception("Error de base de datos al obtener los ingredientes")

    