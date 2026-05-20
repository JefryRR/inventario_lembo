from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class InsumoBase(BaseModel):
    nombre_producto: str = Field(min_length=1, max_length=100)
    cantidad: int = Field(gt=0)
    unidad_medida: str = Field(min_length=1, max_length=50)
    precio_unitario: float = Field(gt=0)
    fecha_ingreso: datetime
    fecha_vencimiento: datetime
    tipo_id: int

class InsumoCreate(InsumoBase):
    pass

class InsumoUpdate(BaseModel):
    cantidad: Optional[int] = None
    unidad_medida: Optional[str] = None
    precio_unitario: Optional[float] = None
    fecha_vencimiento: Optional[datetime] = None
    tipo_id: Optional[int] = None

class InsumoOut(InsumoBase):
    id_insumo: int
    nombre_tipo: str

class Paginatedinsumos(BaseModel):
    page: int
    page_size: int
    total_insumos: int
    total_pages: int
    insumos: list[InsumoOut]