-- Migration 002: Add guardrail columns to chat_messages
-- Run this in your Supabase SQL Editor AFTER 001_init.sql

ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS relevance_score FLOAT,
  ADD COLUMN IF NOT EXISTS is_grounded BOOLEAN,
  ADD COLUMN IF NOT EXISTS safety_flagged BOOLEAN DEFAULT FALSE;

-- Index for filtering by grounding quality
CREATE INDEX IF NOT EXISTS idx_chat_grounded ON chat_messages(is_grounded);
CREATE INDEX IF NOT EXISTS idx_chat_relevance ON chat_messages(relevance_score);
