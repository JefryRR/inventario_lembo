from typing import Optional
import logging

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.schemas.permisos import PermisoCreate, PermisoUpdate

logger = logging.getLogger(__name__)


def create_permiso(db: Session, permiso: PermisoCreate) -> Optional[bool]:
    try:
        # Verificar si el permiso ya existe
        check_query = text("""
            SELECT id_rol FROM permisos
            WHERE id_rol = :id_rol AND id_modulo = :id_modulo
        """)
        existing = db.execute(check_query, {"id_rol": permiso.id_rol, "id_modulo": permiso.id_modulo}).first()
        
        if existing:
            raise Exception("permiso_existe")
        
        query = text("""
            INSERT INTO permisos (
                id_rol, id_modulo, insertar, actualizar, seleccionar, borrar
            ) VALUES (
                :id_rol, :id_modulo, :insertar, :actualizar, :seleccionar, :borrar
            )
        """)
        db.execute(query, permiso.model_dump())
        db.commit()
        return True
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al crear permiso: {e}")
        raise Exception("Error de base de datos al crear el permiso")


def get_all_permisos(db: Session):
    try:
        query = text("""SELECT p.id_rol, p.id_modulo, p.insertar, p.actualizar, p.seleccionar, p.borrar,
                        m.nombre AS nombre_modulo, r.nombre_rol
                        FROM permisos AS p
                        JOIN modulos AS m ON p.id_modulo = m.id_modulo
                        JOIN roles AS r ON p.id_rol = r.id_rol
                        ORDER BY p.id_rol, p.id_modulo
                    """)
        result = db.execute(query).mappings().all()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener permisos: {e}")
        raise Exception("Error de base de datos al obtener los permisos")


def get_permisos_by_rol(db: Session, id_rol: int):
    try:
        query = text("""
            SELECT p.id_rol, p.id_modulo, p.insertar, p.actualizar, p.seleccionar, p.borrar,
                   m.nombre AS nombre_modulo, r.nombre_rol
            FROM permisos AS p
            JOIN modulos AS m ON p.id_modulo = m.id_modulo
            JOIN roles AS r ON p.id_rol = r.id_rol
            WHERE p.id_rol = :id_rol
            ORDER BY p.id_modulo
        """)
        return db.execute(query, {"id_rol": id_rol}).mappings().all()
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener permisos por rol: {e}")
        raise Exception("Error de base de datos al obtener permisos por rol")


def get_permiso_by_id(db: Session, id_modulo: int, id_rol: int):
    try:
        query = text("""
            SELECT p.id_rol, p.id_modulo, p.insertar, p.actualizar, p.seleccionar, p.borrar,
                   m.nombre AS nombre_modulo, r.nombre_rol
            FROM permisos AS p
            JOIN modulos AS m ON p.id_modulo = m.id_modulo
            JOIN roles AS r ON p.id_rol = r.id_rol
            WHERE p.id_modulo = :modulo AND p.id_rol = :rol
        """)
        result = db.execute(query, {"modulo": id_modulo, "rol": id_rol}).mappings().first()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener permiso por ids: {e}")
        raise Exception("Error de base de datos al obtener el permiso")


def update_permiso(db: Session, id_modulo: int, id_rol: int, permiso: PermisoUpdate) -> Optional[bool]:
    try:
        permiso_data = permiso.model_dump(exclude_unset=True)

        if not permiso_data:
            return False

        set_clauses = ", ".join([f"{key} = :{key}" for key in permiso_data.keys()])
        permiso_data["modulo"] = id_modulo
        permiso_data["rol"] = id_rol

        query = text(f"""
            UPDATE permisos
            SET {set_clauses}
            WHERE id_modulo = :modulo AND id_rol = :rol
        """)

        result = db.execute(query, permiso_data)
        db.commit()
        return result.rowcount > 0
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al actualizar permiso: {e}")
        raise Exception("Error de base de datos al actualizar el permiso")

#Función para obtener todos los permisos haciendo uso de la paginación
def get_all_permisos_pag(db: Session, skip:int = 0, limit = 10):
    """
    Obtiene los permisos con paginación.
    También realizar una segunda consulta para contar total de permisos.
    """
    try: 
        count_query = text(f"""
            SELECT COUNT(*) AS total
            FROM (
                SELECT DISTINCT p.id_rol, p.id_modulo
                FROM permisos AS p
                JOIN modulos AS m ON p.id_modulo = m.id_modulo
                JOIN roles AS r ON p.id_rol = r.id_rol
            ) AS permisos_filtrados
        """)
        total_result = db.execute(count_query).scalar()

        #2 Consultar permisos
        data_query = text(f"""
            SELECT p.id_rol AS id_rol, p.id_modulo AS id_modulo,
                   p.insertar, p.actualizar, p.seleccionar, p.borrar,
                   m.nombre AS nombre_modulo, r.nombre_rol
            FROM permisos AS p
            JOIN modulos AS m ON p.id_modulo = m.id_modulo
            JOIN roles AS r ON p.id_rol = r.id_rol
            ORDER BY p.id_rol, p.id_modulo
            LIMIT :limit OFFSET :skip
        """)
        permisos_list = db.execute(data_query, {"limit": limit, "skip": skip} ).mappings().all()
        
        return {
                "total": total_result or 0,
                "permisos": permisos_list
            }
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener los permisos: {e}", exc_info=True)
        raise Exception("Error de base de datos al obtener los permisos")