from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum 
from datetime import datetime

class SolicitudStatus(str, Enum):
    pendiente = "pendiente"
    entregado = "entregado"
    cancelado = "cancelado"

class InsumoBase(BaseModel):
    solicitante: str = Field(min_length=1, max_length=100)
    insumo_id: int = Field(ge=0)
    cantidad_in: int = Field(gt=0)
    unid_med_id: int
    fecha_solicitud: datetime
    tipo_insumo_id: int = Field(gt=0)
    estado_solicitud: SolicitudStatus

class SolicitudCreate(InsumoBase):
    pass

class SolicitudUpdate(BaseModel):
    solicitante: Optional[str] = None
    insumo_id: Optional[int] = None
    cantidad_in: Optional[int] = None
    unid_med_id: Optional[int] = None
    fecha_solicitud: Optional[datetime] = None
    fecha_entrega: Optional[datetime] = None
    tipo_id: Optional[int] = None
    estado_solicitud: Optional[SolicitudStatus] = None

class SolicitudOut(InsumoBase):
    id_solicitud: int
    nombre_tipo: str
    simbolo: Optional[str] = None
    nombre_producto: Optional[str] = None

class PaginatedSolicitudes(BaseModel):
    page: int
    page_size: int
    total_solicitudes: int
    total_pages: int
    solicitudes: list[SolicitudOut]