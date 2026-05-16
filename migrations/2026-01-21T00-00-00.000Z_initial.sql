-- Consolidated Initial Schema Migration
-- Date: 2026-01-21

-- User Tables (Better Auth)
CREATE TABLE IF NOT EXISTS "user" (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    name TEXT,
    image TEXT,
    stripe_customer_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "session" (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    token TEXT NOT NULL UNIQUE,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "account" (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    account_id TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    id_token TEXT,
    access_token_expires_at TIMESTAMP WITH TIME ZONE,
    refresh_token_expires_at TIMESTAMP WITH TIME ZONE,
    scope TEXT,
    password TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "verification" (
    id TEXT PRIMARY KEY,
    identifier TEXT NOT NULL,
    value TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Core Business Logic Tables
CREATE TABLE IF NOT EXISTS generations (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'PENDING',
    progress NUMERIC,
    preview_url TEXT,
    metadata JSONB,
    user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
    input JSONB,
    output JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS scenes (
    id TEXT PRIMARY KEY,
    generation_id TEXT NOT NULL REFERENCES generations(id) ON DELETE CASCADE,
    scene_data JSONB NOT NULL,
    user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS folders (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    generation_id TEXT REFERENCES generations(id) ON DELETE SET NULL,
    scene_id TEXT REFERENCES scenes(id) ON DELETE SET NULL,
    folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL,
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    description TEXT,
    thumbnail TEXT,
    public BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL CHECK (source_type IN ('user_uploaded', 'ai_generated')),
    asset_type TEXT NOT NULL CHECK (asset_type IN ('image', 'video', 'audio')),
    audio_subtype TEXT CHECK (audio_subtype IN ('music', 'sound_effect', 'voiceover')),
    original_filename TEXT NOT NULL,
    unique_filename TEXT NOT NULL UNIQUE,
    file_path TEXT NOT NULL,
    public_url TEXT NOT NULL,
    file_size BIGINT,
    mime_type TEXT,
    duration NUMERIC,
    width INTEGER,
    height INTEGER,
    fps INTEGER,
    gemini_file_uri TEXT,
    gemini_cache_key TEXT,
    gemini_cache_expiry TIMESTAMP WITH TIME ZONE,
    gemini_cache_hash TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- AI Copilot & Chat Tables
CREATE TABLE IF NOT EXISTS chat_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    video_id TEXT REFERENCES assets(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Schema & Segment Tables
CREATE TABLE IF NOT EXISTS schemas (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    script TEXT,
    title TEXT,
    description TEXT,
    prompt_preview TEXT,
    tags TEXT[],
    music JSONB,
    voice JSONB,
    visuals JSONB,
    caption JSONB,
    resolution TEXT,
    aspect_ratio TEXT,
    execution_mode TEXT DEFAULT 'live',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS segments (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    schema_id TEXT REFERENCES schemas(id) ON DELETE CASCADE,
    session_id TEXT REFERENCES chat_sessions(id) ON DELETE CASCADE,
    asset_id TEXT REFERENCES assets(id) ON DELETE SET NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    segment_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Social & Subscription Tables
CREATE TABLE IF NOT EXISTS user_social_accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    account_id TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    metadata JSONB,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS subscription (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    plan TEXT NOT NULL,
    status TEXT,
    credits INTEGER NOT NULL DEFAULT 0,
    reference_id TEXT,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    period_start TIMESTAMP WITH TIME ZONE,
    period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    trial_start TIMESTAMP WITH TIME ZONE,
    trial_end TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_generations_user ON generations(user_id);
CREATE INDEX IF NOT EXISTS idx_scenes_generation ON scenes(generation_id);
CREATE INDEX IF NOT EXISTS idx_scenes_user ON scenes(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_user ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_folder ON projects(folder_id);
CREATE INDEX IF NOT EXISTS idx_assets_user ON assets(user_id);
CREATE INDEX IF NOT EXISTS idx_assets_project ON assets(project_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_project ON chat_sessions(user_id, project_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_schemas_project ON schemas(project_id);
CREATE INDEX IF NOT EXISTS idx_segments_project ON segments(project_id);
CREATE INDEX IF NOT EXISTS idx_segments_schema ON segments(schema_id);
CREATE INDEX IF NOT EXISTS idx_segments_session ON segments(session_id);
CREATE INDEX IF NOT EXISTS idx_user_social_accounts_user ON user_social_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_user ON subscription(user_id);
