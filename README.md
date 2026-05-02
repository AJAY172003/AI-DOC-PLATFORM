# AI Document Q&A Platform

A production-grade, AI-native document Q&A platform with RAG pipelines, agentic workflows, and LLM-integrated features — built with FastAPI, React, Gemini API, and PostgreSQL + pgvector.

## Architecture

```
┌──────────────┐
│   Vercel      │
│ (React app)   │
└──────┬───────┘
       │
┌──────▼───────┐
│   Render      │
│  (FastAPI)    │
└──┬───────┬───┘
   │       │
┌──▼───────┐ ┌──▼───────────┐
│ Supabase  │ │ Gemini API   │
│ Postgres  │ │ (free tier)  │
│ + pgvector│ └──────────────┘
│ + Storage │
└───────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + TypeScript + Tailwind CSS |
| Backend | Python + FastAPI |
| Database | Supabase PostgreSQL + pgvector |
| LLM | Google Gemini API (free tier) |
| Embeddings | Gemini text-embedding-004 |
| Agent | LangChain + LangGraph |
| File Storage | Supabase Storage |
| Deployment | Render (backend) + Vercel (frontend) |
| CI/CD | GitHub Actions |

## Features

- **Document Ingestion** — Upload PDFs/DOCX, auto-chunk and embed
- **RAG Q&A** — Ask questions, get answers with source citations
- **Agentic Workflows** — AI agent with tools: search, summarize, compare, export
- **Guardrails** — Hallucination detection, relevance scoring
- **Metrics Dashboard** — Token usage, cost, latency tracking
- **Evaluation** — RAGAS-based retrieval quality testing

## Setup

### Prerequisites

1. [Supabase](https://supabase.com) account (free tier)
2. [Google AI Studio](https://aistudio.google.com/apikey) — get a free Gemini API key
3. Python 3.11+
4. Node.js 18+

### 1. Supabase Setup

- Create a new project at supabase.com
- Go to SQL Editor and run the migration in `backend/migrations/001_init.sql`
- Copy your project URL and anon key from Settings > API

### 2. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Fill in your Supabase and Gemini credentials in .env
uvicorn app.main:app --reload
```

### 3. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# Set VITE_API_URL to your backend URL
npm run dev
```

### 4. Deploy

- **Backend → Render**: Connect GitHub repo, set root to `backend/`
- **Frontend → Vercel**: Connect GitHub repo, set root to `frontend/`
- **Database**: Already on Supabase

## Project Structure

```
ai-doc-platform/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry
│   │   ├── config.py            # Environment config
│   │   ├── routes/              # API endpoints
│   │   ├── services/            # Business logic
│   │   ├── models/              # DB models + schemas
│   │   ├── tools/               # Agent tools
│   │   └── utils/               # Helpers
│   ├── migrations/              # SQL migrations
│   ├── tests/                   # Tests + evals
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/               # Route pages
│   │   ├── components/          # UI components
│   │   ├── hooks/               # Custom hooks
│   │   ├── services/            # API client
│   │   └── types/               # TypeScript types
│   └── package.json
└── deploy/
    ├── render.yaml
    └── vercel.json
```

## License

MIT
