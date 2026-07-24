from pydantic import BaseModel, Field
from typing import Optional
from datetime import date

# Aquí se define el schema para las comercializaciones, incluyendo la creación, actualización y salida de datos.

class ComercializacionBase(BaseModel):
	producto_id: int
	lote_id: int
	fecha_comercializacion: date
	cantidad: float
	unid_medida_id: int
	lugar_comercializacion: Optional[str] = Field(default=None, max_length=50)
	observacion: Optional[str] = None
	user_id: Optional[int] = None
	vendio_todo: Optional[bool] = True
	cant_no_vendida: Optional[float] = None
	cant_convertida: Optional[float] = None

class ComercializacionCreate(ComercializacionBase):
	pass

class ComercializacionUpdate(BaseModel):
	producto_id: Optional[int] = None
	lote_id: Optional[int] = None
	fecha_comercializacion: Optional[date] = None
	cantidad: Optional[int] = None
	unid_medida_id: Optional[int] = None
	lugar_comercializacion: Optional[str] = Field(default=None, max_length=50)
	observacion: Optional[str] = None
	user_id: Optional[int] = None
	vendio_todo: Optional[bool] = None
	cant_no_vendida: Optional[float] = None
	cant_convertida: Optional[float] = None


class ComercializacionOut(ComercializacionBase):
	id_comercializacion: int
	nombre_producto: Optional[str] = None
	simbolo: Optional[str] = None
	nombre_user: Optional[str] = None
	sublote: Optional[str] = None
	fecha_vencimiento: Optional[date] = None

class PaginatedComercializaciones(BaseModel):
	page: int
	page_size: int
	total_comercializaciones: int
	total_pages: int
	comercializaciones: list[ComercializacionOut]
