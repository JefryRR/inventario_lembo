from sqlalchemy.orm import Session
from sqlalchemy import text
#from app.core.security import get_hashed_password
from typing import Optional
import logging

from app.schemas.users import UserCreate, UserUpdate, UserEstado

logger = logging.getLogger(__name__)

def create_user(db: Session, user: UserCreate) -> Optional[bool]:
    try:
        # pass_encript = get_hashed_password(user.pass_hash)
        # user.pass_hash = pass_encript
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
    except Exception as e:
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
   except Exception as e:
       logger.error(f"Error al obtener usuario por email: {e}")
       raise Exception("Error de base de datos al obtener el usuario")

def get_user_by_email(db: Session, email: str):
  try:
      query = text("""SELECT *
                   FROM users AS u
                   WHERE correo = :email""")
      result = db.execute(query, {"email": email}).mappings().first()
      return result
  except Exception as e:
      logger.error(f"Error al obtener usuario por email: {e}")
      raise Exception("Error de base de datos al obtener el usuario")

def get_user_by_id(db: Session, id: int):
  try:
      query = text("""SELECT id_user, nombre_user, documento, rol_id, tipo_documento,
               correo, telefono, u.estado, nombre_rol
                    FROM users AS u
                    INNER JOIN roles ON rol_id = roles.id_rol
                    WHERE id_user = :id
                   """)
      result = db.execute(query, {"id": id}).mappings().first()
      return result
  except Exception as e:
      logger.error(f"Error al obtener usuario por id: {e}")
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
    except Exception as e:
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
    except Exception as e:
        db.rollback()
        logger.error(f"Error al cambiar estado del usuario {user_id}: {e}")
        raise Exception("Error de base de datos al cambiar el estado del usuario")
