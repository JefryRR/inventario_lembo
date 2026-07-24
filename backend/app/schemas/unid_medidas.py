from pydantic import BaseModel, Field
from typing import Optional

# Aquí se define el schema para las unidades de medida, incluyendo la creación, actualización y salida de datos.

class Unid_medBase(BaseModel):
    unidad: str = Field(max_length=25)
    simbolo: str = Field(max_length=10)
    conversion: float
    tipo_unidad: str = Field(max_length=45)
   
class Unid_medCreate(Unid_medBase):
    pass

class Unid_medUpdate(BaseModel):
    unidad: Optional[str] = Field(default=None, max_length=25)
    simbolo: Optional[str] = Field(default=None, max_length=10)
    conversion: Optional[float] = None
    tipo_unidad: Optional[str] = Field(default=None, max_length=45)
    
class Unid_medOut(Unid_medBase):
    id_unidad: int
