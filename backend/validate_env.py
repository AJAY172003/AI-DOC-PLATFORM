#!/usr/bin/env python3
"""
validate_env.py — Run before deploying to catch missing config.

Usage:
    cd backend
    python validate_env.py
"""

import os
import sys
from dotenv import load_dotenv

load_dotenv()

REQUIRED = {
    "DATABASE_URL": "Supabase PostgreSQL connection string",
    "SUPABASE_URL": "Supabase project URL",
    "SUPABASE_KEY": "Supabase anon key",
    "GEMINI_API_KEY": "Google Gemini API key",
}

OPTIONAL = {
    "GEMINI_MODEL": ("gemini-2.5-flash", "Gemini model name"),
    "CORS_ORIGINS": ("*", "Allowed CORS origins"),
    "CHUNK_SIZE": ("500", "Chunk size for document ingestion"),
}

print("\n🔍 DocMind — Environment Validation\n" + "=" * 40)

errors = []
warnings = []

# Check required vars
for var, desc in REQUIRED.items():
    val = os.getenv(var, "")
    if not val:
        errors.append(f"  ✗ {var} — MISSING ({desc})")
    else:
        masked = val[:8] + "..." if len(val) > 8 else "***"
        print(f"  ✓ {var} = {masked}")

# Check optional vars
print("\nOptional:")
for var, (default, desc) in OPTIONAL.items():
    val = os.getenv(var, default)
    print(f"  ~ {var} = {val}")

if errors:
    print("\n❌ Missing required variables:")
    for e in errors:
        print(e)
    print("\nCopy backend/.env.example to backend/.env and fill in the values.")
    sys.exit(1)

# Test DB connection
print("\n🗄️  Testing database connection...")
try:
    import psycopg2
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    cur = conn.cursor()
    cur.execute("SELECT version();")
    version = cur.fetchone()[0]
    print(f"  ✓ Connected to PostgreSQL")

    # Check pgvector
    cur.execute("SELECT extname FROM pg_extension WHERE extname = 'vector';")
    if cur.fetchone():
        print("  ✓ pgvector extension enabled")
    else:
        warnings.append("pgvector extension not found — run migration SQL in Supabase")

    # Check tables
    for table in ["documents", "document_chunks", "chat_messages", "llm_metrics"]:
        cur.execute(f"SELECT to_regclass('public.{table}');")
        if cur.fetchone()[0]:
            print(f"  ✓ Table '{table}' exists")
        else:
            warnings.append(f"Table '{table}' missing — run migration SQL in Supabase")

    conn.close()
except Exception as e:
    errors.append(f"Database connection failed: {e}")
    print(f"  ✗ Database connection failed: {e}")

# Test Gemini API
print("\n🤖 Testing Gemini API...")
try:
    import google.generativeai as genai
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    model = genai.GenerativeModel("gemini-2.5-flash")
    response = model.generate_content("Reply with just 'OK'")
    if response.text:
        print(f"  ✓ Gemini API working — model: gemini-2.5-flash")
    else:
        warnings.append("Gemini API returned empty response")
except Exception as e:
    errors.append(f"Gemini API failed: {e}")
    print(f"  ✗ Gemini API error: {e}")

# Summary
print("\n" + "=" * 40)
if warnings:
    print("⚠️  Warnings:")
    for w in warnings:
        print(f"  ! {w}")

if errors:
    print(f"\n❌ {len(errors)} error(s) found. Fix before deploying.")
    sys.exit(1)
else:
    print("✅ All checks passed — ready to deploy!\n")
