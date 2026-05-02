"""Logging utility for LLM calls — tracks tokens, cost, latency."""

import time
from contextlib import contextmanager
from dataclasses import dataclass, field

from sqlalchemy.orm import Session

from app.models.db import LLMMetric


@dataclass
class LLMCallLog:
    operation: str = ""
    model: str = ""
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0
    latency_ms: float = 0.0
    estimated_cost: float = 0.0
    _start_time: float = field(default=0.0, repr=False)

    def start(self):
        self._start_time = time.time()

    def stop(self):
        self.latency_ms = (time.time() - self._start_time) * 1000

    def calculate_cost(self):
        """Gemini free tier = $0, but we track for when you switch to paid."""
        # Gemini 2.0 Flash pricing (per 1M tokens)
        INPUT_COST_PER_M = 0.10   # $0.10 per 1M input tokens
        OUTPUT_COST_PER_M = 0.40  # $0.40 per 1M output tokens

        self.estimated_cost = (
            (self.input_tokens / 1_000_000) * INPUT_COST_PER_M +
            (self.output_tokens / 1_000_000) * OUTPUT_COST_PER_M
        )

    def save(self, db: Session):
        """Persist the metric to the database."""
        self.calculate_cost()
        metric = LLMMetric(
            operation=self.operation,
            model=self.model,
            input_tokens=self.input_tokens,
            output_tokens=self.output_tokens,
            total_tokens=self.total_tokens,
            latency_ms=self.latency_ms,
            estimated_cost=self.estimated_cost,
        )
        db.add(metric)
        db.commit()
        return metric


@contextmanager
def track_llm_call(operation: str, model: str):
    """Context manager to time and log an LLM call."""
    log = LLMCallLog(operation=operation, model=model)
    log.start()
    try:
        yield log
    finally:
        log.stop()
