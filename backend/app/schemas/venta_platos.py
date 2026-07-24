import datetime
from pydantic import BaseModel
from typing import Optional

# Aquí se define el schema para la venta de platos, incluyendo la creación, actualización y salida de datos.

class VentaPlatoBase(BaseModel):
    plato_id: int
    cantidad: int
    precio: float
    fecha_venta: datetime.date

class VentaPlatoCreate(VentaPlatoBase):
    pass

class VentaPlatoUpdate(BaseModel):
    plato_id: Optional[int] = None
    cantidad: Optional[int] = None
    precio: Optional[float] = None
    fecha_venta: Optional[datetime.date] = None

class VentaPlatoOut(VentaPlatoBase):
    id_venta_plato: int
    nombre_plato: str

class VentaPlatosPaginated(BaseModel):
    page: int
    page_size: int
    total_ventaPlatos: int
    total_pages: int
    ventaPlatos: list[VentaPlatoOut]