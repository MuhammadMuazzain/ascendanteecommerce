import type { Voice, ScriptBlock } from "@/types/video-generation";
import type { VisualsConfig, UserScriptBlock } from "@/lib/schema-generator/types";
import { VideoType, FrameStyle } from "@/utils/enum";
import { CAPTION_PRESET_TIKTOK_MEDIUM_ID } from "@/lib/caption-presets";

export const UGC_DEFAULT_CAPTION = {
  id: CAPTION_PRESET_TIKTOK_MEDIUM_ID,
  name: "TikTok Text Medium",
  position: "bottom" as const,
  size: "medium" as const,
};

function getDefaultCaptionForType(type?: GenerateScriptParams["type"]) {
  if (type === "ugc-video-ad" || type === "fake-ugc-video-ad") {
    return UGC_DEFAULT_CAPTION;
  }
  return {
    id: "caption-7",
    name: "Modern",
    position: "bottom" as const,
    size: "medium" as const,
  };
}

export const STEPS = {
  CONFIG: 1,
  GENERATING: 2,
} as const;

export type Step = (typeof STEPS)[keyof typeof STEPS];

export interface GenerateScriptParams {
  script: string;
  voice: Voice;
  aspectRatio: "16:9" | "9:16" | "1:1";
  visuals: VisualsConfig;
  caption: {
    id: string;
    name: string;
    position: "top" | "middle" | "bottom";
    size: "small" | "medium" | "large";
  };
  music?: {
    id: string;
    url: string;
  };
  animation?: boolean;
  animationBehavior?: "expansion" | "mirror";
  quality?: "regular" | "high";
  duration?: 30 | 45 | 60;
  secondsPerImage?: number;
  expandImage?: boolean;
  assets?: {
    id: string;
    name: string;
    url: string;
    type: "image" | "video";
  }[];
  product?: {
    name: string;
    description: string;
  };
  avatar?: {
    id: string;
    name: string;
    url: string;
  };
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
  type?:
    | "narrative-video"
    | "product-video-ad"
    | "product-image-ad"
    | "ugc-video-ad"
    | "fake-ugc-video-ad"
    | "character-driven-ad";
  pacing?: "fast" | "regular" | "relaxed";
  blocks?: UserScriptBlock[];
}

interface DefaultGenerationParamsOptions {
  script?: string;
  blocks?: UserScriptBlock[];
  type?: GenerateScriptParams["type"];
}

export const defaultGenerationParams = (
  options: DefaultGenerationParamsOptions = {},
): Partial<GenerateScriptParams> => ({
  aspectRatio: "9:16",
  script: options.script ?? "",
  visuals: {
    type: VideoType.AI_VIDEOS,
    style: FrameStyle.Cinematic,
  },
  caption: getDefaultCaptionForType(options.type),
  quality: "regular",
  duration: 30,
  animation: true,
  animationBehavior: "mirror",
  avatar: undefined,
  voice: {
    id: "CwhRBWXzGAHq8TQ4Fs17",
    name: "Will",
    language: "en",
    gender: "male",
    accent: "American",
    previewUrl: "https://cdn.designcombo.dev/voices/CwhRBWXzGAHq8TQ4Fs17.mp3",
  },
  type: options.type ?? "narrative-video",
  pacing: "regular",
  blocks: options.blocks ?? [],
});
