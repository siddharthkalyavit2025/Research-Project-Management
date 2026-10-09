import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    ORACLE_USER: str = "system"
    ORACLE_PASSWORD: str = "oracle"
    ORACLE_DSN: str = "localhost:1521/XE"
    ORACLE_SCHEMA: str = "SYSTEM"
    ORACLE_CLIENT_DIR: str = "oracle_client/instantclient_19_24"
    
    SECRET_KEY: str = "research_lab_management_jwt_super_secret_key_2026_xyz"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    
    API_PREFIX: str = "/api"
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
    DEBUG: bool = True

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def resolved_client_dir(self) -> str | None:
        if not self.ORACLE_CLIENT_DIR:
            return None
        client_path = BASE_DIR / self.ORACLE_CLIENT_DIR
        if client_path.exists():
            return str(client_path)
        return None

    class Config:
        env_file = str(BASE_DIR / ".env")
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()
