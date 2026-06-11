from sqlalchemy.orm import Session   # type: ignore
from sqlalchemy import text  # type: ignore
from sqlalchemy.exc import SQLAlchemyError  # type: ignore
from typing import Optional
import logging
from app.schemas.tratamiento import TratamientoCreate,TratamientoUpdate

logger = logging.getLogger(__name__)

def create_tratamiento(db: Session, tratamiento: TratamientoCreate, user_id: int) -> Optional[bool]:
    try:
        query_conversion = text("""
            SELECT conversion
            FROM unidades_medida
            WHERE id_unidad = :unid_medida_id
        """)
        
        result_conv = db.execute(
            query_conversion, 
            {"unid_medida_id": tratamiento.unid_medida_id}
        ).mappings().first()

        if not result_conv:
            logger.error("Unidad de medida no encontrada")
            raise Exception("Unidad de medida no encontrada")
        
        factor_conversion = result_conv["conversion"]
    
        query = text("""
                     INSERT INTO tratamientos (
                         lote_id, medicina_id, fecha_inicio, fecha_fin, 
                         cantidad, unid_medida_id, observacion, user_id, cant_convertida
                     ) VALUES (
                         :lote_id, :medicina_id, :fecha_inicio, :fecha_fin, 
                         :cantidad, :unid_medida_id, :observacion, :user_id, :cant_convertida
                     )
        """)
        
        params = tratamiento.model_dump()
        params["cant_convertida"] = params["cantidad"] * factor_conversion
        params["user_id"] = user_id
        db.execute(query, params)
        db.commit()
        return True

    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al crear el registro del tratamiento: {e}")
        raise Exception("Error de base de datos al crear el registro del tratamiento")
    
def get_all_tratamientos(db: Session):
    try:
        query = text("""
                     SELECT t_p.id_tratamiento, t_p.lote_id, t_p.medicina_id, t_p.fecha_inicio, t_p.fecha_fin,
                     t_p.cantidad, t_p.unid_medida_id, t_p.observacion, e.nombre_especie, c.nombre_categoria,
                     t_p.cant_convertida, t_p.user_id,
                     in_ins.nombre_producto, l_g.nombre_lote, u_m.simbolo, u.nombre_user
                     FROM tratamientos AS t_p
                     LEFT JOIN lote_produccion AS l_p ON t_p.lote_id = l_p.id_lote
                     LEFT JOIN especies AS e ON l_p.especie_id = e.id_especie
                     LEFT JOIN categorias AS c ON l_p.categoria_id = c.id_categoria
                     LEFT JOIN inv_insumos AS in_ins ON t_p.medicina_id = in_ins.id_insumo
                     LEFT JOIN unidades_medida AS u_m ON t_p.unid_medida_id = u_m.id_unidad
                     LEFT JOIN lotes_granja AS l_g ON t_p.lote_id = l_g.id_lote_g
                     LEFT JOIN users AS u ON t_p.user_id = u.id_user
                     ORDER BY t_p.id_tratamiento DESC
                     """)
        result = db.execute(query).mappings().all()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener tratamientos: {e}")
        raise Exception("Error de base de datos al obtener los registros de tratamientos")

def get_tratamiento_by_id(db: Session, id: int):
    try:
        query = text("""
                     SELECT t_p.id_tratamiento, t_p.lote_id, t_p.medicina_id, t_p.fecha_inicio, t_p.fecha_fin,
                     t_p.cantidad, t_p.unid_medida_id, t_p.observacion, e.nombre_especie, c.nombre_categoria,
                     t_p.cant_convertida, t_p.user_id,
                     in_ins.nombre_producto, l_g.nombre_lote, u_m.simbolo, u.nombre_user
                     FROM tratamientos AS t_p
                     LEFT JOIN lote_produccion AS l_p ON t_p.lote_id = l_p.id_lote
                     LEFT JOIN especies AS e ON l_p.especie_id = e.id_especie
                     LEFT JOIN categorias AS c ON l_p.categoria_id = c.id_categoria
                     LEFT JOIN inv_insumos AS in_ins ON t_p.medicina_id = in_ins.id_insumo
                     LEFT JOIN lotes_granja AS l_g ON t_p.lote_id = l_g.id_lote_g
                     LEFT JOIN unidades_medida AS u_m ON t_p.unid_medida_id = u_m.id_unidad
                     LEFT JOIN users AS u ON t_p.user_id = u.id_user
                    WHERE t_p.id_tratamiento = :id
                    """)
        
        result = db.execute(query, {"id": id}).mappings().first()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener tratamiento por id: {e}")
        raise Exception("Error de base de datos al obtener el tratamiento por id")

