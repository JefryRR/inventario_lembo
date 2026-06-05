from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class InsumoBase(BaseModel):
    nombre_producto: str = Field(min_length=1, max_length=100)
    cantidad: int = Field(gt=0)
    min_stock: int = Field(ge=0)
    unid_medida_id: int
    precio_unitario: float = Field(gt=0)
    fecha_ingreso: datetime
    fecha_vencimiento: datetime
    tipo_id: int

class InsumoCreate(InsumoBase):
    pass

class InsumoUpdate(BaseModel):
    cantidad: Optional[int] = None
    unid_medida_id: Optional[int] = None
    precio_unitario: Optional[float] = None
    fecha_vencimiento: Optional[datetime] = None
    min_stock: Optional[int] = None
    tipo_id: Optional[int] = None

class InsumoOut(InsumoBase):
    id_insumo: int
    nombre_tipo: str
    simbolo: str
    dias_restantes: int = 0
    nivel_alerta: Optional[str] = None

class Paginatedinsumos(BaseModel):
    page: int
    page_size: int
    total_insumos: int
    total_pages: int
    insumos: list[InsumoOut]