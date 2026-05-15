from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from app.core.security import get_hashed_password
from typing import Optional
import logging
from app.schemas.users import UserCreate, UserUpdate, UserEstado

logger = logging.getLogger(__name__)

def create_user(db: Session, user: UserCreate) -> Optional[bool]:
    try:
        pass_encript = get_hashed_password(user.pass_hash)
        user.pass_hash = pass_encript
        query = text("""
          INSERT INTO users (
              nombre_user, documento, rol_id,
              correo, pass_hash, tipo_documento,
              telefono, estado 
          ) VALUES (
              :nombre_user, :documento, :rol_id,
              :correo, :pass_hash, :tipo_documento,
              :telefono, :estado
          )
      """)
        db.execute(query, user.model_dump())
        db.commit()
        return True
    except SQLAlchemyError as e:
      db.rollback()
      logger.error(f"Error al crear usuario: {e}")
      raise Exception("Error de base de datos al crear el usuario")

def get_user_by_email_for_login(db: Session, email: str):
   try:
       query = text("""SELECT id_user, nombre_user, documento, rol_id, tipo_documento,
               correo, telefono, u.estado, nombre_rol, pass_hash
                    FROM users AS u
                    INNER JOIN roles ON rol_id = roles.id_rol
                    WHERE correo = :email""")
       result = db.execute(query, {"email": email}).mappings().first()
       return result
   except SQLAlchemyError as e:
       logger.error(f"Error al obtener usuario por email: {e}")
       raise Exception("Error de base de datos al obtener el usuario")

def get_user_by_email(db: Session, email: str):
  try:
      query = text("""SELECT *
                   FROM users AS u
                   WHERE correo = :email""")
      result = db.execute(query, {"email": email}).mappings().first()
      return result
  except SQLAlchemyError as e:
      logger.error(f"Error al obtener usuario por email: {e}")
      raise Exception("Error de base de datos al obtener el usuario")

def get_all_user_except_admins(db: Session):
    try:
        query = text("""SELECT u.id_user, u.rol_id, u.nombre_user, u.documento, u.tipo_documento, u.correo, 
                            u.telefono, u.estado, r.nombre_rol
                            FROM users AS u
                        INNER JOIN roles AS r ON u.rol_id = r.id_rol
                        WHERE u.rol_id NOT IN (1, 2)
                     """)
        result = db.execute(query).mappings().all()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener los usuarios: {e}")
        raise Exception("Error de base de datos al obtener los usuarios")

def get_user_by_id(db: Session, id: int):
    try:
        query = text("""SELECT u.id_user, u.rol_id, u.nombre_user, u.documento, u.tipo_documento, u.correo, 
                            u.telefono, u.estado, r.nombre_rol
                            FROM users AS u
                            INNER JOIN roles as r ON u.rol_id = r.id_rol
                     WHERE id_user = :id_user
                     """)
        result = db.execute(query, {"id_user": id}).mappings().first()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener usuario por id: {e}")
        raise Exception("Error de base de datos al obtener el usuario")
    
def get_user_by_document_number(db: Session, document: str):
    try:
        query = text("""SELECT u.id_user, u.rol_id, u.nombre_user, u.documento, u.tipo_documento, u.correo, 
                            u.telefono, u.estado, r.nombre_rol
                            FROM users AS u
                            INNER JOIN roles as r ON u.rol_id = r.id_rol
                     WHERE u.documento = :document
                """)
        result = db.execute(query, {"document": document}).mappings().first()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener usuario por su documento: {e}")
        raise Exception("Error de base de datos al obtener el usuario")
    


def update_user_by_id(db: Session, user_id: int, user: UserUpdate) -> Optional[bool]:
    try:
    # Solo los campos enviados por el cliente
        user_data = user.model_dump(exclude_unset=True)
        if not user_data:
             return False  # nada que actualizar
         # Construir dinámicamente la sentencia UPDATE
        set_clauses = ", ".join([f"{key} = :{key}" for key in user_data.keys()])
        sentencia = text(f"""
             UPDATE users
             SET {set_clauses}
             WHERE id_user = :id_user
         """)
         # Agregar el id_user
        user_data["id_user"] = user_id
        result = db.execute(sentencia, user_data)
        db.commit()
        return result.rowcount > 0
    except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Error al actualizar usuario {user_id}: {e}")
            raise Exception("Error de base de datos al actualizar el usuario")
    

def change_status_user(db: Session, user_id: int, estado: UserEstado) -> Optional[bool]:
    try:
        sentencia = text("""
            UPDATE users
            SET estado = :estado
            WHERE id_user = :id_user
        """)
        result = db.execute(sentencia, {"estado": estado.estado, "id_user": user_id})
        db.commit()
        return result.rowcount > 0
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al cambiar estado del usuario {user_id}: {e}")
        raise Exception("Error de base de datos al cambiar el estado del usuario")


def get_all_users_pag(db: Session, skip: int = 0, limit: int = 10):
    """
    Obtiene usuarios con paginación.
    Compatible con PostgreSQL, MySQL y SQLite.
    """

    try:

        # Total de usuarios
        count_query = text("""
            SELECT COUNT(u.id_user) AS total
            FROM users AS u
            INNER JOIN roles AS r 
                ON u.rol_id = r.id_rol
        """)

        total_result = db.execute(count_query).scalar()

        # Usuarios paginados
        data_query = text("""
            SELECT u.id_user, u.rol_id, u.nombre_user, u.tipo_documento, u.documento, u.correo,
            u.telefono, u.estado, r.nombre_rol
                FROM users AS u
                INNER JOIN roles AS r 
                ON u.rol_id = r.id_rol
            LIMIT :limit OFFSET :skip
        """)

        users_list = db.execute(
            data_query,
            {
                "limit": limit,
                "skip": skip
            }
        ).mappings().all()

        return {
            "total": total_result or 0,
            "users": users_list
        }

    except SQLAlchemyError as e:
        logger.error( f"Error al obtener los usuarios: {e}", exc_info=True)

        raise Exception(
            "Error de base de datos al obtener los usuarios"
        )
        
        