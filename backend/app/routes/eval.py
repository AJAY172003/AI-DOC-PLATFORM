"""Eval routes — trigger RAGAS evaluation and retrieve results."""

import json
import logging
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.models.db import get_db

router = APIRouter(prefix="/eval", tags=["evaluation"])
logger = logging.getLogger(__name__)

RESULTS_FILE = Path("/tmp/ragas_results.json")


class EvalStatus(BaseModel):
    status: str            # idle | running | complete | error
    message: str
    results: dict | None = None


class EvalTriggerResponse(BaseModel):
    message: str
    status: str


# In-memory state (simple for free-tier single instance)
_eval_state = {"status": "idle", "message": "No evaluation run yet", "results": None}


def _run_eval_background(db_url: str):
    """Background task: run full RAGAS eval pipeline."""
    global _eval_state
    _eval_state = {"status": "running", "message": "Evaluation in progress...", "results": None}

    try:
        import sys
        sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

        from tests.eval.ragas_pipeline import run_full_eval
        results = run_full_eval(db_url)

        # Save to disk for persistence
        RESULTS_FILE.write_text(json.dumps(results, indent=2))

        _eval_state = {
            "status": "complete",
            "message": f"Evaluation complete — {results.get('questions_evaluated', 0)} questions evaluated",
            "results": results,
        }
        logger.info("RAGAS eval completed successfully")

    except Exception as e:
        logger.error(f"RAGAS eval failed: {e}")
        _eval_state = {
            "status": "error",
            "message": f"Evaluation failed: {str(e)}",
            "results": None,
        }


@router.post("/run", response_model=EvalTriggerResponse)
def trigger_eval(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Trigger a RAGAS evaluation run in the background."""
    if _eval_state["status"] == "running":
        raise HTTPException(status_code=409, detail="Evaluation already running")

    from app.config import get_settings
    settings = get_settings()

    background_tasks.add_task(_run_eval_background, settings.database_url)

    return EvalTriggerResponse(
        message="Evaluation started in background. Poll /api/eval/status for results.",
        status="running",
    )


@router.get("/status", response_model=EvalStatus)
def get_eval_status():
    """Get current evaluation status and results."""
    state = dict(_eval_state)

    # Load from disk if available and not in memory
    if state["results"] is None and RESULTS_FILE.exists():
        try:
            state["results"] = json.loads(RESULTS_FILE.read_text())
            state["status"] = "complete"
            state["message"] = "Previous evaluation results loaded"
        except Exception:
            pass

    return EvalStatus(**state)


@router.delete("/results")
def clear_results():
    """Clear evaluation results."""
    global _eval_state
    _eval_state = {"status": "idle", "message": "Results cleared", "results": None}
    if RESULTS_FILE.exists():
        RESULTS_FILE.unlink()
    return {"message": "Results cleared"}
