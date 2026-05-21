from pydantic import BaseModel, Field # type: ignore
from typing import Optional
from enum import Enum

class EstadoVenta(str, Enum):
    vendido = "Vendido"
    devuelto = "Devuelto"
    separado = "Separado"
    cancelado = "Cancelado"

class DetalleVentaBase(BaseModel):
    nombre_producto: str = Field(min_length=3, max_length=25)
    cantidad: int
    unid_medida_id:int 
    precio_venta: float
    inv_prod_id: int
    venta_id: int
    estado_venta: EstadoVenta

class DetalleVentaCreate(DetalleVentaBase):
    pass

class DetalleVentaUpdate(BaseModel):
    nombre_producto: Optional[str] = Field(default=None, min_length=3, max_length=25)
    cantidad: Optional[int] = None
    unid_medida: Optional[int] = None
    precio_venta: Optional[float] = Field(default=None)
    estado_venta: Optional[EstadoVenta] = None

class DetalleVentaOut(DetalleVentaBase):
    id_detalle_venta: int
    nombre_comprador: str
    simbolo: str

class PaginatedDetalleVentas(BaseModel):
    page: int
    page_size: int
    total_detalles: int
    total_pages: int
    detalles: list[DetalleVentaOut]