from datetime import datetime

from pydantic import BaseModel


class ModelInfo(BaseModel):
    name: str
    size: int
    parameter_size: str | None = None
    quantization_level: str | None = None
    modified_at: datetime | None = None
    digest: str | None = None


class ModelListResponse(BaseModel):
    models: list[ModelInfo]


class PullModelRequest(BaseModel):
    name: str


class PullProgress(BaseModel):
    status: str
    digest: str | None = None
    total: int | None = None
    completed: int | None = None
