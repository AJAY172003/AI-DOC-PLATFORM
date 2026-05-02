"""
Guardrails service — hallucination detection, relevance scoring, safety checks.
Runs after every LLM response to validate quality before returning to the user.
"""

import json
import logging

from app.services.llm import generate_response

logger = logging.getLogger(__name__)


def check_relevance(question: str, context: str, answer: str) -> dict:
    """
    Check if the answer is grounded in the provided context.
    Returns relevance_score (0-1), is_grounded (bool), explanation (str).
    """
    # Truncate to avoid burning too many tokens on the guardrail itself
    ctx_snippet = context[:3000]
    ans_snippet = answer[:1000]

    prompt = f"""You are an AI quality evaluator. Determine if the answer is grounded in the context.

Score 0.0-1.0:
  1.0 = Every claim is supported by the context
  0.5 = Some claims are not in the context
  0.0 = Answer fabricates information not in the context

Respond ONLY with valid JSON, no markdown fences, no extra text:
{{"relevance_score": <float 0-1>, "is_grounded": <true|false>, "explanation": "<one sentence>"}}

QUESTION: {question}

CONTEXT:
{ctx_snippet}

ANSWER:
{ans_snippet}
"""
    try:
        result = generate_response(prompt, operation="guardrail_relevance")
        text = result["text"].strip()

        # Strip markdown fences if Gemini adds them
        if text.startswith("```"):
            text = text.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

        data = json.loads(text)
        return {
            "relevance_score": round(float(data.get("relevance_score", 0.5)), 3),
            "is_grounded": bool(data.get("is_grounded", True)),
            "explanation": str(data.get("explanation", "")),
        }
    except Exception as e:
        logger.warning(f"Guardrail relevance check failed: {e}")
        # Fail open — don't block the response, just flag it
        return {
            "relevance_score": 0.5,
            "is_grounded": True,
            "explanation": "Evaluation unavailable",
        }


def check_safety(text: str) -> dict:
    """
    Basic safety check — detects hallucination signals and unsafe content.
    Returns is_safe (bool) and flags (list).
    """
    HALLUCINATION_SIGNALS = [
        "i don't have access to",
        "i cannot verify",
        "i'm not sure but",
        "i believe but cannot confirm",
        "i may be wrong",
        "as of my knowledge cutoff",
    ]

    SAFETY_SIGNALS = [
        "how to harm",
        "how to hurt",
        "illegal activity",
    ]

    text_lower = text.lower()

    hallucination_flags = [f for f in HALLUCINATION_SIGNALS if f in text_lower]
    safety_flags = [f for f in SAFETY_SIGNALS if f in text_lower]

    return {
        "is_safe": len(safety_flags) == 0,
        "has_hallucination_signals": len(hallucination_flags) > 0,
        "flags": hallucination_flags + safety_flags,
    }


def run_guardrails(question: str, context: str, answer: str) -> dict:
    """
    Run all guardrails and return a combined result.
    This is the main function called after every LLM response.
    """
    relevance = check_relevance(question, context, answer)
    safety = check_safety(answer)

    return {
        "relevance_score": relevance["relevance_score"],
        "is_grounded": relevance["is_grounded"] and not safety["has_hallucination_signals"],
        "safety_flagged": not safety["is_safe"],
        "explanation": relevance["explanation"],
        "flags": safety["flags"],
    }
