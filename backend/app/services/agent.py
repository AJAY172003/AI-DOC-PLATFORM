"""
Agent service — LangChain ReAct agent with Gemini + 4 tools:
  1. search_documents   — vector similarity search
  2. summarize_document — full doc / topic summary
  3. compare_documents  — side-by-side comparison
  4. export_report      — structured markdown report
"""

import logging
from uuid import UUID

from langchain.agents import AgentExecutor, create_react_agent
from langchain.prompts import PromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI
from sqlalchemy.orm import Session

from app.config import get_settings
from app.tools.compare import make_compare_tool
from app.tools.export_report import make_export_tool
from app.tools.search_docs import make_search_tool
from app.tools.summarize import make_summarize_tool

settings = get_settings()
logger = logging.getLogger(__name__)

AGENT_SYSTEM_PROMPT = """You are DocMind, an intelligent document assistant with access to tools.
You help users understand, analyze, and extract insights from their uploaded documents.

You have access to the following tools:
{tools}

Use this format STRICTLY:

Question: the input question you must answer
Thought: think about what to do
Action: the action to take, one of [{tool_names}]
Action Input: the input to the action (plain string, no JSON)
Observation: the result of the action
... (repeat Thought/Action/Action Input/Observation as needed)
Thought: I now know the final answer
Final Answer: your complete, well-formatted answer to the user

Rules:
- Always use tools to answer questions — don't fabricate information
- For simple questions, one tool call is enough; for complex ones, chain multiple
- If a tool returns no results, say so honestly
- Format Final Answer in clean markdown
- For reports (export_report tool), include the full report in your Final Answer

Begin!

Question: {input}
Thought: {agent_scratchpad}"""


def run_agent(
    db: Session,
    question: str,
    document_ids: list[UUID] | None = None,
) -> dict:
    """
    Run the LangChain ReAct agent with all tools.
    Returns dict with answer, tool_calls, and metadata.
    """
    import time
    start = time.time()

    doc_id_strs = [str(d) for d in document_ids] if document_ids else None

    # Build tools bound to this db session + document scope
    tools = [
        make_search_tool(db, doc_id_strs),
        make_summarize_tool(db, doc_id_strs),
        make_compare_tool(db, doc_id_strs),
        make_export_tool(db, doc_id_strs),
    ]

    # Gemini LLM via LangChain
    llm = ChatGoogleGenerativeAI(
        model=settings.gemini_model,
        google_api_key=settings.gemini_api_key,
        temperature=0.1,
        convert_system_message_to_human=True,
    )

    # ReAct agent
    prompt = PromptTemplate.from_template(AGENT_SYSTEM_PROMPT)
    agent = create_react_agent(llm=llm, tools=tools, prompt=prompt)

    executor = AgentExecutor(
        agent=agent,
        tools=tools,
        verbose=True,
        max_iterations=6,          # prevent infinite loops
        early_stopping_method="generate",
        handle_parsing_errors=True,
    )

    # Track tool calls
    tool_calls: list[dict] = []

    class ToolTracker:
        """Intercept tool calls for logging."""
        def on_tool_start(self, tool_name: str, tool_input: str, **kwargs):
            tool_calls.append({"tool": tool_name, "input": tool_input})

    try:
        result = executor.invoke(
            {"input": question},
            config={"callbacks": []},
        )
        answer = result.get("output", "I was unable to generate a response.")
    except Exception as e:
        logger.error(f"Agent error: {e}")
        answer = f"I encountered an error while processing your request: {str(e)}"

    latency_ms = (time.time() - start) * 1000

    # Detect if a report was generated
    is_report = answer.startswith("REPORT_GENERATED") or "REPORT_GENERATED" in answer
    if is_report:
        answer = answer.replace("REPORT_GENERATED\n", "").replace("REPORT_GENERATED", "").strip()

    return {
        "answer": answer,
        "tool_calls": tool_calls,
        "is_report": is_report,
        "latency_ms": round(latency_ms, 2),
    }
