from pydantic import BaseModel   #type: ignore
from typing import Optional

class IngredienteBase(BaseModel):
    plato_id: int
    origen_inv: int
    inventario_id: int
    cant_inv: float
    cant_conv_inv: float
    unid_med_id: int
   
class IngredienteCreate(IngredienteBase):
    pass

class IngredienteUpdate(BaseModel):
    plato_id: Optional[int] = None
    origen_inv: Optional[int] = None
    inventario_id: Optional[int] = None
    cant_inv: Optional[float] = None
    unid_med_id: Optional[int] = None

class IngredienteOut(IngredienteBase):
    id_ingrediente: int
    nombre_plato: str
    nombre_producto: str
    simbolo: str

class IngredientesPaginated(BaseModel):
    page: int
    page_size: int
    total_ingredientes: int
    total_pages: int
    ingredientes: list[IngredienteOut]