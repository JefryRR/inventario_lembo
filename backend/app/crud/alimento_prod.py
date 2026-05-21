from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from typing import Optional
import logging
from app.schemas.alimento_prod import AlimentoCreate, AlimentoUpdate

logger = logging.getLogger(__name__)

def create_alimento(db: Session, alimento: AlimentoCreate) -> Optional[bool]:
    try:
        query = text("""
          INSERT INTO alimento_produccion (
              lote_id, insumo_id, fecha_alimento, cantidad, unid_medida_id
          ) VALUES (
              :lote_id, :insumo_id, :fecha_alimento, :cantidad, :unid_medida_id
          )
      """)
        db.execute(query, alimento.model_dump())
        db.commit()
        return True
    except SQLAlchemyError as e:
      db.rollback()
      logger.error(f"Error al crear alimento: {e}")
      raise Exception("Error de base de datos al crear el registro de alimento")

def get_all_alimentos(db: Session):
    try:
        query = text("""
                     SELECT a_p.id_alimento, a_p.lote_id, a_p.insumo_id, a_p.fecha_alimento, a_p.cantidad, a_p.unid_medida_id,
                     e.nombre_especie, c.nombre_categoria, u_m.simbolo, in_ins.nombre_producto, l_p.nombre_lote
                     FROM alimento_produccion AS a_p
                     INNER JOIN lote_produccion AS l_p ON a_p.lote_id = l_p.id_lote
                     LEFT JOIN especies AS e ON l_p.especie_id = e.id_especie
                     LEFT JOIN categorias AS c ON l_p.categoria_id = c.id_categoria
                     LEFT JOIN inv_insumos AS in_ins ON a_p.insumo_id = in_ins.id_insumo
                     LEFT JOIN unidades_medida AS u_m ON a_p.unid_medida_id = u_m.id_unidad
                     ORDER BY a_p.id_alimento DESC
                     """)
        result = db.execute(query).mappings().all()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener alimentos: {e}")
        raise Exception("Error de base de datos al obtener los registros de alimentos")

def get_alimento_by_id(db: Session, id: int):
    try:
        query = text("""
                     SELECT a_p.id_alimento, a_p.lote_id, a_p.insumo_id, a_p.fecha_alimento, a_p.cantidad, a_p.unid_medida_id,
                     e.nombre_especie, c.nombre_categoria, u_m.simbolo, in_ins.nombre_producto, l_p.nombre_lote
                     FROM alimento_produccion AS a_p
                     INNER JOIN lote_produccion AS l_p ON a_p.lote_id = l_p.id_lote
                     LEFT JOIN especies AS e ON l_p.especie_id = e.id_especie
                     LEFT JOIN categorias AS c ON l_p.categoria_id = c.id_categoria
                     LEFT JOIN inv_insumos AS in_ins ON a_p.insumo_id = in_ins.id_insumo
                     LEFT JOIN unidades_medida AS u_m ON a_p.unid_medida_id = u_m.id_unidad
                    WHERE a_p.id_alimento = :id
                    """)
        
        result = db.execute(query, {"id": id}).mappings().first()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener alimento por id: {e}")
        raise Exception("Error de base de datos al obtener el alimento por id")

def update_alimento_by_id(db: Session, id_alimento: int, alimento: AlimentoUpdate) -> Optional[bool]:
    try:
    # Solo los campos enviados por el cliente
        alimento_data = alimento.model_dump(exclude_unset=True)
        if not alimento_data:
             return False  # nada que actualizar
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
            logger.error(f"Error al actualizar lote {id_alimento}: {e}")
            raise Exception("Error de base de datos al actualizar el registro de alimento")

def get_all_alimentos_pag(db: Session, skip: int = 0, limit: int = 10):
    """
    Obtiene los registros de alimentos con paginación.
    Compatible con PostgreSQL, MySQL y SQLite.
    """
    try:
        # Total de alimentos
        count_query = text("""
            SELECT COUNT(a_p.id_alimento) AS total
            FROM alimento_produccion AS a_p
            INNER JOIN lote_produccion AS l_p ON a_p.lote_id = l_p.id_lote
            LEFT JOIN especies AS e ON l_p.especie_id = e.id_especie
            LEFT JOIN categorias AS c ON l_p.categoria_id = c.id_categoria
        """)

        total_result = db.execute(count_query).scalar()

        # Registros paginados
        data_query = text(""" 
                        SELECT a_p.id_alimento, a_p.lote_id, a_p.insumo_id, a_p.fecha_alimento, a_p.cantidad, a_p.unid_medida_id,
                        e.nombre_especie, c.nombre_categoria, u_m.simbolo, in_ins.nombre_producto, l_p.nombre_lote
                        FROM alimento_produccion AS a_p
                        INNER JOIN lote_produccion AS l_p ON a_p.lote_id = l_p.id_lote
                        LEFT JOIN especies AS e ON l_p.especie_id = e.id_especie
                        LEFT JOIN categorias AS c ON l_p.categoria_id = c.id_categoria
                        LEFT JOIN inv_insumos AS in_ins ON a_p.insumo_id = in_ins.id_insumo
                        LEFT JOIN unidades_medida AS u_m ON a_p.unid_medida_id = u_m.id_unidad
                        ORDER BY a_p.id_alimento DESC
                        LIMIT :limit OFFSET :skip
                    """)

        alimento_prod_list = db.execute(
            data_query,
            {
                "limit": limit,
                "skip": skip
            }
        ).mappings().all()

        return {
            "total": total_result or 0,
            "alimentos": alimento_prod_list
        }

    except SQLAlchemyError as e:
        logger.error( f"Error al obtener los registros de alimentos: {e}", exc_info=True)

        raise Exception(
            "Error de base de datos al obtener los registros de alimentos"
        )
        
        