from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


# ── Document Schemas ──

class DocumentUploadResponse(BaseModel):
    id: UUID
    filename: str
    file_type: str
    file_size: int
    status: str
    total_chunks: int
    created_at: datetime

    class Config:
        from_attributes = True


class DocumentListItem(BaseModel):
    id: UUID
    filename: str
    file_type: str
    file_size: int
    status: str
    total_chunks: int
    created_at: datetime

    class Config:
        from_attributes = True


# ── Chat Schemas ──

class ChatRequest(BaseModel):
    question: str
    document_ids: Optional[list[UUID]] = None


class SourceChunk(BaseModel):
    chunk_id: UUID
    document_id: UUID
    filename: str
    content: str
    page_number: Optional[int]
    similarity_score: float


class GuardrailResult(BaseModel):
    relevance_score: float        # 0.0 - 1.0
    is_grounded: bool             # False = potential hallucination
    safety_flagged: bool          # True = unsafe content detected
    explanation: str


class ChatResponse(BaseModel):
    answer: str
    sources: list[SourceChunk]
    tokens_used: int
    latency_ms: float
    guardrail: Optional[GuardrailResult] = None


# ── Metrics Schemas ──

class MetricsSummary(BaseModel):
    total_queries: int
    total_tokens: int
    total_cost: float
    avg_latency_ms: float
    documents_count: int
    chunks_count: int
    avg_relevance_score: Optional[float] = None
    grounded_percentage: Optional[float] = None


class MetricEntry(BaseModel):
    id: UUID
    operation: str
    model: str
    input_tokens: int
    output_tokens: int
    total_tokens: int
    latency_ms: float
    estimated_cost: float
    created_at: datetime

    class Config:
        from_attributes = True
