-- Add avatar and assets columns to schemas table
-- Date: 2026-02-16

ALTER TABLE schemas 
ADD COLUMN IF NOT EXISTS avatar JSONB,
ADD COLUMN IF NOT EXISTS assets JSONB;
