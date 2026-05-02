"""
RAGAS Evaluation Pipeline — measures RAG quality automatically.

Metrics evaluated:
  - faithfulness:       Is the answer faithful to the retrieved context?
  - answer_relevancy:  Is the answer relevant to the question?
  - context_recall:    Did retrieval find all needed information?
  - context_precision: Were the retrieved chunks actually useful?

Usage:
    cd backend
    python -m tests.eval.run_ragas_eval

Requirements:
    pip install ragas datasets
"""

import os
import json
import sys
from pathlib import Path

# Add backend root to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from dotenv import load_dotenv
load_dotenv()

# ── Test dataset ─────────────────────────────────────────────────────────────
# Each entry: question + ground_truth answer
# The eval pipeline retrieves context automatically and evaluates all 4 metrics

EVAL_DATASET = [
    {
        "question": "What are the main topics covered in the uploaded documents?",
        "ground_truth": "The documents cover various topics as described in their content.",
    },
    {
        "question": "Summarize the key findings.",
        "ground_truth": "The key findings are described in the document sections.",
    },
    {
        "question": "What conclusions can be drawn from the documents?",
        "ground_truth": "Conclusions are based on the analysis presented in the documents.",
    },
]


def run_eval():
    """Run RAGAS evaluation against the live RAG pipeline."""
    try:
        from ragas import evaluate
        from ragas.metrics import (
            faithfulness,
            answer_relevancy,
            context_recall,
            context_precision,
        )
        from datasets import Dataset
    except ImportError:
        print("Install eval deps: pip install ragas datasets")
        return

    import google.generativeai as genai
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    from app.services.retrieval import retrieve_similar_chunks
    from app.services.llm import generate_response

    # Setup DB
    engine = create_engine(os.getenv("DATABASE_URL"))
    Session = sessionmaker(bind=engine)
    db = Session()

    print("Running RAGAS evaluation...\n")
    questions, answers, contexts, ground_truths = [], [], [], []

    for item in EVAL_DATASET:
        question = item["question"]
        print(f"Evaluating: {question[:60]}...")

        # Retrieve context
        chunks = retrieve_similar_chunks(db=db, query=question, top_k=5)
        if not chunks:
            print("  → Skipped (no documents uploaded)")
            continue

        context_texts = [c.content for c in chunks]
        context_joined = "\n\n".join(context_texts)

        # Generate answer
        prompt = f"""Answer based only on this context:

{context_joined}

Question: {question}"""
        result = generate_response(prompt, operation="ragas_eval")
        answer = result["text"]

        questions.append(question)
        answers.append(answer)
        contexts.append(context_texts)
        ground_truths.append(item["ground_truth"])

    db.close()

    if not questions:
        print("\nNo questions evaluated — upload documents first.")
        return

    # Build RAGAS dataset
    dataset = Dataset.from_dict({
        "question": questions,
        "answer": answers,
        "contexts": contexts,
        "ground_truth": ground_truths,
    })

    # Run evaluation
    print("\nRunning RAGAS metrics...")
    result = evaluate(
        dataset=dataset,
        metrics=[
            faithfulness,
            answer_relevancy,
            context_recall,
            context_precision,
        ],
    )

    # Print results
    print("\n" + "=" * 50)
    print("RAGAS Evaluation Results")
    print("=" * 50)
    df = result.to_pandas()
    print(df.to_string(index=False))

    print("\nAggregate Scores:")
    for metric in ["faithfulness", "answer_relevancy", "context_recall", "context_precision"]:
        if metric in df.columns:
            score = df[metric].mean()
            status = "✓" if score > 0.7 else "⚠" if score > 0.5 else "✗"
            print(f"  {status} {metric}: {score:.3f}")

    # Save results
    output_path = Path(__file__).parent / "ragas_results.json"
    results_dict = {
        "scores": df.mean(numeric_only=True).to_dict(),
        "per_question": df.to_dict(orient="records"),
    }
    output_path.write_text(json.dumps(results_dict, indent=2))
    print(f"\nResults saved to {output_path}")


if __name__ == "__main__":
    run_eval()
