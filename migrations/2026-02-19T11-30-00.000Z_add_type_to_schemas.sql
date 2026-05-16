-- Add type column to schemas table
-- Date: 2026-02-19

ALTER TABLE schemas ADD COLUMN IF NOT EXISTS type TEXT;
