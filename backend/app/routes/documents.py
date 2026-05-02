"""Document routes — upload, list, delete."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.orm import Session

from app.models.db import Document, get_db
from app.models.schemas import DocumentListItem, DocumentUploadResponse
from app.services.ingestion import ingest_document_sync

router = APIRouter(prefix="/documents", tags=["documents"])

ALLOWED_TYPES = {"pdf", "docx", "txt"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Upload a document — triggers ingestion pipeline."""
    # Validate file type
    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename else ""
    if ext not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: .{ext}. Allowed: {ALLOWED_TYPES}",
        )

    # Read file
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Max 10 MB.")

    # Create document record
    doc = Document(
        id=uuid.uuid4(),
        filename=file.filename,
        file_type=ext,
        file_size=len(file_bytes),
        storage_path=f"uploads/{file.filename}",
        status="processing",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Run ingestion in a threadpool so the synchronous Gemini SDK calls
    # don't block the asyncio event loop (which would otherwise stall
    # *every* other request, including health checks and document list).
    try:
        doc = await run_in_threadpool(
            ingest_document_sync, db, doc.id, file_bytes, ext
        )
    except Exception as e:
        # Mark as failed so the frontend can show the actual reason
        try:
            db.rollback()
            failed = db.query(Document).filter(Document.id == doc.id).first()
            if failed:
                failed.status = "failed"
                db.commit()
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")

    return doc


@router.get("/", response_model=list[DocumentListItem])
def list_documents(db: Session = Depends(get_db)):
    """List all uploaded documents."""
    docs = db.query(Document).order_by(Document.created_at.desc()).all()
    return docs


@router.get("/{document_id}", response_model=DocumentListItem)
def get_document(document_id: uuid.UUID, db: Session = Depends(get_db)):
    """Get a single document by ID."""
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.delete("/{document_id}")
def delete_document(document_id: uuid.UUID, db: Session = Depends(get_db)):
    """Delete a document and all its chunks."""
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    db.delete(doc)
    db.commit()
    return {"message": f"Document '{doc.filename}' deleted"}
