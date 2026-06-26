from sqlalchemy.orm import Session # type: ignore
from sqlalchemy import text # type: ignore
from sqlalchemy.exc import SQLAlchemyError # type: ignore
from app.schemas.prog_platos import ProgramacionCreate, ProgramacionUpdate

import logging

logger = logging.getLogger(__name__)

def create_progPlato(db: Session, platos: ProgramacionCreate):
    try:
        query = text("""INSERT INTO prog_platos 
                        (plato_id, tipo_comida, cant_personas, horario_visita, fecha_programacion
                        ) VALUES (
                        :plato_id, :tipo_comida, :cant_personas, :horario_visita, :fecha_programacion)
                    """)
        result = db.execute(query, platos.model_dump())
        db.commit()

        # Obtenemos el id recién insertado y devolvemos el objeto completo
        nuevo_id = result.lastrowid
        nueva_prog = db.execute(text("""
            SELECT pp.id_programacion, pp.plato_id, pp.tipo_comida, pp.cant_personas,
                   pp.horario_visita, pp.fecha_programacion, p.nombre_plato
            FROM prog_platos pp
            JOIN platos p ON p.id_plato = pp.plato_id
            WHERE pp.id_programacion = :id
        """), {"id": nuevo_id}).mappings().one()

        return dict(nueva_prog)

    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al crear la programación: {e}")
        raise Exception("Error de base de datos al crear la programación")

def get_progPlato_by_id(db: Session, id: int):
    try:
        query = text("""SELECT pp.id_programacion, pp.plato_id, pp.tipo_comida, pp.cant_personas, 
                     pp.horario_visita, pp.fecha_programacion, p.nombre_plato
                     FROM prog_platos pp
                     LEFT JOIN platos p ON pp.plato_id = p.id_plato
                     WHERE pp.id_programacion = :id
                """)
        result = db.execute(query, {"id": id}).mappings().first()
        return result
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener la programación por ID: {e}")
        raise Exception("Error de base de datos al obtener la programación")

def update_progPlato_by_id(db: Session, programacion_id: int, plato: ProgramacionUpdate):
    try:
        plato_data = plato.model_dump(exclude_unset=True)
        if not plato_data:
            return False
        set_clauses = ", ".join([f"{key} = :{key}" for key in plato_data.keys()])
        query = text(f"""
            UPDATE prog_platos
            SET {set_clauses}
            WHERE id_programacion = :id_programacion
        """)
        
        plato_data["id_programacion"] = programacion_id
        result = db.execute(query, plato_data)
        db.commit()
        return result.rowcount > 0
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al actualizar la programación {programacion_id}: {e}")
        raise Exception("Error de base de datos al actualizar la programación")

def get_programaciones_by_date_range(db: Session, fecha_inicio: str, fecha_fin: str):
    """
    Obtiene las programaciones cuya fecha de inicio o fin esté dentro de un rango de fechas.
    Ignora las horas (usa DATE(fecha_hora_init) y DATE(fecha_hora_fin)).
    """
    try:
        query = text("""
                    SELECT pp.id_programacion, pp.plato_id, pp.tipo_comida, pp.cant_personas, pp.horario_visita,
                    pp.fecha_programacion, p.nombre_plato
                    FROM prog_platos AS pp
                    LEFT JOIN platos AS p ON pp.plato_id = p.id_plato
                    WHERE DATE(pp.fecha_programacion) BETWEEN :fecha_inicio AND :fecha_fin
                    ORDER BY pp.fecha_programacion DESC
                """)
        result = db.execute(query, {
            "fecha_inicio": fecha_inicio,
            "fecha_fin": fecha_fin
        }).mappings().all()
        
        return [dict(row) for row in result]

    except SQLAlchemyError as e:
        raise Exception(f"Error al consultar las programaciones por rango de fechas: {e}")

def all_progPlatos(db: Session):
    try:
        query = text("""SELECT pp.id_programacion, pp.plato_id, pp.tipo_comida, pp.cant_personas, pp.horario_visita, 
                        pp.fecha_programacion, p.nombre_plato
                        FROM prog_platos AS pp
                        LEFT JOIN platos AS p ON pp.plato_id = p.id_plato
                    """)
        result = db.execute(query).mappings().all()
        return result
    
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener todas las programaciones: {e}")
        raise Exception("Error de base de datos al obtener todas las programaciones")

def get_progPlatos_paginated(db: Session, skip: int = 0, limit: int = 10):

    """
    Obtiene inventario de producción con paginación.
    Compatible con PostgreSQL, MySQL y SQLite.
    """
    try:
        # Total de producción
        count_query = text("""
            SELECT COUNT(id_programacion) AS total
            FROM prog_platos
        """)

        total_result = db.execute(count_query).scalar()

        # Producción paginada
        data_query = text(""" 
                        SELECT pp.id_programacion, pp.plato_id, pp.tipo_comida, pp.cant_personas, pp.horario_visita, pp.fecha_programacion, p.nombre_plato
                        FROM prog_platos AS pp
                        LEFT JOIN platos AS p ON pp.plato_id = p.id_plato
                        LIMIT :limit OFFSET :skip
                    """)
            
        programaciones_list = db.execute(data_query, {"limit": limit, "skip": skip}).mappings().all()

        return {
                "total": total_result or 0,
                "programaciones": programaciones_list
            }

    except SQLAlchemyError as e:
        logger.error(f"Error al obtener las programaciones: {e}", exc_info=True)
        raise Exception("Error de base de datos al obtener las programaciones")
    
def delete_progPlato_by_id(db: Session, programacion_id: int):
    try:
        query = text("""
            DELETE FROM prog_platos
            WHERE id_programacion = :id_programacion
        """)
        result = db.execute(query, {"id_programacion": programacion_id})
        db.commit()
        return result.rowcount > 0
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error al eliminar la programación {programacion_id}: {e}")
        raise Exception("Error de base de datos al eliminar la programación")