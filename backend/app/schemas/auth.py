from pydantic import BaseModel
from app.schemas.users import UserOut

# Aquí se define el schema para la autenticación.

class ResponseLoggin(BaseModel):
   user: UserOut
   access_token: str
   