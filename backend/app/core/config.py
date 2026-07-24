from pydantic_settings import BaseSettings 
import os
from dotenv import load_dotenv 

# librería en Python que permite cargar variables de entorno
load_dotenv()

class Settings(BaseSettings):
  PROJECT_NAME: str = "INVELEMBO"
  PROJECT_VERSION: str = "0.0.1"
  PROJECT_DESCRIPTION: str = "Aplicación para gestionar el inventario del Sena del Lembo"
  # Configuración de la base de datos
  DB_HOST: str = os.getenv("DB_HOST", "localhost")
  DB_PORT: int = int(os.getenv("DB_PORT", "3306"))
  DB_USER: str = os.getenv("DB_USER", "root")
  DB_PASSWORD: str = os.getenv("DB_PASSWORD", "")
  DB_NAME: str = os.getenv("DB_NAME", "")
  GMAIL_USER: str = os.getenv("GMAIL_USER")
  GMAIL_APP_PASSWORD: str = os.getenv("GMAIL_APP_PASSWORD")
  DATABASE_URL: str = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}?ssl_verify_cert=false&ssl_verify_identity=false"

  # Configuración JWT
  jwt_secret: str = os.getenv("JWT_SECRET")
  jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
  jwt_access_token_expire_minutes: int = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
  FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
  class Config:
      env_file = ".env"

settings = Settings()