from pydantic import BaseModel, Field # type: ignore
from typing import Optional
from enum import Enum

class EstadoVenta(str, Enum):
    vendido = "Vendido"
    separado = "Separado"
    anulado = "Anulado"

class DetalleVentaBase(BaseModel):
    cantidad: int
    unid_medida_id:int 
    precio_venta: float
    inv_prod_id: int
    venta_id: int
    estado_venta: EstadoVenta

class DetalleVentaCreate(DetalleVentaBase):
    pass

class DetalleVentaUpdate(BaseModel):
    cantidad: Optional[int] = None
    inv_prod_id: Optional[int] = None
    unid_medida_id: Optional[int] = None
    precio_venta: Optional[float] = Field(default=None)

class DetalleVentaOut(DetalleVentaBase):
    cant_convertida: Optional[float] = None
    id_detalle_venta: int
    nombre_producto: str
    nombre_comprador: str
    simbolo: str

class PaginatedDetalleVentas(BaseModel):
    page: int
    page_size: int
    total_detalles: int
    total_pages: int
    detalles: list[DetalleVentaOut]