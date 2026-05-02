#!/bin/bash
set -e

echo "=== DocMind API Startup ==="
echo "Running database migrations..."
python run_migrations.py

echo "Starting API server..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --workers 1
