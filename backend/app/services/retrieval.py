"""Retrieval service — vector similarity search using pgvector."""

from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.schemas import SourceChunk
from app.services.embeddings import generate_query_embedding

settings = get_settings()


def retrieve_similar_chunks(
    db: Session,
    query: str,
    document_ids: list[UUID] | None = None,
    top_k: int | None = None,
) -> list[SourceChunk]:
    top_k = top_k or settings.max_retrieval_results

    query_embedding = generate_query_embedding(query)
    embedding_str = "[" + ",".join(str(x) for x in query_embedding) + "]"

    if document_ids:
        doc_ids_str = ",".join(f"'{str(did)}'" for did in document_ids)
        filter_clause = f"AND dc.document_id IN ({doc_ids_str})"
    else:
        filter_clause = ""

    sql = text(f"""
        SELECT
            dc.id AS chunk_id,
            dc.document_id,
            d.filename,
            dc.content,
            dc.page_number,
            1 - (dc.embedding <=> '{embedding_str}'::vector) AS similarity_score
        FROM document_chunks dc
        JOIN documents d ON d.id = dc.document_id
        WHERE d.status = 'ready'
        {filter_clause}
        ORDER BY dc.embedding <=> '{embedding_str}'::vector
        LIMIT {top_k}
    """)

    results = db.execute(sql).fetchall()

    return [
        SourceChunk(
            chunk_id=row.chunk_id,
            document_id=row.document_id,
            filename=row.filename,
            content=row.content,
            page_number=row.page_number,
            similarity_score=round(float(row.similarity_score), 4),
        )
        for row in results
    ]
