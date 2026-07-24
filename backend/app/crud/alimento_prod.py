from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from typing import Optional
import logging
from app.schemas.alimento_prod import AlimentoCreate, AlimentoUpdate

logger = logging.getLogger(__name__)

# Función para crear un nuevo alimento
def create_alimento(db: Session, alimento: AlimentoCreate) -> Optional[bool]:
    try:
        query_conversion = text("""
            SELECT conversion
            FROM unidades_medida
            WHERE id_unidad = :unid_medida_id
        """)
        
        result_conv = db.execute(
            query_conversion, 
            {"unid_medida_id": alimento.unid_medida_id}
        ).mappings().first()

        if not result_conv:
            logger.error("Unidad de medida no encontrada")
            raise Exception("Unidad de medida no encontrada")
        query = text("""
          INSERT INTO alimento_produccion (
              lote_id, insumo_id, fecha_alimento, cantidad, unid_medida_id
          ) VALUES (
              :lote_id, :insumo_id, :fecha_alimento, :cantidad, :unid_medida_id
          )
      """)
        # Agregar el campo cant_convertida calculado
        params = alimento.model_dump()
        params["cant_convertida"] = params["cantidad"] * float(result_conv["conversion"])
        db.execute(query, params)
        db.commit()
        return True
    except SQLAlchemyError as e:
        db.rollback()
        orig = getattr(e, 'orig', None)
        
        # Errores del trigger (SIGNAL SQLSTATE) vienen en orig como (1644, 'mensaje')
        if orig and hasattr(orig, 'args') and len(orig.args) >= 2:
            trigger_msg = orig.args[1]  # El texto limpio del SIGNAL

            # Manejo de errores específicos según el mensaje del trigger
            if "no hay suficiente stock" in trigger_msg.lower():
                raise HTTPException(status_code=409, detail="No hay suficiente stock para registrar esta producción")

            if "incompatibles" in trigger_msg.lower():
                raise HTTPException(status_code=409, detail="La unidad del alimento y la del inventario son incompatibles")

            if "no se encontró el insumo" in trigger_msg.lower():
                raise HTTPException(status_code=404, detail="No se encontró el insumo o la unidad en el inventario")

            if orig.args[0] == 1264 or "out of range" in trigger_msg.lower():
                raise HTTPException(
                    status_code=422,
                    detail="La cantidad ingresada es demasiado grande. Verifique el valor y las unidades."
                    )
        logger.error(f"Error al crear alimento: {e}")
        raise HTTPException(status_code=500, detail="Error de base de datos al crear el registro de alimento")

# Función para obtener todos los alimentos
def get_all_alimentos(db: Session):
    try:
        query = text("""
                     SELECT a_p.id_alimento, a_p.lote_id, a_p.insumo_id, a_p.fecha_alimento, a_p.cantidad, a_p.unid_medida_id,
                     e.nombre_especie, c.nombre_categoria, u_m.simbolo, in_ins.nombre_producto, l_g.nombre_lote
                     FROM alimento_produccion AS a_p
                     INNER JOIN lote_produccion AS l_p ON a_p.lote_id = l_p.id_lote
                     LEFT JOIN especies AS e ON l_p.especie_id = e.id_especie
                     LEFT JOIN categorias AS c ON l_p.categoria_id = c.id_categoria
                     LEFT JOIN lotes_granja AS l_g ON l_p.lote_granj_id = l_g.id_lote_g
                     LEFT JOIN inv_insumos AS in_ins ON a_p.insumo_id = in_ins.id_insumo
                     LEFT JOIN unidades_medida AS u_m ON a_p.unid_medida_id = u_m.id_unidad
                     ORDER BY a_p.id_alimento DESC
                     """)
        result = db.execute(query).mappings().all()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener alimentos: {e}")
        raise Exception("Error de base de datos al obtener los registros de alimentos")

#Función para obtener un alimento por su ID
def get_alimento_by_id(db: Session, id: int):
    try:
        query = text("""
                     SELECT a_p.id_alimento, a_p.lote_id, a_p.insumo_id, a_p.fecha_alimento, a_p.cantidad, a_p.unid_medida_id,
                     e.nombre_especie, c.nombre_categoria, u_m.simbolo, in_ins.nombre_producto, l_g.nombre_lote
                     FROM alimento_produccion AS a_p
                     INNER JOIN lote_produccion AS l_p ON a_p.lote_id = l_p.id_lote
                     LEFT JOIN especies AS e ON l_p.especie_id = e.id_especie
                     LEFT JOIN categorias AS c ON l_p.categoria_id = c.id_categoria
                     LEFT JOIN lotes_granja AS l_g ON l_p.lote_granj_id = l_g.id_lote_g
                     LEFT JOIN inv_insumos AS in_ins ON a_p.insumo_id = in_ins.id_insumo
                     LEFT JOIN unidades_medida AS u_m ON a_p.unid_medida_id = u_m.id_unidad
                    WHERE a_p.id_alimento = :id
                    """)
        
        result = db.execute(query, {"id": id}).mappings().first()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener alimento por id: {e}")
        raise Exception("Error de base de datos al obtener el alimento por id")

