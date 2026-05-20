from pydantic import BaseModel, Field
from typing import Optional

class CategoriaBase(BaseModel):
    nombre_categoria: str = Field(max_length=25)
   
class CategoriaCreate(CategoriaBase):
    pass

class CategoriaUpdate(BaseModel):
    nombre_categoria: Optional[str] = Field(default=None, max_length=25)

class CategoriaOut(CategoriaBase):
    id_categoria: int
