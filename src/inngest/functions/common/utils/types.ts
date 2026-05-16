import { GeneratedMedia, Segment, PriceItem, VideoSegment } from "@/inngest/utils/types";

import { CaptionsConfig, VisualsConfig, VoiceConfig } from "@/lib/schema-generator";

import { aspectRatioType, resolutionType } from "@/utils/enum";

export interface ScraperPipelineResult {
  preview: string;
  segResults: VideoSegment[];
  prices: PriceItem[];
}

export interface VisualResult {
  id: string;
  generatedMedia: GeneratedMedia[];
  preview?: string;
  caption: string;
  audio: string;
  duration: number;
  originalDuration: number;
  excludeVideoIds: number[];
  prices: PriceItem[];
}

export interface VideoConfig {
  voice: VoiceConfig;
  visuals: VisualsConfig;
  caption: CaptionsConfig;
  resolution: resolutionType;
  aspectRatio: aspectRatioType;
  expandImage?: boolean;
  secondsPerImage?: number;
  assets?: {
    id: string;
    name: string;
    url: string;
    type: "image" | "video";
  }[];
  topic?: string;
  description?: string;
  avatar?: {
    id: string;
    name: string;
    url: string;
  };
}

export interface VideoData {
  title: string;
  promptPreview: string;
  segments: Segment[];
  step: any;
  publish?: any;
  channel?: string;
}
