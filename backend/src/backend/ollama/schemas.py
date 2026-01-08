from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ModelInfo(BaseModel):
    name: str
    size: int
    parameter_size: Optional[str] = None
    quantization_level: Optional[str] = None
    modified_at: Optional[datetime] = None
    digest: Optional[str] = None


class ModelListResponse(BaseModel):
    models: list[ModelInfo]


class PullModelRequest(BaseModel):
    name: str


class PullProgress(BaseModel):
    status: str
    digest: Optional[str] = None
    total: Optional[int] = None
    completed: Optional[int] = None
