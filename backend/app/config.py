import os
from dataclasses import dataclass
from functools import lru_cache


@dataclass
class Settings:
    # Supabase
    supabase_url: str = ""
    supabase_key: str = ""
    database_url: str = ""

    # Gemini
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"
    gemini_embedding_model: str = "gemini-embedding-2-preview"

    # App
    chunk_size: int = 500
    chunk_overlap: int = 50
    embedding_dimensions: int = 768
    max_retrieval_results: int = 5
    cors_origins: str = "*"

    def __post_init__(self):
        self.supabase_url = os.getenv("SUPABASE_URL", self.supabase_url)
        self.supabase_key = os.getenv("SUPABASE_KEY", self.supabase_key)
        self.database_url = os.getenv("DATABASE_URL", self.database_url)
        self.gemini_api_key = os.getenv("GEMINI_API_KEY", self.gemini_api_key)
        self.gemini_model = os.getenv("GEMINI_MODEL", self.gemini_model)
        self.cors_origins = os.getenv("CORS_ORIGINS", self.cors_origins)


@lru_cache()
def get_settings() -> Settings:
    return Settings()
