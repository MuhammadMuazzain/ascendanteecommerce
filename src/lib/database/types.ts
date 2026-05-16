import type { Generated, Insertable, Selectable, Updateable } from "kysely";

// Better Auth database schema types
export interface Database {
  user: UserTable;
  session: SessionTable;
  account: AccountTable;
  verification: VerificationTable;
  generations: GenerationTable;
  scenes: SceneTable;
  folders: FolderTable;
  projects: ProjectTable;
  schemas: SchemaTable;
  segments: SegmentTable;
  user_social_accounts: UserSocialAccountTable;
  subscription: SubscriptionTable;
  assets: AssetTable;
  chat_sessions: ChatSessionTable;
  chat_messages: ChatMessageTable;
}

export interface SubscriptionTable {
  id: string;
  user_id: string;
  plan: string;
  status: string | null;
  credits: number;
  reference_id: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  period_start: Date | null;
  period_end: Date | null;
  cancel_at_period_end: boolean | null;
  trial_start: Date | null;
  trial_end: Date | null;
  metadata: any | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface UserTable {
  id: string;
  email: string;
  email_verified: boolean;
  name: string | null;
  image: string | null;
  role: string | null;
  stripe_customer_id: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface SessionTable {
  id: string;
  user_id: string;
  expires_at: Date;
  token: string;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
  ip_address: string | null;
  user_agent: string | null;
}

export interface AccountTable {
  id: string;
  user_id: string;
  account_id: string;
  provider_id: string;
  access_token: string | null;
  refresh_token: string | null;
  id_token: string | null;
  access_token_expires_at: Date | null;
  refresh_token_expires_at: Date | null;
  scope: string | null;
  password: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface VerificationTable {
  id: string;
  identifier: string;
  value: string;
  expires_at: Date;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface GenerationTable {
  id: string;
  status: Generated<"COMPLETED" | "FAILED" | "PENDING" | "PROGRESS" | "CANCELED">;
  progress: number | null;
  preview_url: string | null;
  metadata: any | null;
  user_id: string | null;
  input: any | null;
  output: any | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

// Type helpers for CRUD operations
export type User = Selectable<UserTable>;
export type NewUser = Insertable<UserTable>;
export type UserUpdate = Updateable<UserTable>;

export type Session = Selectable<SessionTable>;
export type NewSession = Insertable<SessionTable>;
export type SessionUpdate = Updateable<SessionTable>;

export type Account = Selectable<AccountTable>;
export type NewAccount = Insertable<AccountTable>;
export type AccountUpdate = Updateable<AccountTable>;

export type Verification = Selectable<VerificationTable>;
export type NewVerification = Insertable<VerificationTable>;
export type VerificationUpdate = Updateable<VerificationTable>;

export type Generation = Selectable<GenerationTable>;
export type NewGeneration = Insertable<GenerationTable>;
export type GenerationUpdate = Updateable<GenerationTable>;

export interface SceneTable {
  id: string;
  generation_id: string | null;
  schema_id: string | null;
  scene_data: any; // JSON data for the scene
  user_id: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export type Scene = Selectable<SceneTable>;
export type NewScene = Insertable<SceneTable>;
export type SceneUpdate = Updateable<SceneTable>;

export interface FolderTable {
  id: string;
  name: string;
  user_id: string;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export type Folder = Selectable<FolderTable>;
export type NewFolder = Insertable<FolderTable>;
export type FolderUpdate = Updateable<FolderTable>;

export interface ProjectTable {
  id: string;
  name: string;
  type: string;
  generation_id: string | null;
  scene_id: string | null;
  folder_id: string | null;
  user_id: string;
  description: string | null;
  thumbnail: string | null;
  public: boolean;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export type Project = Selectable<ProjectTable>;
export type NewProject = Insertable<ProjectTable>;
export type ProjectUpdate = Updateable<ProjectTable>;

export type Provider = "INSTAGRAM" | "YOUTUBE" | "TIKTOK" | "GOOGLE_DRIVE";

export interface UserSocialAccountTable {
  id: string;
  user_id: string;
  provider: Provider;
  account_id: string;
  access_token: string;
  refresh_token: string | null;
  metadata: any; // JSONB
  is_active: boolean;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export type UserSocialAccount = Selectable<UserSocialAccountTable>;
export type NewUserSocialAccount = Insertable<UserSocialAccountTable>;
export type UserSocialAccountUpdate = Updateable<UserSocialAccountTable>;

export type Subscription = Selectable<SubscriptionTable>;
export type NewSubscription = Insertable<SubscriptionTable>;
export type SubscriptionUpdate = Updateable<SubscriptionTable>;

export type SourceType = "user_uploaded" | "ai_generated";
export type AssetType = "image" | "video" | "audio";
export type AudioSubtype = "music" | "sound_effect" | "voiceover";

export interface AssetTable {
  id: string;
  user_id: string;
  project_id: string | null;
  source_type: SourceType;
  asset_type: AssetType;
  audio_subtype: AudioSubtype | null;
  original_filename: string;
  unique_filename: string;
  file_path: string;
  public_url: string;
  file_size: number | null;
  mime_type: string | null;
  duration: number | null;
  width: number | null;
  height: number | null;
  fps: number | null;
  gemini_file_uri: string | null;
  gemini_cache_key: string | null;
  gemini_cache_expiry: Date | null;
  gemini_cache_hash: string | null;
  metadata: any | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export type Asset = Selectable<AssetTable>;
export type NewAsset = Insertable<AssetTable>;
export type AssetUpdate = Updateable<AssetTable>;

export interface ChatSessionTable {
  id: string;
  user_id: string;
  project_id: string;
  video_id: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export type ChatSession = Selectable<ChatSessionTable>;
export type NewChatSession = Insertable<ChatSessionTable>;
export type ChatSessionUpdate = Updateable<ChatSessionTable>;

export interface ChatMessageTable {
  id: string;
  session_id: string;
  role: string;
  content: string;
  metadata: any | null;
  created_at: Generated<Date>;
}

export type ChatMessage = Selectable<ChatMessageTable>;
export type NewChatMessage = Insertable<ChatMessageTable>;
export type ChatMessageUpdate = Updateable<ChatMessageTable>;

export interface SchemaTable {
  id: string;
  project_id: string;
  title: string | null;
  description: string | null;
  prompt_preview: string | null;
  tags: string[] | null;
  music: any | null;
  voice: any | null;
  visuals: any | null;
  caption: any | null;
  resolution: string | null;
  aspect_ratio: string | null;
  type: string | null;
  execution_mode: string;
  avatar: any | null;
  assets: any | null;
  metadata: any | null;
  script: string | null;
  pacing: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export type VideoSchemaDb = Selectable<SchemaTable>;
export type NewVideoSchemaDb = Insertable<SchemaTable>;
export type VideoSchemaDbUpdate = Updateable<SchemaTable>;

export interface SegmentTable {
  id: string;
  project_id: string;
  schema_id: string | null;
  session_id: string | null;
  asset_id: string | null;
  order: Generated<number>;
  segment_data: any;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export type DbSegment = Selectable<SegmentTable>;
export type NewSegment = Insertable<SegmentTable>;
export type SegmentUpdate = Updateable<SegmentTable>;
