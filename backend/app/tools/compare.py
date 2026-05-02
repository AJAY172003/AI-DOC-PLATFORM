"""Agent tool: compare two documents or two topics side by side."""

from langchain.tools import tool
from sqlalchemy.orm import Session


def make_compare_tool(db: Session, document_ids: list[str] | None = None):
    """Factory that returns a compare tool bound to a db session."""

    @tool
    def compare_documents(comparison_query: str) -> str:
        """
        Compare two documents or two topics/sections across documents.
        Use this when the user asks to compare, contrast, or find differences
        between documents, sections, or concepts.
        Input: describe what to compare, e.g. 'compare doc1.pdf and doc2.pdf on pricing'
               or 'compare the conclusions of both reports'.
        Output: a structured comparison table and analysis.
        """
        from app.models.db import Document, DocumentChunk
        from app.services.llm import generate_response
        from app.services.retrieval import retrieve_similar_chunks
        from uuid import UUID

        # Get available documents
        query = db.query(Document).filter(Document.status == "ready")
        if document_ids:
            doc_uuids = [UUID(d) for d in document_ids]
            query = query.filter(Document.id.in_(doc_uuids))

        docs = query.limit(5).all()

        if len(docs) < 1:
            return "Need at least one document to compare. Please upload documents first."

        # Retrieve relevant chunks for the comparison query
        doc_uuids_for_retrieval = [UUID(d) for d in document_ids] if document_ids else None
        chunks = retrieve_similar_chunks(
            db=db,
            query=comparison_query,
            document_ids=doc_uuids_for_retrieval,
            top_k=8,
        )

        if not chunks:
            return "No relevant content found to compare."

        # Group chunks by document
        chunks_by_doc: dict[str, list] = {}
        for chunk in chunks:
            key = chunk.filename
            if key not in chunks_by_doc:
                chunks_by_doc[key] = []
            chunks_by_doc[key].append(chunk.content)

        # Build context per document
        doc_contexts = []
        for filename, contents in chunks_by_doc.items():
            doc_contexts.append(f"### {filename}\n" + "\n".join(contents[:4]))

        combined = "\n\n".join(doc_contexts)

        prompt = f"""You are a document analyst. Compare the following content from different documents.

Comparison request: {comparison_query}

Documents:
{combined[:8000]}

Provide a structured comparison:
1. **Side-by-Side Comparison** (markdown table if applicable)
2. **Key Similarities**
3. **Key Differences**
4. **Analysis** (which is better/stronger and why, if applicable)
"""
        result = generate_response(prompt, operation="compare")
        return result["text"]

    return compare_documents
