from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
import logging

logger = logging.getLogger(__name__)

# Verificar si un rol tiene permisos para realizar una acción en un módulo  
def verify_permissions(db: Session, id_rol: int, id_modulo: int, accion: str):
    try:
        query = text("""SELECT insertar, actualizar, seleccionar, borrar
                     FROM permisos 
                     WHERE id_rol = :rol AND id_modulo = :modulo""")
        result = db.execute(query, {"rol": id_rol, "modulo": id_modulo}).mappings().first()

        if (result is None):
            raise HTTPException(status_code=401, detail="Usuario no autorizado")
        
        permiso = 0
        if result.insertar == 1 and accion == "insertar":
            permiso = 1

        if result.actualizar == 1 and accion == "actualizar":
            permiso = 1
            
        if result.seleccionar == 1 and accion == "seleccionar":
            permiso = 1

        if result.borrar == 1 and accion == "borrar":
            permiso = 1
        
        return permiso

    except SQLAlchemyError as e:
        logger.error(f"Error al obtener permisos: {e}")
        raise Exception("Error de base de datos al obtener permisos")

# Obtener los permisos dependiendo del rol, este se usa para hacer las vistas en el front-end dependiendo del rol del usuario
def get_permisos_by_rol(db: Session, id_rol: int):
    query = text("""
        SELECT m.id_modulo, m.nombre AS modulo, p.insertar, p.actualizar, p.seleccionar, p.borrar
        FROM permisos p
        INNER JOIN modulos m ON m.id_modulo = p.id_modulo
        WHERE p.id_rol = :id_rol
    """)
    result = db.execute(query, {"id_rol": id_rol}).mappings().all()
    return [dict(row) for row in result]
