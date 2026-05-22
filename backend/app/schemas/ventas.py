from pydantic import BaseModel, Field # type: ignore
from typing import Optional
from datetime import datetime

class VentasBase(BaseModel):
    nombre_comprador: str = Field(default=None, min_length=3, max_length=25)
    id_comprador: Optional[str] = Field(default=None, min_length=3, max_length=20)
    fecha_venta: datetime
    user_id: int

class VentasCreate(VentasBase):
    pass

class VentasUpdate(BaseModel):
    nombre_comprador: Optional[str] = Field(default=None, min_length=3, max_length=25)
    id_comprador: Optional[str] = Field(default=None, min_length=3, max_length=20)

class VentasOut(VentasBase):
    id_venta: int
    nombre_user: str
    total_venta: Optional[float]

class PaginatedVentas(BaseModel):
    page: int
    page_size: int
    total_ventas: int
    total_pages: int
    ventas: list[VentasOut]