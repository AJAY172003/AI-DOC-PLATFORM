"""
Basic unit tests — chunking, guardrails, schema validation.
Run: pytest backend/tests/ -v
"""

import pytest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

# ── Chunking tests ──────────────────────────────────────────────────────────

def test_chunk_basic():
    from app.utils.chunking import chunk_text
    text = "Hello world. " * 100
    chunks = chunk_text(text, chunk_size=100, chunk_overlap=10)
    assert len(chunks) > 1
    assert all("content" in c for c in chunks)
    assert all("chunk_index" in c for c in chunks)


def test_chunk_empty():
    from app.utils.chunking import chunk_text
    chunks = chunk_text("", chunk_size=100)
    assert chunks == []


def test_chunk_short():
    from app.utils.chunking import chunk_text
    text = "Short text."
    chunks = chunk_text(text, chunk_size=500)
    assert len(chunks) == 1
    assert chunks[0]["content"] == text


def test_chunk_indices_sequential():
    from app.utils.chunking import chunk_text
    text = "word " * 300
    chunks = chunk_text(text, chunk_size=100, chunk_overlap=10)
    indices = [c["chunk_index"] for c in chunks]
    assert indices == list(range(len(chunks)))


def test_estimate_tokens():
    from app.utils.chunking import estimate_tokens
    text = "hello world " * 100
    tokens = estimate_tokens(text)
    assert tokens > 0
    assert isinstance(tokens, int)


# ── Schema validation tests ──────────────────────────────────────────────────

def test_guardrail_result_schema():
    from app.models.schemas import GuardrailResult
    g = GuardrailResult(
        relevance_score=0.85,
        is_grounded=True,
        safety_flagged=False,
        explanation="Answer is well grounded.",
    )
    assert g.relevance_score == 0.85
    assert g.is_grounded is True
    assert g.safety_flagged is False


def test_source_chunk_schema():
    from app.models.schemas import SourceChunk
    import uuid
    s = SourceChunk(
        chunk_id=uuid.uuid4(),
        document_id=uuid.uuid4(),
        filename="test.pdf",
        content="Some content here.",
        page_number=1,
        similarity_score=0.92,
    )
    assert s.filename == "test.pdf"
    assert 0 <= s.similarity_score <= 1


# ── Guardrail logic tests ────────────────────────────────────────────────────

def test_safety_check_clean():
    from app.services.guardrails import check_safety
    result = check_safety("The document discusses quarterly revenue growth.")
    assert result["is_safe"] is True
    assert result["has_hallucination_signals"] is False


def test_safety_check_hallucination_signal():
    from app.services.guardrails import check_safety
    result = check_safety("I'm not sure but I think the answer might be 42.")
    assert result["has_hallucination_signals"] is True


def test_safety_check_flags_list():
    from app.services.guardrails import check_safety
    result = check_safety("A completely normal business document.")
    assert isinstance(result["flags"], list)
