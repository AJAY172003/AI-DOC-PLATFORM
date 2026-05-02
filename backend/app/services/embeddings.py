"""Embedding generation using Gemini gemini-embedding-2-preview."""

import google.generativeai as genai
from app.config import get_settings

settings = get_settings()
genai.configure(api_key=settings.gemini_api_key)


def generate_embedding(text: str) -> list[float]:
    """Generate a single embedding vector."""
    result = genai.embed_content(
        model=f"models/{settings.gemini_embedding_model}",
        content=text,
        task_type="retrieval_document",
    )
    return result["embedding"]


def generate_query_embedding(text: str) -> list[float]:
    """Generate embedding optimized for search queries."""
    result = genai.embed_content(
        model=f"models/{settings.gemini_embedding_model}",
        content=text,
        task_type="retrieval_query",
    )
    return result["embedding"]


def generate_embeddings_batch(texts: list[str]) -> list[list[float]]:
    """Generate embeddings one by one (gemini-embedding-2-preview doesn't support batch)."""
    embeddings = []
    for text in texts:
        result = genai.embed_content(
            model=f"models/{settings.gemini_embedding_model}",
            content=text,
            task_type="retrieval_document",
        )
        embeddings.append(result["embedding"])
    return embeddings
