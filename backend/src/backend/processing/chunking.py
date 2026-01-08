"""Text chunking service."""

from typing import NamedTuple

from langchain_text_splitters import RecursiveCharacterTextSplitter
import tiktoken

from src.backend.config import settings


class ChunkData(NamedTuple):
    content: str
    token_count: int


def count_tokens(text: str) -> int:
    """Count tokens using tiktoken (cl100k_base encoding)."""
    encoding = tiktoken.get_encoding("cl100k_base")
    return len(encoding.encode(text))


def chunk_text(text: str) -> list[ChunkData]:
    """Split text into chunks with token counts."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
        length_function=count_tokens,
        separators=["\n\n", "\n", ". ", " ", ""],
    )

    chunks = splitter.split_text(text)

    return [
        ChunkData(content=chunk, token_count=count_tokens(chunk))
        for chunk in chunks
    ]
