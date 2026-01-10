"""Website content extraction using trafilatura."""

from dataclasses import dataclass

import httpx
from bs4 import BeautifulSoup
from trafilatura import extract

from src.backend.config import settings


@dataclass
class ExtractionResult:
    title: str
    content: str
    source_url: str
    content_size: int
    video_id: str | None = None
    duration_seconds: float | None = None


def extract_title_from_html(html: str, url: str) -> str:
    """Extract title from HTML using BeautifulSoup."""
    soup = BeautifulSoup(html, "lxml")

    # Try og:title first
    og_title = soup.find("meta", property="og:title")
    if og_title and og_title.get("content"):
        return str(og_title["content"]).strip()

    # Try twitter:title
    twitter_title = soup.find("meta", attrs={"name": "twitter:title"})
    if twitter_title and twitter_title.get("content"):
        return str(twitter_title["content"]).strip()

    # Fall back to <title> tag
    if soup.title and soup.title.string:
        return soup.title.string.strip()

    # Last resort: use URL
    return url


def extract_content_fallback(soup: BeautifulSoup) -> str:
    """Fallback content extraction using BeautifulSoup."""
    # Remove script, style, nav, header, footer elements
    for element in soup.find_all(["script", "style", "nav", "header", "footer", "aside"]):
        element.decompose()

    # Try to find main content areas
    main_content = soup.find("main") or soup.find("article") or soup.find(id="content")

    if main_content:
        return main_content.get_text(separator="\n", strip=True)

    # Fall back to body
    body = soup.find("body")
    if body:
        return body.get_text(separator="\n", strip=True)

    return soup.get_text(separator="\n", strip=True)


async def extract_url_content(url: str) -> ExtractionResult:
    """
    Extract main content from a URL.

    Pipeline:
    1. Fetch page with httpx (async, follows redirects)
    2. Extract title from <title> or og:title
    3. Use trafilatura to extract main article content
    4. Fall back to BeautifulSoup if trafilatura fails
    5. Clean and normalize text
    """
    timeout = httpx.Timeout(settings.url_extraction_timeout, connect=10.0)
    max_size = settings.max_url_content_size_mb * 1024 * 1024

    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
        response = await client.get(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (compatible; ONotebook/1.0; +https://github.com/onotebook)"
            },
        )
        response.raise_for_status()

        # Check content size
        content_length = response.headers.get("content-length")
        if content_length and int(content_length) > max_size:
            raise ValueError(f"Content too large: {content_length} bytes (max {max_size})")

        html = response.text

    # Check actual content size
    if len(html.encode("utf-8")) > max_size:
        raise ValueError(f"Content too large (max {settings.max_url_content_size_mb}MB)")

    # Extract title
    title = extract_title_from_html(html, url)

    # Extract content using trafilatura
    content = extract(
        html,
        include_comments=False,
        include_tables=True,
        include_links=False,
        include_images=False,
        deduplicate=True,
    )

    # Fallback to BeautifulSoup if trafilatura fails
    if not content or len(content.strip()) < 100:
        soup = BeautifulSoup(html, "lxml")
        content = extract_content_fallback(soup)

    if not content or len(content.strip()) < 50:
        raise ValueError("Could not extract meaningful content from URL")

    # Clean up content
    content = content.strip()

    return ExtractionResult(
        title=title[:255],  # Limit title length
        content=content,
        source_url=str(url),
        content_size=len(content.encode("utf-8")),
    )
