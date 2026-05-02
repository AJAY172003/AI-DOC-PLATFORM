"""Agent tool: search across documents using vector similarity."""

from langchain.tools import tool
from sqlalchemy.orm import Session


def make_search_tool(db: Session, document_ids: list[str] | None = None):
    """Factory that returns a search tool bound to a db session."""

    @tool
    def search_documents(query: str) -> str:
        """
        Search across uploaded documents to find relevant information.
        Use this when the user asks a question that requires finding specific
        facts, passages, or information from the documents.
        Input: a natural language search query.
        Output: relevant document excerpts with source info.
        """
        from app.services.retrieval import retrieve_similar_chunks
        from uuid import UUID

        doc_uuids = [UUID(d) for d in document_ids] if document_ids else None
        chunks = retrieve_similar_chunks(
            db=db,
            query=query,
            document_ids=doc_uuids,
            top_k=5,
        )

        if not chunks:
            return "No relevant content found in the uploaded documents."

        results = []
        for i, chunk in enumerate(chunks):
            page = f", page {chunk.page_number}" if chunk.page_number else ""
            score = f"{chunk.similarity_score * 100:.0f}% match"
            results.append(
                f"[Source {i+1}: {chunk.filename}{page} — {score}]\n{chunk.content}"
            )

        return "\n\n---\n\n".join(results)

    return search_documents
