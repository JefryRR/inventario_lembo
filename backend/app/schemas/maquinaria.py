from enum import Enum
from pydantic import BaseModel, Field
from typing import Optional
from datetime import date

class estadoMaquinaria(str, Enum):
    operativa = 'operativa'
    mantenimiento = 'mantenimiento'
    dañada = 'dañada'
    de_baja = 'de_baja'
   

class MaquinariaBase(BaseModel):
    nombre_maq: str 
    tipo_maq: str 
    marca: str 
    modelo: str 
    num_serie: str 
    fecha_compra: date 
    estado: estadoMaquinaria
    ubicacion: str 
    observaciones: str

class MaquinariaCreate(MaquinariaBase):
    pass

class MaquinariaUpdate(BaseModel):
    nombre_maq: Optional[str] = Field(None, min_length=1, max_length=100)
    tipo_maq: Optional[str] = Field(None, min_length=1, max_length=50)
    marca: Optional[str] = Field(None, min_length=1, max_length=50)
    modelo: Optional[str] = Field(None, min_length=1, max_length=50)
    num_serie: Optional[str] = Field(None, min_length=1, max_length=100)
    fecha_compra: Optional[date] = None
    estado: Optional[estadoMaquinaria] = None
    ubicacion: Optional[str] = Field(None, min_length=1, max_length=100)
    observaciones: Optional[str] = None
    fecha_de_baja: Optional[date] = None

class MaquinariaOut(MaquinariaBase):
    id_maquina: int
    fecha_de_baja: Optional[date] = None
    
class PaginatedMaquinarias(BaseModel):
    page: int
    page_size: int
    total_maquinas: int
    total_pages: int
    maquinas: list[MaquinariaOut]