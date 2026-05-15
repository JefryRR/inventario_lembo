from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from typing import Optional
from app.schemas.categorias import CategoriaCreate, CategoriaUpdate
import logging

logger = logging.getLogger(__name__)

def create_categoria(db: Session, categoria: CategoriaCreate):
    try:
        query = text("""INSERT INTO categorias (
                nombre_categoria) VALUES (
                :nombre_categoria
            )
        """)
        db.execute(query, categoria.model_dump())
        db.commit()
        return True
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al crear la categoria: {e}")
        raise Exception("Error de base de datos al crear la categoria")

def get_categoria_by_id(db: Session, id: int):
    try:
        query = text("""SELECT id_categoria, nombre_categoria
                     FROM categorias
                     WHERE id_categoria = :id
                """)
        
        result = db.execute(query, {"id": id}).mappings().first()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener categoria por id: {e}")
        raise Exception("Error de base de datos al obtener la categoria")

def get_all_categorias(db: Session):
    try:
        query = text("""SELECT
                     * FROM categorias
                     """)
        result = db.execute(query).mappings().all()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener las categorias: {e}")
        raise Exception("Error de base de datos al obtener las categorias")
    
def update_categoria_by_id(db: Session, id_categoria: int, categoria: CategoriaUpdate) -> Optional[bool]:
    try:
        categoria_data = categoria.model_dump(exclude_unset=True)
        if not categoria_data:
            raise Exception("No se enviaron campos para actualizar")

        set_clauses = ", ".join([f"{key} = :{key}" for key in categoria_data.keys()])
        sentencia = text(f"""
            UPDATE categorias c
            SET {set_clauses}
            WHERE c.id_categoria = :id_categoria
        """)

        categoria_data["id_categoria"] = id_categoria

        result = db.execute(sentencia, categoria_data)
        db.commit()

        return result.rowcount > 0
    
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al actualizar la categoria {id_categoria}: {e}")
        raise Exception("Error de base de datos al actualizar la categoria")
    