-- Make generation_id nullable in scenes table
ALTER TABLE scenes ALTER COLUMN generation_id DROP NOT NULL;
