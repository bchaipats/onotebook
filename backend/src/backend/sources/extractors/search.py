"""Web search integration using Tavily API."""

from dataclasses import dataclass
from uuid import uuid4

import httpx

from src.backend.config import settings


@dataclass
class SearchResult:
    id: str
    title: str
    url: str
    snippet: str
    favicon_url: str | None = None


async def search_web(query: str, mode: str = "fast") -> list[SearchResult]:
    """
    Search the web using Tavily API.

    Args:
        query: Search query string
        mode: "fast" for basic search, "deep" for advanced search with more results

    Returns:
        List of SearchResult objects
    """
    if not settings.tavily_api_key:
        raise ValueError("Web search is not configured. Set TAVILY_API_KEY environment variable.")

    is_deep = mode == "deep"
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            "https://api.tavily.com/search",
            json={
                "api_key": settings.tavily_api_key,
                "query": query,
                "search_depth": "advanced" if is_deep else "basic",
                "max_results": 20 if is_deep else 10,
                "include_raw_content": False,
                "include_answer": False,
            },
        )
        response.raise_for_status()
        data = response.json()

    results = []
    for item in data.get("results", []):
        url = item.get("url", "")
        if not url:
            continue

        results.append(
            SearchResult(
                id=str(uuid4()),
                title=item.get("title", "Untitled"),
                url=url,
                snippet=item.get("content", "")[:500],
            )
        )

    return results
