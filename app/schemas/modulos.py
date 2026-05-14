from pydantic import BaseModel, Field
from typing import Optional, List

# Esquemas para la entidad "Módulos"
class ModuloBase(BaseModel):
    nombre: str = Field(min_length=3, max_length=50)

class ModuloCreate(ModuloBase):
    pass

# Para la actualización, todos los campos son opcionales
class ModuloUpdate(BaseModel):
    nombre: Optional[str] = Field(default=None, min_length=3, max_length=50)

class ModuloOut(ModuloBase):
    id_modulo: int

#Modelo para la paginación  
class PaginatedModulos(BaseModel):
    page: int
    page_size: int
    total_modulos: int
    total_pages: int
    modulos: List[ModuloOut]
