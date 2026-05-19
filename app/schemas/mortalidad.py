from app.schemas.permisos import List
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class MortalidadBase(BaseModel):
    lote_id: int
    fecha_reporte: datetime
    cantidad: int
    observacion: Optional[str] = Field(default=None, max_length=255)
    nombre_persona: str = Field(min_length=3, max_length=30)

class MortalidadCreate(MortalidadBase):
   pass

class MortalidadUpdate(BaseModel):
    lote_id: Optional[int] = None
    cantidad: Optional[int] = None
    observacion: Optional[str] = Field(default=None, max_length=255)
    nombre_persona: Optional[str] = None


class MortalidadOut(MortalidadBase):
   id_lote: int
   nombre_especie: str
   nombre_categoria: str
   nombre_lote: str

class PaginatedMortalidad(BaseModel):
    page: int
    page_size: int
    total_mortalidad: int
    total_pages: int
    mortalidad: List[MortalidadOut]
