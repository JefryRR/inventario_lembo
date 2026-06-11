from pydantic import BaseModel, Field  # type: ignore
from typing import Optional
from datetime import datetime

class TratamientoBase(BaseModel):
    lote_id: int = Field(gt=0)
    medicina_id: int = Field(gt=0)
    fecha_inicio: datetime
    fecha_fin: datetime
    cantidad: int = Field(gt=0)
    unid_medida_id: int
    observacion: str

class TratamientoCreate(TratamientoBase):
    pass

class TratamientoUpdate(BaseModel):
    lote_id: Optional[int] = None
    medicina_id: Optional[int] = None
    cantidad: Optional[int] = None
    fecha_fin: Optional[datetime] = None
    unid_medida_id: Optional[int] = None
    observacion: Optional[str] = None

class TratamientoOut(TratamientoBase):
    id_tratamiento: int
    nombre_lote: str
    user_id: Optional[int]
    cant_convertida: Optional[float] = None
    nombre_producto: str
    nombre_user: str
    simbolo: str

class PaginatedTratamientos(BaseModel):
    page: int
    page_size: int
    total_tratamientos: int
    total_pages: int
    tratamientos: list[TratamientoOut]