#Función para actualizar un alimento por su ID
def update_alimento_by_id(db: Session, id_alimento: int, alimento: AlimentoUpdate) -> Optional[bool]:
    try:
        # Obtener el factor de conversión
        conv = db.execute(text("""
            SELECT conversion FROM unidades_medida
            WHERE id_unidad = :unid_medida_id
            """), {"unid_medida_id": alimento.unid_medida_id}).mappings().first()
                
        if not conv:
            raise Exception("Unidad de medida no encontrada")
        # Solo los campos enviados por el cliente
        alimento_data = alimento.model_dump(exclude_unset=True)

        if not alimento_data:
            return False  # nada que actualizar

        # cant_convertida solo se calcula aquí si el cliente envió 'cantidad';
        # de lo contrario el trigger BEFORE UPDATE la recalcula usando OLD.cantidad
        if "cantidad" in alimento_data:
            alimento_data["cant_convertida"] = alimento_data["cantidad"] * float(conv["conversion"])
        # Construir dinámicamente la sentencia UPDATE
        set_clauses = ", ".join([f"{key} = :{key}" for key in alimento_data.keys()])
        sentencia = text(f"""
             UPDATE alimento_produccion
             SET {set_clauses}
             WHERE id_alimento = :id_alimento
         """)
         # Agregar el id_lote
        alimento_data["id_alimento"] = id_alimento
        result = db.execute(sentencia, alimento_data)
        db.commit()
        return result.rowcount > 0
    except SQLAlchemyError as e:
            db.rollback()
            orig = getattr(e, 'orig', None)
        
            # Errores del trigger (SIGNAL SQLSTATE) vienen en orig como (1644, 'mensaje')
            if orig and hasattr(orig, 'args') and len(orig.args) >= 2:
                trigger_msg = orig.args[1]  # El texto limpio del SIGNAL

                if "no hay suficiente stock" in trigger_msg.lower():
                    raise HTTPException(status_code=409, detail="No hay suficiente stock para actualizar esta producción")

                if "incompatibles" in trigger_msg.lower():
                    raise HTTPException(status_code=409, detail="La unidad del alimento y la del inventario son incompatibles")

                if "no se encontró el insumo" in trigger_msg.lower():
                    raise HTTPException(status_code=404, detail="No se encontró el insumo o la unidad en el inventario")

                if orig.args[0] == 1264 or "out of range" in trigger_msg.lower():
                    raise HTTPException(
                        status_code=422,
                        detail="La cantidad ingresada es demasiado grande. Verifique el valor y las unidades."
                        )
            logger.error(f"Error al actualizar alimento {id_alimento}: {e}")
            raise HTTPException(status_code=500, detail="Error de base de datos al actualizar el registro de alimento")

# Función para obtener todos los alimentos con paginación y búsqueda
def get_all_alimentos_pag(db: Session, skip: int = 0, limit: int = 10, search: Optional[str] = None):
    """
    Obtiene los registros de alimentos con paginación.
    Compatible con PostgreSQL, MySQL y SQLite.
    """
    try:
        where_clause = ""
        params = {"limit": limit, "skip": skip}
        
        if search:
            where_clause = "WHERE LOWER(in_ins.nombre_producto) LIKE LOWER(:search) OR LOWER(l_g.nombre_lote) LIKE LOWER(:search)"
            params["search"] = f"%{search}%"

        # Total de alimentos
        count_query = text(f"""
            SELECT COUNT(a_p.id_alimento) AS total
            FROM alimento_produccion AS a_p
            INNER JOIN lote_produccion AS l_p ON a_p.lote_id = l_p.id_lote
            LEFT JOIN especies AS e ON l_p.especie_id = e.id_especie
            LEFT JOIN categorias AS c ON l_p.categoria_id = c.id_categoria
            LEFT JOIN lotes_granja AS l_g ON l_p.lote_granj_id = l_g.id_lote_g
            LEFT JOIN inv_insumos AS in_ins ON a_p.insumo_id = in_ins.id_insumo
            LEFT JOIN unidades_medida AS u_m ON a_p.unid_medida_id = u_m.id_unidad
            {where_clause}
        """)

        total_result = db.execute(count_query, params).scalar()

        # Registros paginados
        data_query = text(f""" 
                        SELECT a_p.id_alimento, a_p.lote_id, a_p.insumo_id, a_p.fecha_alimento, a_p.cantidad, a_p.unid_medida_id,
                        e.nombre_especie, c.nombre_categoria, u_m.simbolo, in_ins.nombre_producto, l_g.nombre_lote
                        FROM alimento_produccion AS a_p
                        INNER JOIN lote_produccion AS l_p ON a_p.lote_id = l_p.id_lote
                        LEFT JOIN especies AS e ON l_p.especie_id = e.id_especie
                        LEFT JOIN categorias AS c ON l_p.categoria_id = c.id_categoria
                        LEFT JOIN lotes_granja AS l_g ON l_p.lote_granj_id = l_g.id_lote_g
                        LEFT JOIN inv_insumos AS in_ins ON a_p.insumo_id = in_ins.id_insumo
                        LEFT JOIN unidades_medida AS u_m ON a_p.unid_medida_id = u_m.id_unidad
                        {where_clause}
                        ORDER BY a_p.id_alimento DESC
                        LIMIT :limit OFFSET :skip
                    """)

        alimento_prod_list = db.execute( data_query, params).mappings().all()

        return {
            "total": total_result or 0,
            "alimentos": alimento_prod_list
        }

    except SQLAlchemyError as e:
        logger.error( f"Error al obtener los registros de alimentos: {e}", exc_info=True)

        raise Exception(
            "Error de base de datos al obtener los registros de alimentos"
        )