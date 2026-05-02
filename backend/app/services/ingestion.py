"""Document ingestion pipeline: parse → chunk → embed → store in pgvector."""

import io
import logging
import time
from uuid import UUID

from pypdf import PdfReader
from docx import Document as DocxDocument
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.db import Document, DocumentChunk
from app.services.embeddings import generate_embeddings_batch
from app.utils.chunking import chunk_text, estimate_tokens

settings = get_settings()
logger = logging.getLogger(__name__)


def parse_pdf(file_bytes: bytes) -> list[dict]:
    """Extract text from PDF, page by page."""
    reader = PdfReader(io.BytesIO(file_bytes))
    pages = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        if text.strip():
            pages.append({"text": text, "page_number": i + 1})
    return pages


def parse_docx(file_bytes: bytes) -> list[dict]:
    """Extract text from DOCX."""
    doc = DocxDocument(io.BytesIO(file_bytes))
    full_text = "\n".join([para.text for para in doc.paragraphs if para.text.strip()])
    return [{"text": full_text, "page_number": None}]


def parse_txt(file_bytes: bytes) -> list[dict]:
    """Extract text from plain text file."""
    text = file_bytes.decode("utf-8", errors="ignore")
    return [{"text": text, "page_number": None}]


PARSERS = {
    "pdf": parse_pdf,
    "docx": parse_docx,
    "txt": parse_txt,
}


def ingest_document_sync(
    db: Session,
    document_id: UUID,
    file_bytes: bytes,
    file_type: str,
) -> Document:
    """
    Synchronous full ingestion pipeline (designed to be run via
    run_in_threadpool so it does not block the asyncio loop):
    1. Parse file → extract text
    2. Chunk text
    3. Generate embeddings via Gemini
    4. Store chunks + vectors in Postgres/pgvector
    """
    t0 = time.time()
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise ValueError(f"Document {document_id} not found")

    try:
        # 1. Parse
        parser = PARSERS.get(file_type)
        if not parser:
            raise ValueError(f"Unsupported file type: {file_type}")

        logger.info(f"[ingest {document_id}] parsing {file_type} ({len(file_bytes)} bytes)")
        pages = parser(file_bytes)
        if not pages:
            raise ValueError("No text content extracted from file")
        logger.info(f"[ingest {document_id}] parsed {len(pages)} page(s) in {time.time()-t0:.2f}s")

        # 2. Chunk
        all_chunks = []
        for page in pages:
            chunks = chunk_text(
                page["text"],
                chunk_size=settings.chunk_size,
                chunk_overlap=settings.chunk_overlap,
            )
            for chunk in chunks:
                chunk["page_number"] = page.get("page_number")
            all_chunks.extend(chunks)

        if not all_chunks:
            raise ValueError("No chunks generated from document")
        logger.info(f"[ingest {document_id}] chunked into {len(all_chunks)} chunk(s)")

        # 3. Generate embeddings in batches
        chunk_texts = [c["content"] for c in all_chunks]
        all_embeddings = []

        batch_size = 100
        n_batches = (len(chunk_texts) + batch_size - 1) // batch_size
        for i in range(0, len(chunk_texts), batch_size):
            batch = chunk_texts[i : i + batch_size]
            t_batch = time.time()
            embeddings = generate_embeddings_batch(batch)
            logger.info(
                f"[ingest {document_id}] embed batch "
                f"{i // batch_size + 1}/{n_batches} "
                f"({len(batch)} chunks) in {time.time()-t_batch:.2f}s"
            )
            all_embeddings.extend(embeddings)

        # 4. Store chunks + embeddings in pgvector
        db_chunks = []
        for i, chunk in enumerate(all_chunks):
            db_chunk = DocumentChunk(
                document_id=document_id,
                chunk_index=chunk["chunk_index"],
                content=chunk["content"],
                embedding=all_embeddings[i],
                page_number=chunk.get("page_number"),
                token_count=estimate_tokens(chunk["content"]),
            )
            db_chunks.append(db_chunk)

        db.add_all(db_chunks)

        # Update document status
        doc.status = "ready"
        doc.total_chunks = len(db_chunks)
        db.commit()
        db.refresh(doc)

        logger.info(
            f"[ingest {document_id}] DONE: {len(db_chunks)} chunks "
            f"in {time.time()-t0:.2f}s"
        )
        return doc

    except Exception as e:
        logger.exception(f"[ingest {document_id}] FAILED: {e}")
        try:
            doc.status = "failed"
            db.commit()
        except Exception:
            db.rollback()
        raise


# Backwards-compatible async wrapper so any other callers keep working.
async def ingest_document(
    db: Session,
    document_id: UUID,
    file_bytes: bytes,
    file_type: str,
) -> Document:
    return ingest_document_sync(db, document_id, file_bytes, file_type)
