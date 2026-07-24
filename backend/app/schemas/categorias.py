from pydantic import BaseModel, Field
from typing import Optional

# Aquí se define el schema para las categorías, incluyendo la creación, actualización y salida de datos.

class CategoriaBase(BaseModel):
    nombre_categoria: str = Field(max_length=25)
   
class CategoriaCreate(CategoriaBase):
    pass

class CategoriaUpdate(BaseModel):
    nombre_categoria: Optional[str] = Field(default=None, max_length=25)

class CategoriaOut(CategoriaBase):
    id_categoria: int

class PaginatedCategorias(BaseModel):
    page: int
    page_size: int
    total_categorias: int
    total_pages: int
    categorias: list[CategoriaOut]
