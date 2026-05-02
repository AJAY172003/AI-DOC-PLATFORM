"""Agent tool: summarize an entire document or a topic across documents."""

from langchain.tools import tool
from sqlalchemy.orm import Session


def make_summarize_tool(db: Session, document_ids: list[str] | None = None):
    """Factory that returns a summarize tool bound to a db session."""

    @tool
    def summarize_document(document_name_or_topic: str) -> str:
        """
        Summarize a specific document or a topic across all documents.
        Use this when the user asks for a summary, overview, or key points
        of a document or subject area.
        Input: a document filename (partial match) or a topic to summarize.
        Output: a structured summary with key points.
        """
        from app.models.db import Document, DocumentChunk
        from app.services.llm import generate_response
        from uuid import UUID

        # Try to find a specific document by name first
        query = db.query(Document).filter(Document.status == "ready")

        if document_ids:
            doc_uuids = [UUID(d) for d in document_ids]
            query = query.filter(Document.id.in_(doc_uuids))

        docs = query.all()

        # Match by name if a filename-like string given
        name_lower = document_name_or_topic.lower()
        matched_docs = [d for d in docs if name_lower in d.filename.lower()]
        target_docs = matched_docs if matched_docs else docs

        if not target_docs:
            return "No documents found to summarize."

        # Pull top chunks from each target document
        all_content = []
        for doc in target_docs[:3]:  # Max 3 docs to stay within token limits
            chunks = (
                db.query(DocumentChunk)
                .filter(DocumentChunk.document_id == doc.id)
                .order_by(DocumentChunk.chunk_index)
                .limit(15)
                .all()
            )
            if chunks:
                text = "\n".join(c.content for c in chunks)
                all_content.append(f"=== {doc.filename} ===\n{text}")

        if not all_content:
            return "No content found in the specified documents."

        combined = "\n\n".join(all_content)

        prompt = f"""You are a document analyst. Summarize the following content.

Structure your summary as:
1. **Overview** (2-3 sentences)
2. **Key Points** (bullet list of 5-8 main points)
3. **Important Details** (any numbers, dates, names, or critical facts)
4. **Conclusion** (1-2 sentences)

Content to summarize:
{combined[:8000]}  

Topic focus (if specific): {document_name_or_topic}
"""
        result = generate_response(prompt, operation="summarize")
        return result["text"]

    return summarize_document
