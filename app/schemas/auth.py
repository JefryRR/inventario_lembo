from pydantic import BaseModel
from typing import Optional

from app.schemas.users import UserOut

class ResponseLoggin(BaseModel):
   user: UserOut
   access_token: str
   