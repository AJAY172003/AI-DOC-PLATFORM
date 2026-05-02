import asyncio
asyncio.set_event_loop_policy(asyncio.DefaultEventLoopPolicy())
import sys, json, os, time

from dotenv import load_dotenv
load_dotenv()

def run_full_eval(database_url):
    from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
    from ragas import evaluate
    from ragas.metrics import faithfulness, answer_relevancy
    from ragas.llms import LangchainLLMWrapper
    from ragas.embeddings import LangchainEmbeddingsWrapper
    from ragas.run_config import RunConfig
    from datasets import Dataset
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.config import get_settings
    from app.services.retrieval import retrieve_similar_chunks
    from app.services.llm import generate_response
    from app.models.db import Document
    from langchain_groq import ChatGroq
    settings = get_settings()
    ragas_llm = LangchainLLMWrapper(ChatGroq(
    model="llama-3.3-70b-versatile",
    api_key= os.getenv("GROQ_API_KEY"),
))

    ragas_emb = LangchainEmbeddingsWrapper(GoogleGenerativeAIEmbeddings(model="models/" + settings.gemini_embedding_model, google_api_key=settings.gemini_api_key))
    run_config = RunConfig(max_workers=1, timeout=120, max_retries=3)

    db = sessionmaker(bind=create_engine(database_url))()
    doc_count = db.query(Document).filter(Document.status == "ready").count()
    if doc_count == 0:
        db.close()
        return {"error": "No ready documents", "questions_evaluated": 0}

    QUESTIONS = [
        {"question": "What is this document about?", "ground_truth": "The document covers its main subject."},
        {"question": "What are the key details?", "ground_truth": "The key details are facts in the document."},
    ]

    questions, answers, contexts, ground_truths = [], [], [], []
    for item in QUESTIONS:
        try:
            chunks = retrieve_similar_chunks(db=db, query=item["question"], top_k=3)
            if not chunks:
                continue
            ctx = [c.content for c in chunks]
            q = "Context: " + " ".join(ctx) + " Question: " + item["question"]
            result = generate_response(q, operation="ragas_eval")
            questions.append(item["question"])
            answers.append(result["text"])
            contexts.append(ctx)
            ground_truths.append(item["ground_truth"])
            time.sleep(15)
        except Exception as e:
            print("Failed:", e)

    db.close()
    if not questions:
        return {"error": "No questions evaluated", "questions_evaluated": 0}

    dataset = Dataset.from_dict({"question": questions, "answer": answers, "contexts": contexts, "ground_truth": ground_truths})
    result = evaluate(dataset=dataset, metrics=[faithfulness, answer_relevancy], llm=ragas_llm, embeddings=ragas_emb, run_config=run_config)
    df = result.to_pandas()
    scores = {m: round(float(df[m].mean()), 4) for m in ["faithfulness", "answer_relevancy"] if m in df.columns}
    avg = sum(scores.values()) / len(scores) if scores else 0
    grade = "A" if avg >= 0.85 else "B" if avg >= 0.70 else "C" if avg >= 0.55 else "D"
    return {"questions_evaluated": len(questions), "aggregate_scores": scores, "overall_avg": round(avg, 4), "grade": grade}

if __name__ == "__main__":
    db_url = os.getenv("DATABASE_URL")
    print(json.dumps(run_full_eval(db_url), indent=2))