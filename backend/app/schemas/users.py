from app.schemas.permisos import List
from pydantic import BaseModel, EmailStr, Field
from typing import Optional

# Aquí se define el schema para los usuarios, incluyendo la creación, actualización y salida de datos.

class UserBase(BaseModel):
    nombre_user: str = Field(max_length=25)
    documento: int
    tipo_documento: str = Field(max_length=20)
    telefono: str = Field(max_length=20)
    correo: EmailStr = Field(max_length=80)
    estado: bool
    rol_id: int

class UserCreate(UserBase):
   pass_hash: str = Field(min_length=8)

class UserUpdate(BaseModel):
    nombre_user: Optional[str] = Field(default=None, max_length=25)
    documento: Optional[int] = Field(default=None)
    tipo_documento: Optional[str] = Field(default=None, max_length=20)
    telefono: Optional[str] = Field(default=None, max_length=20)
    correo: Optional[EmailStr] = Field(default=None, max_length=80)
    rol_id: Optional[int] = None

class UserEstado(BaseModel):
   estado: Optional[bool] = None

class UserOut(UserBase):
   id_user: int
   nombre_rol: str

class PaginatedUsers(BaseModel):
    page: int
    page_size: int
    total_users: int
    total_pages: int
    users: List[UserOut]
