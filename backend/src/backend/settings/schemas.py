from pydantic import BaseModel


class SettingsResponse(BaseModel):
    theme: str
    default_model: str
    ollama_url: str
    top_k: int
    temperature: float


class SettingsUpdate(BaseModel):
    theme: str | None = None
    default_model: str | None = None
    ollama_url: str | None = None
    top_k: int | None = None
    temperature: float | None = None
