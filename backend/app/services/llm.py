"""Gemini LLM wrapper — handles chat completions and structured outputs."""

import google.generativeai as genai
from sqlalchemy.orm import Session

from app.config import get_settings
from app.utils.logging import track_llm_call

settings = get_settings()
genai.configure(api_key=settings.gemini_api_key)


def get_gemini_model(model_name: str | None = None):
    """Get a Gemini GenerativeModel instance."""
    return genai.GenerativeModel(model_name or settings.gemini_model)


def generate_response(
    prompt: str,
    system_instruction: str | None = None,
    db: Session | None = None,
    operation: str = "chat",
) -> dict:
    """
    Generate a response from Gemini.
    Returns dict with 'text', 'input_tokens', 'output_tokens', 'latency_ms'.
    """
    model = genai.GenerativeModel(
        model_name=settings.gemini_model,
        system_instruction=system_instruction,
    )

    with track_llm_call(operation=operation, model=settings.gemini_model) as log:
        response = model.generate_content(prompt)

        # Extract token counts from usage metadata
        usage = response.usage_metadata
        log.input_tokens = usage.prompt_token_count or 0
        log.output_tokens = usage.candidates_token_count or 0
        log.total_tokens = usage.total_token_count or 0

    # Save metrics if db session provided
    if db:
        log.save(db)

    return {
        "text": response.text,
        "input_tokens": log.input_tokens,
        "output_tokens": log.output_tokens,
        "total_tokens": log.total_tokens,
        "latency_ms": log.latency_ms,
    }
