from pydantic import BaseModel, Field # type: ignore
from typing import Optional
from datetime import datetime
from enum import Enum

class TipoPerdida(str, Enum):
    contaminacion = "contaminacion"
    extravio = "extravio"
    vencimiento = "vencimiento"
    robo = "robo"
    daño_fisico = "daño_fisico"

class PerdidaBase(BaseModel):
    inv_prod_id: int
    cantidad: int
    motivo: TipoPerdida
    fecha_reporte: datetime
    user_id: Optional[int]
    observaciones: Optional[str] = Field(default=None, min_length=3, max_length=255)

class PerdidaCreate(PerdidaBase):
    pass

class PerdidaUpdate(BaseModel):
    cantidad: Optional[int] = None
    motivo: Optional[TipoPerdida] = None
    observaciones: Optional[str] = Field(default=None, min_length=3, max_length=255)

class PerdidaOut(PerdidaBase):
    id_perdida: int
    nombre_user: Optional[str]
    nombre_producto: Optional[str]

class PaginatedPerdidas(BaseModel):
    page: int
    page_size: int
    total_perdidas: int
    total_pages: int
    perdidas: list[PerdidaOut]