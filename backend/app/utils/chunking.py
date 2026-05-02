"""Text chunking strategies for document ingestion."""


def chunk_text(
    text: str,
    chunk_size: int = 500,
    chunk_overlap: int = 50,
) -> list[dict]:
    """
    Split text into overlapping chunks by character count.
    Returns list of dicts with 'content' and 'chunk_index'.
    """
    if not text.strip():
        return []

    chunks = []
    start = 0
    chunk_index = 0

    while start < len(text):
        end = start + chunk_size

        # Try to break at sentence boundary
        if end < len(text):
            # Look for the last period, newline, or sentence-ending punctuation
            for sep in [". ", ".\n", "\n\n", "\n", "? ", "! "]:
                last_sep = text[start:end].rfind(sep)
                if last_sep != -1:
                    end = start + last_sep + len(sep)
                    break

        chunk_content = text[start:end].strip()

        if chunk_content:
            chunks.append({
                "content": chunk_content,
                "chunk_index": chunk_index,
            })
            chunk_index += 1

        start = end - chunk_overlap
        if start >= len(text):
            break

    return chunks


def estimate_tokens(text: str) -> int:
    """Rough token estimate: ~4 chars per token for English."""
    return len(text) // 4
