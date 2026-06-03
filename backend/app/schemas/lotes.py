from app.schemas.permisos import List
from pydantic import BaseModel, Field
from typing import Optional, List

class LoteBase(BaseModel):
    nombre_lote: str = Field(max_length=25)
    ubicacion: str = Field(max_length=50)
    latitud: Optional[str] = Field(default=None, max_length=45)
    longitud: Optional[str] = Field(default=None, max_length=45)

class LoteCreate(LoteBase):
   pass

class LoteUpdate(BaseModel):
   nombre_lote: Optional[str] = Field(default= None, min_length=2, max_length=25)
   ubicacion: Optional[str] = Field(default=None, max_length=50)
   latitud: Optional[str] =Field(default=None, max_length=45)
   longitud: Optional[str] =Field(default=None, max_length=45)

class LoteOut(LoteBase):
   id_lote_g: int

class PaginatedLotes(BaseModel):
    page: int
    page_size: int
    total_lotes: int
    total_pages: int
    lotes_granja: List[LoteOut]
