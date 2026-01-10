from datetime import datetime
from enum import Enum
from typing import Literal

from pydantic import BaseModel, HttpUrl


class SourceType(str, Enum):
    FILE = "file"
    URL = "url"
    YOUTUBE = "youtube"
    PASTE = "paste"


class CreateUrlSource(BaseModel):
    source_type: Literal["url"]
    url: HttpUrl


class CreateYouTubeSource(BaseModel):
    source_type: Literal["youtube"]
    url: HttpUrl


class CreatePasteSource(BaseModel):
    source_type: Literal["paste"]
    title: str
    content: str


CreateSourceRequest = CreateUrlSource | CreateYouTubeSource | CreatePasteSource


class SourceGuideResponse(BaseModel):
    document_id: str
    summary: str | None
    generated_at: datetime | None

    model_config = {"from_attributes": True}


class SourceContentResponse(BaseModel):
    document_id: str
    content: str
    chunk_count: int


class WebSearchRequest(BaseModel):
    query: str
    mode: Literal["fast", "deep"] = "fast"


class SearchResultItem(BaseModel):
    id: str
    title: str
    url: str
    snippet: str
    favicon_url: str | None = None


class WebSearchResponse(BaseModel):
    results: list[SearchResultItem]
    query: str
    mode: str


class AddSearchResultsRequest(BaseModel):
    urls: list[HttpUrl]
