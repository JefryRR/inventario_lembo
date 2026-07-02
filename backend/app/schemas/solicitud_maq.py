from enum import Enum
from pydantic import BaseModel, Field
from typing import Optional
from datetime import date

class EstadoSolicitud(str, Enum):
    pendiente = 'pendiente'
    entregada = 'entregada'
    devuelta = 'devuelta'
    cancelada = 'cancelada'
   
class SolicitudMaqBase(BaseModel):
    maquinaria_id: int
    user_id: int
    fecha_solicitud: date
    estado: EstadoSolicitud
    observaciones: Optional[str] = Field(None, max_length=500)

class SolicitudMaqCreate(SolicitudMaqBase):
    pass

class SolicitudMaqUpdate(BaseModel):
    maquinaria_id: Optional[int] = None
    user_id: Optional[int] = None
    fecha_entrega: Optional[date] = None
    fecha_devolucion: Optional[date] = None
    estado: Optional[EstadoSolicitud] = None
    observaciones: Optional[str] = Field(None, min_length=1, max_length=500)

class SolicitudMaqOut(SolicitudMaqBase):
    id_solicitud_maq: int
    nombre_maq: str
    nombre_user: str
    fecha_entrega: Optional[date] = None
    fecha_devolucion: Optional[date] = None
    
class PaginatedSolicitudes(BaseModel):
    page: int
    page_size: int
    total_solicitudes: int
    total_pages: int
    solicitudes: list[SolicitudMaqOut]