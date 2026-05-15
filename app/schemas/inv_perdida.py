from pydantic import BaseModel, Field # type: ignore
from typing import Optional
from datetime import datetime
from enum import Enum

class TipoPerdida(str, Enum):
    contaminacion = "contaminación"
    extravio = "extravío"
    vencimiento = "vencimiento"
    robo = "robo"
    daño = "daño_físico"

class PerdidaBase(BaseModel):
    inv_prod_id: int
    cantidad: int
    motivo: TipoPerdida
    fecha_reporte: datetime = Field(default_factory=datetime.utcnow)
    user_id: int
    observaciones: Optional[str] = Field(default=None, max_length=255)

class PerdidaCreate(PerdidaBase):
    pass

class PerdidaUpdate(BaseModel):
    inv_prod_id: Optional[int] = None
    cantidad: Optional[int] = None
    motivo: Optional[TipoPerdida] = None
    fecha_reporte: Optional[datetime] = None
    user_id: Optional[int] = None
    observaciones: Optional[str] = Field(default=None, max_length=255)

class PerdidaOut(PerdidaBase):
    id_perdida: int
    nombre_producto: str
    nombre_user: str

class PaginatedPerdidas(BaseModel):
    page: int
    page_size: int
    total_perdidas: int
    total_pages: int
    perdidas: list[PerdidaOut]