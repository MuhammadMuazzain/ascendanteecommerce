import { VideoType } from "@/utils/enum";
import { TranscriptObject } from "../transcribe";

export interface VoiceConfig {
  id?: string;
  name?: string;
  speed?: number;
  url?: string;
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
  baseImageUrl?: string;
}

export interface VisualsConfig {
  type: VideoType;
  style: string;
}

export interface AnimationParams {
  x?: number;
  y?: number;
  scale?: number;
  opacity?: number;
  blur?: number;
  angle?: number;
  brightness?: number;
  width?: number; // Some animations might use width/height
  height?: number;
}

export interface CustomAnimation {
  type: "keyframes";
  params: {
    "0%": AnimationParams;
    "100%": AnimationParams;
  };
  duration?: number;
  easing?: string;
}

export interface MusicConfig {
  id: string;
  url: string;
}

// Removed SchemaInput
export interface CaptionsConfig {
  id: string;
  name: string;
  position: "top" | "middle" | "bottom";
  size: "small" | "medium" | "large";
}

export interface VisualPrompts {
  image: string;
  video: string;
}

export interface MediaAsset {
  url: string;
  thumbnail?: string;
  duration?: number;
  photographer?: string;
  alt?: string;
  type: "image" | "video";
}

export interface Clip {
  id: string; // Made required for easier tracking
  refId?: string;
  type: string;
  src?: string[]; // Legacy/Stock use
  url?: string; // UGC/AI use
  previewSrc?: string;
  duration?: number;
  display?: {
    from: number;
    to: number;
  };
  active?: boolean;
  prompt?: string;
  status?: "generating" | "completed" | "failed";
  taskId?: string;
  error?: string;
  progress?: number;
  createdAt?: number;
  isVisualOnly?: boolean;
  isCloned?: boolean;
}

export interface TextToSpeech {
  refId: string;
  src: string;
  duration: number;
}

export interface VisualShot {
  id?: string;
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
  triggerWords?: string;
  hasProductInteraction?: boolean;
  productSizing?: string;
  imageUrl?: string;
  videoUrl?: string;
  duration?: number;
  display?: {
    from: number;
    to: number;
  };
  trim?: {
    from: number;
    to: number;
  };
  // Character-driven fields
  characterId?: string;
  dialogue?: string;
  emotion?: string;
  cameraMotion?: string;

  status?: "completed" | "failed" | "generating";
  progress?: number;
  error?: string;
  model?: string;
  generationId?: string;
}

export interface VisualBroll {
  time?: number;
  url?: string;
  duration?: number;
  type: "video" | "image";

  firstFrame?: string;
  firstFramePrompt?: string;
  videoPrompt?: string;
  scenePrompt?: string;
  words?: string;
  productSizing?: string;

  imageUrl?: string;
  videoUrl?: string;
  status?: "completed" | "failed" | "generating";
  progress?: number;
  error?: string;
  generationId?: string;
}

export interface SpeechToText {
  refId: string;
  src: string;
}

export interface Segment {
  id: string;
  title: string;
  text: string;
  description: string;
  searchQuery: string;
  tags: string[];
  prompt_preview?: string;
  prompts?: VisualPrompts;
  shots?: VisualShot[];
  bRolls?: VisualBroll[];
  duration: number;
  assets?: Clip[];
  textToSpeech?: TextToSpeech;
  speechToText?: SpeechToText;
  mergeWithNext?: boolean;
  voiceId?: string; // For voice alignment
  transcription?: TranscriptObject;
  estimatedDuration?: number;
  isContinuation?: boolean;
  // Character-driven fields
  characterId?: string;
  dialogue?: string;
  emotion?: string;
  cameraMotion?: string;
  // Legacy fields
  audioUrl?: string;
  audioDuration?: number;
  audioBlob?: Blob;
  media?: MediaAsset[];
  soundEffects?: { start: number; url: string; duration?: number; volume?: number }[];
}

export interface Schema {
  id?: string;
  title?: string;
  description?: string;
  tags?: string[];
  prompt_preview?: string;
  segments?: Segment[];
  voice: VoiceConfig;
  visuals: VisualsConfig;
  music?: MusicConfig;
  caption: CaptionsConfig;
  aspectRatio: "1:1" | "16:9" | "9:16" | "11";
  topic?: { name?: string; description?: string };
  product?: { name?: string; description?: string };
  animation?: boolean;
  animationBehavior?: "expansion" | "mirror";
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
  type?:
    | "narrative-video"
    | "product-video-ad"
    | "product-image-ad"
    | "ugc-video-ad"
    | "fake-ugc-video-ad"
    | "character-driven-ad";
  audioMode?: "native-video-model" | "separate-tts";
  characters?: CharacterConfig[];
  script?: string;
  blocks?: UserScriptBlock[];
  scriptTone?: string;
  pacing?: "fast" | "slow" | "regular" | "dynamic" | "relaxed";
  // Additional configuration for generic video generation
  quality?: "regular" | "high";
  duration?: 30 | 45 | 60;
  secondsPerImage?: number;
  expandImage?: boolean;
  productImage?: {
    id: string;
    name: string;
    url: string;
  };
  productImages?: {
    id: string;
    name: string;
    url: string;
  }[];
}
