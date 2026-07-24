from pydantic import BaseModel, Field
from typing import Optional, List

# Aquí se define el schema para las especies, incluyendo la creación, actualización y salida de datos.

class EspecieBase(BaseModel):
    nombre_especie: str = Field(max_length=25)
    descripcion: Optional[str] = Field(default=None, max_length=255)
   
class EspecieCreate(EspecieBase):
    pass

class EspecieUpdate(BaseModel):
    nombre_especie: Optional[str] = Field(default=None, max_length=25)
    descripcion: Optional[str] = Field(default=None, max_length=255)

class EspecieOut(EspecieBase):
    id_especie: int

class PaginatedEspecies(BaseModel):
    page: int
    page_size: int
    total_especies: int
    total_pages: int
    especies: List[EspecieOut]
