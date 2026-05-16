import { SegmentAsset } from "@/inngest/utils/types";
import { ContinuityType, resolutionType, aspectRatioType } from "@/utils/enum";
import { CaptionsConfig, VisualsConfig, VoiceConfig } from "@/lib/schema-generator";

export interface PromptConfig {
  image: string;
  video: string;
}

export interface UserScriptBlock {
  characterName: string;
  characterRole: "villain" | "hero" | "human" | "narrator";
  characterDescription: string;
  sceneDescription: string;
  videoDescription: string;
  voiceDescription: string;
  emotion: string;
  dialogue: string;
  productInteractionType?:
    | "packaging_hero"
    | "product_content_hero"
    | "packaging_in_hand"
    | "product_content_in_hand"
    | "packaging_on_surface"
    | "product_content_on_surface"
    | "product_reveal"
    | "none";
}

export interface CharacterConfig {
  id: string;
  name: string;
  role: "villain" | "hero" | "human" | "narrator";
  visualDescription: string;
  voiceDescription: string;
  emotion?: string;
  baseImageUrl?: string;
}

export interface VisualShot {
  type:
    | "product"
    | "generic"
    | "lifestyle"
    | "medical_cgi"
    | "metaphor"
    | "b-roll"
    | "character-speaking";
  category: string;
  videoPrompt?: string;
  scenePrompt?: string;
  words?: string;
  segmentId?: string;
  firstFrame?: string;
  firstFramePrompt?: string;
  imageUrl?: string;
  videoUrl?: string;

  // Character-driven fields
  characterId?: string;
  emotion?: string;
  cameraMotion?: string;

  status?: "completed" | "failed" | "generating";
  error?: string;

  productSizing?: string;
  display?: {
    from: number; // start time in milliseconds
    to: number; // end time in milliseconds
  };
  duration?: number; // duration in milliseconds
  effects?: { prompt: string; start: number; end: number }[];
}

export interface VisualBroll {
  time?: number;
  imageUrl?: string;
  videoUrl?: string;
  /** @deprecated use imageUrl or videoUrl */
  url?: string;
  duration?: number;
  type: "video" | "image";

  firstFrame?: string;
  firstFramePrompt?: string;
  videoPrompt?: string;
  scenePrompt?: string;
  words?: string;
  display?: {
    from: number; // start time in milliseconds
    to: number; // end time in milliseconds
  };
  displayMode?: "cutaway" | "overlay";
  position?: {
    x: number; // 0-100 percentage
    y: number; // 0-100 percentage
  };
  scale?: number; // 0-1 relative scale

  status?: "completed" | "failed" | "generating";
  error?: string;
}

export interface Segment {
  id: string;
  title: string;
  description: string;
  schema_id?: string | null;

  // From store.ts (Video/Clip specific)
  url?: string;
  trimStartTime?: string;
  trimEndTime?: string;
  preset?: string;
  hookScore?: number;
  retentionScore?: number;
  action?: string;
  isReframing?: boolean;
  isTranscribing?: boolean;
  soundEffects?: { start: number; url: string; duration?: number }[];
  bRolls?: VisualBroll[];
  assets?: SegmentAsset[]; // from Inngest utils
  status?: "trimming" | "reframing" | "transcribing" | "generating_sounds" | "editing" | "ready";

  // From types.ts (Schema/Script specific)
  text?: string;
  tags?: string[];
  prompt_preview?: string;
  prompts?: PromptConfig;
  shots?: VisualShot[];
  generatedImageUrls?: string[];
  continuity?: ContinuityType;
  duration?: number;
  clips?: any[];
  textToSpeech?: Record<string, any>;
  speechToText?: Record<string, any>;
  activeUrl?: string; // For backward compatibility if needed during migration
  // Character-driven fields
  characterId?: string;
  emotion?: string;
  cameraMotion?: string;
  firstFrameUrl?: string;
  imageUrl?: string;
  estimatedDuration?: number;
}

export interface VideoSchema {
  id: string;
  project_id?: string;
  generation_id?: string;
  script?: string;
  music?: { id: string; url: string };
  executionMode?: "test" | "live";
  expandImage?: boolean;
  secondsPerImage?: number;
  title: string;
  description: string;
  product?: { name?: string; description?: string };
  topic?: { name?: string; description?: string };
  promptPreview: string;
  preview?: Record<string, any>;
  tags: string[];
  voice: VoiceConfig;
  visuals: VisualsConfig;
  caption: CaptionsConfig;
  resolution: resolutionType;
  aspectRatio: aspectRatioType;
  animation?: boolean;
  isUGC?: boolean;
  type?:
    | "narrative-video"
    | "product-video-ad"
    | "product-image-ad"
    | "ugc-video-ad"
    | "fake-ugc-video-ad"
    | "character-driven-ad";
  audioMode?: "native-video-model" | "separate-tts";
  pacing?: "fast" | "slow" | "regular" | "dynamic" | "relaxed";
  characters?: CharacterConfig[];
  segments: Segment[];
  assets?: {
    id: string;
    name: string;
    url: string;
    type: "image" | "video";
  }[];
  avatar?: {
    id: string;
    name: string;
    url: string;
  };
  blocks?: UserScriptBlock[];
}
