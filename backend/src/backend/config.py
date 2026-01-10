from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    database_url: str = "sqlite+aiosqlite:///./data/onotebook.db"

    # CORS
    cors_origins: str = "http://localhost:3000"

    # Ollama
    ollama_base_url: str = "http://localhost:11434"
    ollama_timeout: int = 300
    default_llm_model: str = "llama3.2"

    # Storage
    chroma_persist_directory: str = "./data/chroma"
    upload_directory: str = "./data/uploads"

    # Embedding
    embedding_model: str = "BAAI/bge-small-en-v1.5"

    # Chunking
    chunk_size: int = 512
    chunk_overlap: int = 50

    # Limits
    max_upload_size_mb: int = 50
    max_sources_per_notebook: int = 50

    # Source extraction
    url_extraction_timeout: int = 30
    max_url_content_size_mb: int = 10

    # Web search - Tavily (optional)
    tavily_api_key: str | None = None
    search_results_per_query: int = 10

    # Source guide
    source_guide_max_chunks: int = 10

    # App
    app_version: str = "0.1.0"

    model_config = {"env_file": ".env", "extra": "ignore"}

    @property
    def data_directory(self) -> Path:
        return Path("./data")

    @property
    def max_upload_size_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024


settings = Settings()
