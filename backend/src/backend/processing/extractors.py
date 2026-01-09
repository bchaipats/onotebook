"""Text extraction for different file types."""

from pathlib import Path
from typing import NamedTuple


class ExtractionResult(NamedTuple):
    text: str
    page_count: int | None


def extract_pdf(file_path: Path) -> ExtractionResult:
    """Extract text from PDF using pymupdf4llm."""
    import pymupdf4llm

    # Get markdown text from PDF
    text = pymupdf4llm.to_markdown(str(file_path))

    # Get page count
    import pymupdf

    doc = pymupdf.open(str(file_path))
    page_count = len(doc)
    doc.close()

    return ExtractionResult(text=text, page_count=page_count)


def extract_txt(file_path: Path) -> ExtractionResult:
    """Extract text from plain text file."""
    text = file_path.read_text(encoding="utf-8")
    return ExtractionResult(text=text, page_count=None)


def extract_markdown(file_path: Path) -> ExtractionResult:
    """Extract text from markdown file."""
    text = file_path.read_text(encoding="utf-8")
    return ExtractionResult(text=text, page_count=None)


def extract_docx(file_path: Path) -> ExtractionResult:
    """Extract text from DOCX using python-docx."""
    from docx import Document

    doc = Document(str(file_path))
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    text = "\n\n".join(paragraphs)
    return ExtractionResult(text=text, page_count=None)


def extract_html(file_path: Path) -> ExtractionResult:
    """Extract text from HTML using BeautifulSoup."""
    from bs4 import BeautifulSoup

    html_content = file_path.read_text(encoding="utf-8")
    soup = BeautifulSoup(html_content, "lxml")

    # Remove script and style elements
    for element in soup(["script", "style", "nav", "footer", "header"]):
        element.decompose()

    # Get text
    text = soup.get_text(separator="\n", strip=True)
    return ExtractionResult(text=text, page_count=None)


EXTRACTORS = {
    "pdf": extract_pdf,
    "txt": extract_txt,
    "markdown": extract_markdown,
    "docx": extract_docx,
    "html": extract_html,
}


def extract_text(file_path: Path, file_type: str) -> ExtractionResult:
    """Extract text from a document based on file type."""
    extractor = EXTRACTORS.get(file_type)
    if not extractor:
        raise ValueError(f"Unsupported file type: {file_type}")
    return extractor(file_path)
