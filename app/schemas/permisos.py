from pydantic import BaseModel
from typing import Optional, List

# Esquemas base para Permisos
class PermisoBase(BaseModel):
    id_modulo: int
    id_rol: int
    insertar: bool
    actualizar: bool
    seleccionar: bool
    borrar: bool

class PermisoCreate(PermisoBase):
    pass

# Esquema para actualizar permisos, con campos opcionales
class PermisoUpdate(BaseModel):
    insertar: Optional[bool] = None
    actualizar: Optional[bool] = None
    seleccionar: Optional[bool] = None
    borrar: Optional[bool] = None

# Esquema de salida para Permisos, muestra los nombres de módulo y rol
class PermisoOut(PermisoBase):
    nombre_modulo: str
    nombre_rol: str

#Modelo para la paginación  
class PaginatedPermisos(BaseModel):
    page: int
    page_size: int
    total_permisos: int
    total_pages: int
    permisos: List[PermisoOut]
