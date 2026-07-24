import datetime
from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum

# Aquí se define el schema para la programación de platos, incluyendo la creación, actualización y salida de datos.

class tipoComida(str, Enum):
    desayuno = "desayuno"
    almuerzo = "almuerzo"
    refrigerio = "refrigerio"

class ProgrmacionBase(BaseModel):
    plato_id: int
    tipo_comida: tipoComida
    cant_personas: int
    horario_visita: str = Field(max_length=50)
    fecha_programacion: datetime.date

class ProgramacionCreate(ProgrmacionBase):
    pass

class ProgramacionUpdate(BaseModel):
    plato_id: Optional[int] = None
    tipo_comida: Optional[tipoComida] = Field(default=None)
    cant_personas: Optional[int] = None
    horario_visita: Optional[str] = Field(default=None, max_length=50)
    fecha_programacion: Optional[datetime.date] = Field(default=None)

class ProgramacionOut(ProgrmacionBase):
    id_programacion: int
    nombre_plato: str

class ProgramacionPaginated(BaseModel):
    page: int
    page_size: int
    total_programaciones: int
    total_pages: int
    programaciones: list[ProgramacionOut]