import datetime
from pydantic import BaseModel, Field
from typing import Optional

# Aquí se define el schema para los platos, incluyendo la creación, actualización y salida de datos.

class PlatoBase(BaseModel):
    nombre_plato: str = Field(max_length=100)
    estado: bool = Field(default=True)
    fecha_registro: datetime.date

class PlatoCreate(PlatoBase):
    pass

class PlatoUpdate(BaseModel):
    nombre_plato: Optional[str] = Field(default=None, max_length=25)
    estado: Optional[bool] = Field(default=None)

class PlatoOut(PlatoBase):
    id_plato: int

class PlatosPaginated(BaseModel):
    page: int
    page_size: int
    total_platos: int
    total_pages: int
    platos: list[PlatoOut]