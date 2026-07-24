from sqlalchemy.orm import Session 
from sqlalchemy import text 
from sqlalchemy.exc import SQLAlchemyError 
from typing import Optional
from app.schemas.modulos import ModuloCreate, ModuloUpdate
import logging

logger = logging.getLogger(__name__)

# Crear un nuevo módulo
def create_modulo(db: Session, modulo: ModuloCreate) -> Optional[bool]:
    try:
        query = text("""
            INSERT INTO modulos (
                nombre
            ) VALUES (
                :nombre
            )
        """)
        db.execute(query, modulo.model_dump())
        db.commit()
        return True
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al crear el modulo: {e}")
        raise Exception("Error de base de datos al crear el modulo")

# Obtener un módulo por su ID
def get_modulo_by_id(db: Session, id: int):
    try:
        query = text("""SELECT id_modulo, nombre
                     FROM modulos
                     WHERE id_modulo = :id
                """)
        
        result = db.execute(query, {"id": id}).mappings().first()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener modulo por id: {e}")
        raise Exception("Error de base de datos al obtener el modulo")

# Obtener todos los datos de los modulos
def get_all_modules(db: Session):
    try:
        query = text("""SELECT
                     * FROM modulos
                     """)
        result = db.execute(query).mappings().all()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener los modulos: {e}")
        raise Exception("Error de base de datos al obtener los modulos")

# Actualizar un módulo por su ID
def update_module_by_id(db: Session, id_modulo: int, modulo: ModuloUpdate) -> Optional[bool]:
    try:
        modulo_data = modulo.model_dump(exclude_unset=True)
        if not modulo_data:
            raise Exception("No se enviaron campos para actualizar")

        set_clauses = ", ".join([f"{key} = :{key}" for key in modulo_data.keys()])
        sentencia = text(f"""
            UPDATE modulos m
            SET {set_clauses}
            WHERE m.id_modulo = :id_modulo
        """)

        modulo_data["id_modulo"] = id_modulo

        result = db.execute(sentencia, modulo_data)
        db.commit()

        return result.rowcount > 0
    
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al actualizar el modulo {id_modulo}: {e}")
        raise Exception("Error de base de datos al actualizar el modulo")

#Función para obtener todos los modulos haciendo uso de la paginación
def get_all_modules_pag(db: Session, skip: int = 0, limit: int = 10):
    """
    Obtiene modulos con paginación.
    Compatible con PostgreSQL, MySQL y SQLite.
    """

    try:
        # Total de modulos
        count_query = text("""
            SELECT COUNT(m.id_modulo) AS total
            FROM modulos AS m
        """)

        total_result = db.execute(count_query).scalar()

        # Modulos paginados
        data_query = text("""
                    SELECT m.id_modulo, m.nombre
                    FROM modulos AS m
                    ORDER BY m.id_modulo
                    LIMIT :limit OFFSET :skip
                """)

        modulos_list = db.execute(
            data_query,
            {
                "limit": limit,
                "skip": skip
            }
        ).mappings().all()

        return {
            "total": total_result or 0,
            "modulos": modulos_list
        }

    except SQLAlchemyError as e:
        logger.error( f"Error al obtener los detalles de venta: {e}", exc_info=True)
        raise Exception("Error de base de datos al obtener los detalles de venta")