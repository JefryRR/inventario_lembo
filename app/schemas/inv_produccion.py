from pydantic import BaseModel, Field # type: ignore
from typing import Optional
from datetime import datetime

class ProduccionBase(BaseModel):
    id_inventario: int
    cantidad: int
    fecha_ingreso: datetime
    fecha_vencimiento: datetime
    lote_id: int
    valor_unitario: float
    categoria_id: int
    especie_id: int

class ProduccionCreate(ProduccionBase):
    pass

class ProduccionUpdate(BaseModel):
    id_inventario: Optional[int] = None
    cantidad: Optional[int] = None
    fecha_ingreso: Optional[datetime] = None
    fecha_vencimiento: Optional[datetime] = None
    lote_id: Optional[int] = None
    valor_unitario: Optional[float] = None
    categoria_id: Optional[int] = None
    especie_id: Optional[int] = None

class ProduccionOut(ProduccionBase):
    id_produccion: int
    nombre_lote: str
    nombre_producto: str
    nombre_categoria: str
    nombre_especie: str

class PaginatedProducciones(BaseModel):
    page: int
    page_size: int
    total_producciones: int
    total_pages: int
    producciones: list[ProduccionOut]