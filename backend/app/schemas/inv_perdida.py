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
    muerte = "muerte animal"

class TipoOrigen(str, Enum):
    insumo = "insumo"
    produccion = "produccion"

class PerdidaBase(BaseModel):
    inv_prod_id: int
    cantidad: int
    origen: TipoOrigen
    motivo: TipoPerdida
    fecha_reporte: datetime
    unid_medida_id: int
    observaciones: Optional[str] = Field(default=None, min_length=3, max_length=255)

class PerdidaCreate(PerdidaBase):
    pass

class PerdidaUpdate(BaseModel):
    cantidad: Optional[int] = None
    motivo: Optional[TipoPerdida] = None
    origen: Optional[TipoOrigen] = None
    unid_medida_id: Optional[int] = None
    observaciones: Optional[str] = Field(default=None, min_length=3, max_length=255)

class PerdidaOut(PerdidaBase):
    id_perdida: int
    user_id: Optional[int]
    nombre_user: Optional[str]
    nombre_producto: Optional[str]
    valor_unitario: Optional[float] = None
    nombre_lote: Optional[str] = None
    simbolo: Optional[str] = None

class PaginatedPerdidas(BaseModel):
    page: int
    page_size: int
    total_perdidas: int
    total_pages: int
    perdidas: list[PerdidaOut]