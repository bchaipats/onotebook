from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class DocumentResponse(BaseModel):
    id: str
    notebook_id: str
    filename: str
    file_type: str
    file_size: int
    page_count: Optional[int]
    chunk_count: int
    processing_status: str
    processing_progress: int
    processing_error: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class DocumentListResponse(BaseModel):
    documents: list[DocumentResponse]


class ChunkResponse(BaseModel):
    id: str
    chunk_index: int
    content: str
    token_count: int
    page_number: Optional[int]

    model_config = {"from_attributes": True}


class ChunkListResponse(BaseModel):
    chunks: list[ChunkResponse]


class SearchRequest(BaseModel):
    query: str
    top_k: int = 5


class SearchResult(BaseModel):
    chunk_id: str
    document_id: str
    document_name: str
    content: str
    chunk_index: int
    token_count: int
    relevance_score: float


class SearchResponse(BaseModel):
    results: list[SearchResult]
