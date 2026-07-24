from pydantic import BaseModel, Field
from typing import Optional

# Aquí se define el schema para los tipos de insumos, incluyendo la creación, actualización y salida de datos.

class Tipo_insumoBase(BaseModel):
    nombre_tipo: str = Field(max_length=25)
   
class Tipo_insumoCreate(Tipo_insumoBase):
    pass

class Tipo_insumoUpdate(BaseModel):
    nombre_tipo: Optional[str] = Field(default=None, max_length=25)

class Tipo_insumoOut(Tipo_insumoBase):
    id_tipo_insumo: int
