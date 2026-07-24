from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum 
from datetime import date

# Aquí se define el schema para la solicitud de insumos, incluyendo la creación, actualización y salida de datos.

class SolicitudStatus(str, Enum):
    pendiente = "pendiente"
    autorizado = "autorizado"
    entregado = "entregado"
    cancelado = "cancelado"
    devuelto = "devuelto"

class SolicitudBase(BaseModel):
    solicitante: str = Field(min_length=1, max_length=100)
    ficha: str = Field(min_length=1, max_length=10)
    insumo_id: int = Field(ge=0)
    cantidad_in: int = Field(gt=0)
    unid_med_id: int
    fecha_solicitud: date
    tipo_insumo_id: int = Field(gt=0)
    estado_solicitud: SolicitudStatus

class SolicitudCreate(SolicitudBase):
    pass

class SolicitudUpdate(BaseModel):
    solicitante: Optional[str] = None
    ficha: Optional[str] = None
    insumo_id: Optional[int] = None
    cantidad_in: Optional[int] = None
    unid_med_id: Optional[int] = None
    fecha_solicitud: Optional[date] = None
    fecha_entrega: Optional[date] = None
    fecha_devolucion: Optional[date] = None
    cant_devolver: Optional[int] = None
    tipo_insumo_id: Optional[int] = None
    estado_solicitud: Optional[SolicitudStatus] = None

class SolicitudOut(SolicitudBase):
    id_solicitud: int
    nombre_tipo: str
    simbolo: Optional[str] = None
    nombre_producto: Optional[str] = None
    user_id: int
    nombre_user: Optional[str] = None
    cant_devolver: Optional[int] = None

class PaginatedSolicitudes(BaseModel):
    page: int
    page_size: int
    total_solicitudes: int
    total_pages: int
    solicitudes: list[SolicitudOut]