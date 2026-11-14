import os
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    APP_NAME: str = "CLAVIS"
    APP_TAGLINE: str = "One scan. Multiple threat signals. Smarter protection."
    DEBUG: bool = False
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./clavis.db")
    
    # External Threat Intelligence APIs
    GOOGLE_SAFE_BROWSING_API_KEY: str | None = os.getenv("GOOGLE_SAFE_BROWSING_API_KEY", None)
    URLHAUS_API_KEY: str | None = os.getenv("URLHAUS_API_KEY", None)
    
    # Configurable Risk Thresholds (0-100)
    LOW_THRESHOLD_MAX: int = 24       # 0 - 24: Low
    MEDIUM_THRESHOLD_MAX: int = 49    # 25 - 49: Medium
    HIGH_THRESHOLD_MAX: int = 74      # 50 - 74: High
    CRITICAL_THRESHOLD_MIN: int = 75  # 75 - 100: Critical
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "*"
    ]
    
    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
