from pydantic import BaseModel, Field # type: ignore
from typing import Optional
from datetime import datetime
from enum import Enum

class MotivoDevolucion(str, Enum):
    daño = "Daño"
    error_pedido = "Error de pedido"

class DevolucionBase(BaseModel):
    id_detalle_venta: int
    cant_devolucion: int
    unid_medida_id: int
    venta_id: int
    motivo: MotivoDevolucion
    fecha_dev: datetime
    user_id: int
    observacion: Optional[str] = Field(default=None, min_length=3, max_length=255)

class DevolucionCreate(DevolucionBase):
    pass

class DevolucionUpdate(BaseModel):  
    cant_devolucion: Optional[int] = None
    motivo: Optional[MotivoDevolucion] = None
    observacion: Optional[str] = Field(default=None, min_length=3, max_length=255)

class DevolucionOut(DevolucionBase):
    id_devolucion: int
    nombre_producto: str
    nombre_comprador: str
    nombre_user: str
    simbolo: str

class PaginatedDevoluciones(BaseModel):
    page: int
    page_size: int
    total_devoluciones: int
    total_pages: int
    devoluciones: list[DevolucionOut]