from fastapi import APIRouter, Depends
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.models.db import ChatMessage, Document, DocumentChunk, LLMMetric, get_db
from app.models.schemas import MetricEntry, MetricsSummary

router = APIRouter(prefix="/metrics", tags=["metrics"])


@router.get("/summary", response_model=MetricsSummary)
def get_metrics_summary(db: Session = Depends(get_db)):
    total_queries = db.query(func.count(LLMMetric.id)).scalar() or 0
    total_tokens = db.query(func.sum(LLMMetric.total_tokens)).scalar() or 0
    total_cost = db.query(func.sum(LLMMetric.estimated_cost)).scalar() or 0
    avg_latency = db.query(func.avg(LLMMetric.latency_ms)).scalar() or 0
    docs_count = db.query(func.count(Document.id)).scalar() or 0
    chunks_count = db.query(func.count(DocumentChunk.id)).scalar() or 0
    avg_relevance = db.query(func.avg(ChatMessage.relevance_score)).filter(
        ChatMessage.role == "assistant",
        ChatMessage.relevance_score != None,
    ).scalar()

    return MetricsSummary(
        total_queries=total_queries,
        total_tokens=int(total_tokens),
        total_cost=round(float(total_cost), 6),
        avg_latency_ms=round(float(avg_latency), 2),
        documents_count=docs_count,
        chunks_count=chunks_count,
        avg_relevance_score=round(float(avg_relevance), 3) if avg_relevance else None,
        grounded_percentage=None,
    )


@router.get("/recent", response_model=list[MetricEntry])
def get_recent_metrics(limit: int = 50, db: Session = Depends(get_db)):
    return (
        db.query(LLMMetric)
        .order_by(LLMMetric.created_at.desc())
        .limit(limit)
        .all()
    )
