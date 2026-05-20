from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class AlimentoBase(BaseModel):
    lote_id: int = Field(gt=0)
    insumo_id: int = Field(gt=0)
    fecha_alimento: datetime
    cantidad: int = Field(gt=0)
    unidad_medida: str = Field(min_length=1, max_length=50)
    

class AlimentoCreate(AlimentoBase):
    pass

class AlimentoUpdate(BaseModel):
    lote_id: Optional[int] = None
    insumo_id: Optional[int] = None
    cantidad: Optional[int] = None
    unidad_medida: Optional[str] = None

class AlimentoOut(AlimentoBase):
    id_alimento: int
    nombre_producto: str

class PaginatedAlimentos(BaseModel):
    page: int
    page_size: int
    total_alimentos: int
    total_pages: int
    alimentos: list[AlimentoOut]