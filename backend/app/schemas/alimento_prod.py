from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

# Aquí se define el schema para los alimentos, incluyendo la creación, actualización y salida de datos.

class AlimentoBase(BaseModel):
    lote_id: int = Field(gt=0)
    insumo_id: int = Field(gt=0)
    fecha_alimento: datetime
    cantidad: int = Field(gt=0)
    unid_medida_id: int = Field(gt=0)
    

class AlimentoCreate(AlimentoBase):
    pass

class AlimentoUpdate(BaseModel):
    lote_id: Optional[int] = None
    insumo_id: Optional[int] = None
    cantidad: Optional[int] = None
    unid_medida_id: Optional[int] = None

class AlimentoOut(AlimentoBase):
    id_alimento: int
    nombre_producto: str
    cant_convertida: Optional[float] = None
    simbolo: str
    nombre_lote: str

class PaginatedAlimentos(BaseModel):
    page: int
    page_size: int
    total_alimentos: int
    total_pages: int
    alimentos: list[AlimentoOut]