# Deployment Guide — DocMind AI Platform

Full free-tier deployment: **Supabase** (DB) + **Render** (API) + **Vercel** (Frontend)

---

## Step 1 — Supabase Setup

1. Go to [supabase.com](https://supabase.com) → New Project
2. Choose a region close to you (e.g. `ap-south-1` for India)
3. Set a strong DB password and save it
4. Once the project is ready, go to **SQL Editor**
5. Paste and run the contents of `backend/migrations/001_init.sql`
6. Go to **Settings → API** and copy:
   - `Project URL` → your `SUPABASE_URL`
   - `anon public` key → your `SUPABASE_KEY`
7. Go to **Settings → Database** and copy:
   - `Connection string (URI)` → your `DATABASE_URL`
   - Replace `[YOUR-PASSWORD]` with the password you set

---

## Step 2 — Gemini API Key

1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Click **Create API Key**
3. Save it as `GEMINI_API_KEY`

Free tier limits: 15 RPM, 1M tokens/day on `gemini-2.0-flash` — enough for development and demos.

---

## Step 3 — Deploy Backend to Render

1. Push your code to GitHub
2. Go to [render.com](https://render.com) → New → **Web Service**
3. Connect your GitHub repo
4. Configure:
   - **Root Directory:** `backend`
   - **Runtime:** Docker
   - **Dockerfile path:** `./Dockerfile`
5. Add these Environment Variables:

```
DATABASE_URL       = <your Supabase connection string>
SUPABASE_URL       = <your Supabase project URL>
SUPABASE_KEY       = <your Supabase anon key>
GEMINI_API_KEY     = <your Gemini API key>
GEMINI_MODEL       = gemini-2.0-flash
CORS_ORIGINS       = https://your-app.vercel.app
```

6. Click **Deploy**
7. Wait ~3 minutes. Your API will be at `https://your-service.onrender.com`

> **Note:** Free Render services spin down after 15 minutes of inactivity. First request after spin-down takes ~30 seconds.

---

## Step 4 — Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) → New Project
2. Connect your GitHub repo
3. Configure:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Vite
4. Add Environment Variables:
```
VITE_API_URL = https://your-service.onrender.com/api
```
5. Click **Deploy**
6. Your frontend will be at `https://your-app.vercel.app`

---

## Step 5 — Update CORS

Go back to Render → your service → Environment → update:
```
CORS_ORIGINS = https://your-actual-app.vercel.app
```

Then redeploy.

---

## Local Development

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Fill in .env with your Supabase + Gemini credentials
uvicorn app.main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install
cp .env.example .env.local
# Set VITE_API_URL=http://localhost:8000/api in .env.local
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Supabase Postgres connection string | `postgresql://postgres...` |
| `SUPABASE_URL` | Supabase project URL | `https://xyz.supabase.co` |
| `SUPABASE_KEY` | Supabase anon key | `eyJhbGci...` |
| `GEMINI_API_KEY` | Google AI Studio API key | `AIzaSy...` |
| `GEMINI_MODEL` | Model name | `gemini-2.0-flash` |
| `CORS_ORIGINS` | Comma-separated allowed origins | `http://localhost:5173` |

### Frontend (`frontend/.env.local`)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL | `http://localhost:8000/api` |

---

## CI/CD — GitHub Actions

Every push to `main`:
1. Lints backend (ruff) + frontend (eslint)
2. Builds frontend
3. Render auto-deploys from GitHub on every push to `main`
4. Vercel auto-deploys from GitHub on every push to `main`

Zero manual deployment steps after initial setup.

---

## Troubleshooting

**Backend not starting on Render:**
- Check logs in Render dashboard
- Verify all env vars are set
- Make sure `DATABASE_URL` includes `?sslmode=require` if Supabase requires it

**CORS error in browser:**
- Update `CORS_ORIGINS` in Render to include your exact Vercel URL
- Redeploy backend after updating env vars

**pgvector extension missing:**
- In Supabase SQL Editor, run: `CREATE EXTENSION IF NOT EXISTS vector;`
- Then re-run the migration SQL

**Render free tier cold start:**
- First request after inactivity takes ~30s
- The loading state in the UI handles this gracefully
