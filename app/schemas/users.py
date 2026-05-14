from pydantic import BaseModel, EmailStr, Field
from typing import Optional

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
    nombre_user: Optional[str] = Field(max_length=25)
    documento: Optional[int] = Field(gt=0)
    tipo_documento: Optional[str] = Field(max_length=20)
    telefono: Optional[str] = Field(max_length=20)
    correo: Optional[EmailStr] = Field(max_length=80)
    rol_id: Optional[int] = None

class UserEstado(BaseModel):
   estado: Optional[bool] = None

class UserOut(UserBase):
   id_user: int
