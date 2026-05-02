"""Agent route — agentic Q&A with tool orchestration."""

from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.models.db import get_db
from app.services.agent import run_agent

router = APIRouter(prefix="/agent", tags=["agent"])


class AgentRequest(BaseModel):
    question: str
    document_ids: list[UUID] | None = None


class ToolCall(BaseModel):
    tool: str
    input: str


class AgentResponse(BaseModel):
    answer: str
    tool_calls: list[ToolCall]
    is_report: bool
    latency_ms: float


@router.post("/", response_model=AgentResponse)
def agent_chat(request: AgentRequest, db: Session = Depends(get_db)):
    """
    Agentic Q&A endpoint. The agent decides which tools to use:
    - search_documents: semantic vector search
    - summarize_document: full document/topic summary
    - compare_documents: side-by-side comparison
    - export_report: generate a structured markdown report
    """
    result = run_agent(
        db=db,
        question=request.question,
        document_ids=request.document_ids,
    )

    return AgentResponse(
        answer=result["answer"],
        tool_calls=[ToolCall(**tc) for tc in result["tool_calls"]],
        is_report=result["is_report"],
        latency_ms=result["latency_ms"],
    )
