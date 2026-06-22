from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum
class tipo_origen(str, Enum):
    inventario = 'inventario'
    receta = 'receta'
    ambas = 'ambas'
class Unid_medBase(BaseModel):
    unidad: str = Field(max_length=25)
    simbolo: str = Field(max_length=10)
    conversion: float
    tipo: tipo_origen
   
class Unid_medCreate(Unid_medBase):
    pass

class Unid_medUpdate(BaseModel):
    unidad: Optional[str] = Field(default=None, max_length=25)
    simbolo: Optional[str] = Field(default=None, max_length=10)
    conversion: Optional[float] = None
    tipo: Optional[tipo_origen] = None
class Unid_medOut(Unid_medBase):
    id_unidad: int
