import os

class Settings:
    PROJECT_NAME: str = "KeyLens API"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    MAX_FILE_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB
    
    # Default Hybrid Weights
    DEFAULT_WEIGHT_TFIDF: float = 0.35
    DEFAULT_WEIGHT_RAKE: float = 0.30
    DEFAULT_WEIGHT_TEXTRANK: float = 0.35

settings = Settings()
