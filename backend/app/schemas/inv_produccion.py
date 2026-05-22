from pydantic import BaseModel, Field # type: ignore
from typing import Optional
from datetime import datetime

class ProduccionBase(BaseModel):
    nombre_producto: str = Field(min_length=3, max_length=50)
    cantidad: int
    unid_medida_id: int
    fecha_ingreso: datetime
    fecha_vencimiento: datetime
    lote_id: int
    valor_unitario: float
    categoria_id: int
    especie_id: int

class ProduccionCreate(ProduccionBase):
    pass

class ProduccionUpdate(BaseModel):
    nombre_producto: Optional[str] = Field(default=None, min_length=3, max_length=50)
    cantidad: Optional[int] = None
    unid_medida_id: Optional[int] = None
    fecha_ingreso: Optional[datetime] = None
    fecha_vencimiento: Optional[datetime] = None
    lote_id: Optional[int] = None
    valor_unitario: Optional[float] = None
    categoria_id: Optional[int] = None
    especie_id: Optional[int] = None

class ProduccionOut(ProduccionBase):
    id_inventario: int
    nombre_lote: str
    nombre_categoria: str
    nombre_especie: str
    simbolo: str

class PaginatedProducciones(BaseModel):
    page: int
    page_size: int
    total_producciones: int
    total_pages: int
    produccion: list[ProduccionOut]