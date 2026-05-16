-- Add script and pacing columns to schemas table
-- Date: 2026-02-25

ALTER TABLE schemas ADD COLUMN IF NOT EXISTS script TEXT;
ALTER TABLE schemas ADD COLUMN IF NOT EXISTS pacing TEXT;
