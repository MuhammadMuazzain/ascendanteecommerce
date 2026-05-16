-- Add schema_id to scenes table
ALTER TABLE scenes ADD COLUMN schema_id TEXT REFERENCES schemas(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_scenes_schema ON scenes(schema_id);
