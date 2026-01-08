from typing import Optional

from pydantic import BaseModel


class SettingsResponse(BaseModel):
    theme: str
    default_model: str
    ollama_url: str
    top_k: int
    temperature: float


class SettingsUpdate(BaseModel):
    theme: Optional[str] = None
    default_model: Optional[str] = None
    ollama_url: Optional[str] = None
    top_k: Optional[int] = None
    temperature: Optional[float] = None
