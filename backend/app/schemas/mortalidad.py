from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class MortalidadBase(BaseModel):
    lote_id: int
    fecha_reporte: datetime
    cantidad: int
    observacion: Optional[str] = Field(default=None, max_length=255)
    foto_url: Optional[str] = None

class MortalidadCreate(MortalidadBase):
   pass

class MortalidadUpdate(BaseModel):
    lote_id: Optional[int] = None
    cantidad: Optional[int] = None
    observacion: Optional[str] = Field(default=None, max_length=255)
    foto_url: Optional[str] = None


class MortalidadOut(MortalidadBase):
   id_mortalidad: int
   user_id: int
   nombre_especie: Optional[str] = None
   nombre_categoria: Optional[str] = None
   nombre_lote: str
   sublote: str
   nombre_user: Optional[str] = None

class PaginatedMortalidad(BaseModel):
    page: int
    page_size: int
    total_mortalidad: int
    total_pages: int
    mortalidad: List[MortalidadOut]