def update_tratamiento_by_id(db: Session, id_tratamiento: int, tratamiento: TratamientoUpdate) -> Optional[bool]:
    try:
        tratamiento_data = tratamiento.model_dump(exclude_unset=True)
        if not tratamiento_data:
            return False

        # Si se actualiza cantidad o unidad, recalcular cant_convertida
        if "cantidad" in tratamiento_data or "unid_medida_id" in tratamiento_data:
            
     # Obtener los valores actuales del registro para lo que no venga en el request
            actual = db.execute(text("""
                                    SELECT cantidad, unid_medida_id FROM tratamientos
                                    WHERE id_tratamiento = :id_tratamiento
                                """), {"id_tratamiento": id_tratamiento}).mappings().first()
            if not actual:
                raise Exception("Tratamiento no encontrado")
            cantidad = tratamiento_data.get("cantidad", actual["cantidad"])
            unid_medida_id = tratamiento_data.get("unid_medida_id", actual["unid_medida_id"])

         # Obtener el factor de conversión
            conv = db.execute(text("""
                 SELECT conversion FROM unidades_medida
                 WHERE id_unidad = :unid_medida_id
             """), {"unid_medida_id": unid_medida_id}).mappings().first()
            if not conv:
                raise Exception("Unidad de medida no encontrada")
        
         # Agregar el valor recalculado al dict
            tratamiento_data["cant_convertida"] = cantidad * conv["conversion"]

         # Construir dinámicamente la sentencia UPDATE
        set_clauses = ", ".join([f"{key} = :{key}" for key in tratamiento_data.keys()])
        sentencia = text(f"""
             UPDATE tratamientos
             SET {set_clauses}
             WHERE id_tratamiento = :id_tratamiento
         """)
         # Agregar el id_lote
        tratamiento_data["id_tratamiento"] = id_tratamiento
        result = db.execute(sentencia, tratamiento_data)
        db.commit()
        return result.rowcount > 0
    except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Error al actualizar tratamiento {id_tratamiento}: {e}")
            raise Exception("Error de base de datos al actualizar el registro de tratamiento")

def get_all_tratamientos_pag(db: Session, skip: int = 0, limit: int = 10):
    """
    Obtiene los registros de tratamientos con paginación.
    Compatible con PostgreSQL, MySQL y SQLite.
    """
    try:
        # Total de tratamientos
        count_query = text("""
            SELECT COUNT(t_p.id_tratamiento) AS total
            FROM tratamientos AS t_p
            LEFT JOIN lote_produccion AS l_p ON t_p.lote_id = l_p.id_lote
            LEFT JOIN especies AS e ON l_p.especie_id = e.id_especie
            LEFT JOIN categorias AS c ON l_p.categoria_id = c.id_categoria
            LEFT JOIN lotes_granja AS l_g ON t_p.lote_id = l_g.id_lote_g
            LEFT JOIN inv_insumos AS in_ins ON t_p.medicina_id = in_ins.id_insumo
            LEFT JOIN unidades_medida AS u_m ON t_p.unid_medida_id = u_m.id_unidad
            LEFT JOIN users AS u ON t_p.user_id = u.id_user
        """)

        total_result = db.execute(count_query).scalar()

        # Registros paginados
        data_query = text(""" 
                        SELECT t_p.id_tratamiento, t_p.lote_id, t_p.medicina_id, t_p.fecha_inicio, t_p.fecha_fin,
                        t_p.cantidad, t_p.unid_medida_id, t_p.observacion, e.nombre_especie, c.nombre_categoria,
                         t_p.cant_convertida, t_p.user_id, u.nombre_user,
                        in_ins.nombre_producto, l_g.nombre_lote, u_m.simbolo
                        FROM tratamientos AS t_p
                        LEFT JOIN lote_produccion AS l_p ON t_p.lote_id = l_p.id_lote
                        LEFT JOIN especies AS e ON l_p.especie_id = e.id_especie
                        LEFT JOIN categorias AS c ON l_p.categoria_id = c.id_categoria
                        LEFT JOIN inv_insumos AS in_ins ON t_p.medicina_id = in_ins.id_insumo
                        LEFT JOIN unidades_medida AS u_m ON t_p.unid_medida_id = u_m.id_unidad
                        LEFT JOIN lotes_granja AS l_g ON t_p.lote_id = l_g.id_lote_g
                        LEFT JOIN users AS u ON t_p.user_id = u.id_user
                        ORDER BY t_p.id_tratamiento DESC
                        LIMIT :limit OFFSET :skip
                    """)

        tratamiento_list = db.execute(
            data_query,
            {
                "limit": limit,
                "skip": skip
            }
        ).mappings().all()

        return {
            "total": total_result or 0,
            "tratamientos": tratamiento_list
        }

    except SQLAlchemyError as e:
        logger.error( f"Error al obtener los registros de tratamientos: {e}", exc_info=True)

        raise Exception(
            "Error de base de datos al obtener los registros de tratamientos"
        )
        
        