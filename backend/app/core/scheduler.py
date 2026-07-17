"""
Tareas programadas para procesos automáticos de la aplicación.
"""
import logging
from apscheduler.schedulers.background import BackgroundScheduler

from app.core.database import SessionLocal
from app.crud.comercio import registrar_vencidos_como_perdidas as vencidos_comercio
from app.crud.inv_produccion import registrar_vencidos_como_perdidas as vencidos_produccion
from app.crud.inv_insumos import registrar_vencidos_como_perdidas as vencidos_insumos

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()


def job_registrar_vencidos():
    """
    Recorre producción, insumos y comercialización, y registra
    como pérdidas todo lo que ya venció y no ha sido registrado.
    """
    db = SessionLocal()
    try:
        n1 = vencidos_produccion(db)
        n2 = vencidos_insumos(db)
        n3 = vencidos_comercio(db)
        logger.info(
            f"Vencidos registrados -> producción: {n1}, insumos: {n2}, comercio: {n3}"
        )
    except Exception as e:
        logger.error(f"Error ejecutando job de vencidos: {e}")
    finally:
        db.close()


def iniciar_scheduler():
    scheduler.add_job(
        job_registrar_vencidos,
        "interval",
        minutes=1,       # ajusta la frecuencia que necesites
        id="job_vencidos",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Scheduler de vencidos iniciado")