"""YouTube transcript extraction using youtube-transcript-api."""

import re

import httpx
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import NoTranscriptFound, TranscriptsDisabled

from src.backend.sources.extractors.url import ExtractionResult


def extract_video_id(url: str) -> str:
    """Extract video ID from various YouTube URL formats."""
    patterns = [
        r"(?:v=|/v/|youtu\.be/|/embed/)([a-zA-Z0-9_-]{11})",
        r"^([a-zA-Z0-9_-]{11})$",  # Just the ID itself
    ]
    for pattern in patterns:
        match = re.search(pattern, str(url))
        if match:
            return match.group(1)
    raise ValueError(f"Could not extract video ID from URL: {url}")


async def get_video_title(video_id: str) -> str:
    """Get video title via oembed API."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            oembed_url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
            response = await client.get(oembed_url)
            if response.status_code == 200:
                data = response.json()
                return data.get("title", f"YouTube Video {video_id}")
    except Exception:
        pass
    return f"YouTube Video {video_id}"


TRANSCRIPT_LANGUAGES = ["en", "es", "fr", "de", "pt", "ja", "ko", "zh", "hi", "ar"]


def get_transcript(video_id: str) -> tuple[str, float | None]:
    """
    Get transcript from YouTube video, trying multiple languages.

    Returns tuple of (transcript_text, duration_seconds)
    """
    try:
        api = YouTubeTranscriptApi()
        transcript = api.fetch(video_id, languages=TRANSCRIPT_LANGUAGES)

        # Combine transcript snippets
        text_parts = []
        duration = None
        for snippet in transcript.snippets:
            text = snippet.text.strip()
            if text:
                text_parts.append(text)
            # Track duration from last snippet
            duration = snippet.start + snippet.duration

        full_text = " ".join(text_parts)
        return full_text, duration

    except TranscriptsDisabled as e:
        raise ValueError("Transcripts are disabled for this video") from e
    except NoTranscriptFound as e:
        raise ValueError("No transcript available for this video") from e


async def extract_youtube_content(url: str) -> ExtractionResult:
    """
    Extract transcript from YouTube video.

    Pipeline:
    1. Parse video ID from URL
    2. Fetch available transcripts (prefer manual > auto-generated)
    3. Concatenate transcript segments
    4. Get video metadata via oembed API
    """
    video_id = extract_video_id(url)

    # Get transcript (sync operation, but fast)
    transcript_text, duration = get_transcript(video_id)

    if not transcript_text or len(transcript_text.strip()) < 50:
        raise ValueError("Transcript is too short or empty")

    title = await get_video_title(video_id)

    return ExtractionResult(
        title=title[:255],
        content=transcript_text,
        source_url=str(url),
        content_size=len(transcript_text.encode("utf-8")),
        video_id=video_id,
        duration_seconds=duration,
    )
