from pydantic import BaseModel, EmailStr

# Aquí se define el schema para la recuperación de contraseña, incluyendo la solicitud de restablecimiento y la actualización de la contraseña.

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str