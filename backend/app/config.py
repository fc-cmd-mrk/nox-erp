"""
NOX ERP Configuration
"""
import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Application
    APP_NAME: str = "NOX ERP"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = "sqlite:///./nox_erp.db"
    
    # JWT Settings
    SECRET_KEY: str = "nox-erp-super-secret-key-change-in-production-2024"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # CORS
    CORS_ORIGINS: list = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"]
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()

