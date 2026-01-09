"""ChromaDB vector store for embeddings."""

import contextlib
from functools import lru_cache

import chromadb
from chromadb.config import Settings as ChromaSettings

from src.backend.config import settings


@lru_cache(maxsize=1)
def get_chroma_client() -> chromadb.PersistentClient:
    """Get the ChromaDB client (cached singleton)."""
    return chromadb.PersistentClient(
        path=settings.chroma_persist_directory,
        settings=ChromaSettings(anonymized_telemetry=False),
    )


def get_collection(notebook_id: str) -> chromadb.Collection:
    """Get or create a collection for a notebook."""
    client = get_chroma_client()
    return client.get_or_create_collection(
        name=f"notebook_{notebook_id}",
        metadata={"hnsw:space": "cosine"},
    )


def add_chunks_to_collection(
    notebook_id: str,
    chunk_ids: list[str],
    embeddings: list[list[float]],
    documents: list[str],
    metadatas: list[dict],
) -> None:
    """Add chunks with embeddings to a notebook collection."""
    collection = get_collection(notebook_id)
    collection.add(
        ids=chunk_ids,
        embeddings=embeddings,
        documents=documents,
        metadatas=metadatas,
    )


def search_collection(
    notebook_id: str,
    query_embedding: list[float],
    n_results: int = 5,
    document_ids: list[str] | None = None,
) -> dict:
    """Search for similar chunks in a notebook collection.

    Args:
        notebook_id: The notebook to search in.
        query_embedding: The query embedding vector.
        n_results: Maximum number of results to return.
        document_ids: Optional list of document IDs to filter by.
            If provided, only chunks from these documents will be returned.
    """
    collection = get_collection(notebook_id)

    # Build where filter for document_ids
    where_filter = None
    if document_ids:
        where_filter = {"document_id": {"$in": document_ids}}

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=n_results,
        include=["documents", "metadatas", "distances"],
        where=where_filter,
    )
    return results


def delete_collection(notebook_id: str) -> None:
    """Delete a notebook's collection."""
    client = get_chroma_client()
    with contextlib.suppress(ValueError):
        client.delete_collection(f"notebook_{notebook_id}")


def delete_chunks_from_collection(
    notebook_id: str,
    chunk_ids: list[str],
) -> None:
    """Delete specific chunks from a collection."""
    collection = get_collection(notebook_id)
    collection.delete(ids=chunk_ids)
