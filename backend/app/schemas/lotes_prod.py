from app.schemas.permisos import List
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class LoteEstado(str, Enum):
    activo = "activo"
    finalizado = "finalizado"
    cuarentena = "cuarentena"
    cosechar = "cosechar"
    listo_para_carne = "listo_para_carne"

class LoteBase(BaseModel):
    lote_granj_id: int
    fecha_siembra: datetime
    fecha_cosecha: datetime
    cantidad_inicial: int
    especie_id: int
    categoria_id: int
    estado_lote: LoteEstado
    user_id: int

class LoteCreate(LoteBase):
   pass

class LoteUpdate(BaseModel):
   fecha_siembra: Optional[datetime] = None
   fecha_cosecha: Optional[datetime] = None
   cantidad_inicial: Optional[int] = None
   especie_id: Optional[int] = None
   categoria_id: Optional[int] = None
   user_id: Optional[int] = None


class LoteOut(LoteBase):
   id_lote: int
   nombre_lote: str
   nombre_especie: str
   nombre_categoria: str
   nombre_user: str
   nombre_lote: str

class PaginatedLotes(BaseModel):
    page: int
    page_size: int
    total_lotes: int
    total_pages: int
    lotes: List[LoteOut]
