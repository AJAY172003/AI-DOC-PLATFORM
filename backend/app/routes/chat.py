"""Chat routes — RAG-powered Q&A with guardrails and source citations."""

import json
import logging

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.models.db import ChatMessage, get_db
from app.models.schemas import ChatRequest, ChatResponse, GuardrailResult
from app.services.guardrails import run_guardrails
from app.services.llm import generate_response
from app.services.retrieval import retrieve_similar_chunks

router = APIRouter(prefix="/chat", tags=["chat"])
logger = logging.getLogger(__name__)

RAG_SYSTEM_PROMPT = """You are a helpful document assistant. Answer the user's question
based ONLY on the provided context. If the context doesn't contain enough information
to answer, say so clearly — do not make up information.

Rules:
1. Only use information from the provided context
2. Reference sources by document name and page when available
3. Be concise and direct
4. If unsure, say "Based on the available documents, I cannot fully answer this"
"""


@router.post("/", response_model=ChatResponse)
def chat(request: ChatRequest, db: Session = Depends(get_db)):
    """RAG Q&A — retrieves chunks, generates answer, runs guardrails."""

    # 1. Vector search for relevant chunks
    sources = retrieve_similar_chunks(
        db=db,
        query=request.question,
        document_ids=request.document_ids,
    )

    if not sources:
        return ChatResponse(
            answer="No relevant documents found. Please upload some documents first.",
            sources=[],
            tokens_used=0,
            latency_ms=0,
            guardrail=None,
        )

    # 2. Build context from retrieved chunks
    context_parts = []
    for i, source in enumerate(sources):
        page_info = f" (Page {source.page_number})" if source.page_number else ""
        context_parts.append(
            f"[Source {i+1}: {source.filename}{page_info}]\n{source.content}"
        )
    context = "\n\n---\n\n".join(context_parts)

    # 3. Build prompt and generate response
    prompt = f"""Context from uploaded documents:

{context}

---

Question: {request.question}

Answer based only on the context above. Reference your sources."""

    result = generate_response(
        prompt=prompt,
        system_instruction=RAG_SYSTEM_PROMPT,
        db=db,
        operation="rag_chat",
    )
    answer = result["text"]

    # 4. Run guardrails on the response
    guardrail_data = run_guardrails(
        question=request.question,
        context=context,
        answer=answer,
    )
    guardrail = GuardrailResult(
        relevance_score=guardrail_data["relevance_score"],
        is_grounded=guardrail_data["is_grounded"],
        safety_flagged=guardrail_data["safety_flagged"],
        explanation=guardrail_data["explanation"],
    )

    # Log any quality issues
    if not guardrail.is_grounded:
        logger.warning(f"Low grounding detected for query: '{request.question[:60]}'")
    if guardrail.safety_flagged:
        logger.warning(f"Safety flag triggered for query: '{request.question[:60]}'")

    # 5. Save chat messages with guardrail metadata
    user_msg = ChatMessage(role="user", content=request.question)
    assistant_msg = ChatMessage(
        role="assistant",
        content=answer,
        sources=json.dumps([str(s.chunk_id) for s in sources]),
        relevance_score=guardrail.relevance_score,
        is_grounded=guardrail.is_grounded,
        safety_flagged=guardrail.safety_flagged,
    )
    db.add_all([user_msg, assistant_msg])
    db.commit()

    return ChatResponse(
        answer=answer,
        sources=sources,
        tokens_used=result["total_tokens"],
        latency_ms=result["latency_ms"],
        guardrail=guardrail,
    )
