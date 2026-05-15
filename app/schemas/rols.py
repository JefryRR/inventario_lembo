from pydantic import BaseModel, Field
from typing import Optional, List

class RolBase(BaseModel):
    nombre_rol: str = Field(max_length=25)
    descripcion: Optional[str] = Field(max_length=255)
    estado: Optional[bool] = True

class RolCreate(RolBase):
    pass

class RolUpdate(BaseModel):
    nombre_rol: Optional[str] = Field(default=None, max_length=25)
    descripcion: Optional[str] = Field(default=None, max_length=255)

class RolEstado(BaseModel):
    estado: Optional[bool] = None

class RolOut(RolBase):
    id_rol: int
