import { resolutionType } from "@/utils/enum";
import { VideoGenerationReferenceType } from "@google/genai";

export interface ReferenceImage {
  image: {
    imageBytes?: string;
    mimeType?: string;
    uri?: string;
  };
  referenceType: VideoGenerationReferenceType;
}

export interface VideoParams {
  prompt?: string;
  style: string;
  firstFrameUrl?: string; // First frame (start of video)
  lastFrameUrl?: string; // Last frame (end of video) for smooth transitions
  videoUrl?: string; // Video URL for video extension
  durationSeconds?: number;
  aspectRatio?: string;
  model?: string;
  text?: string;
  scenePrompt?: string;
  videoPrompt?: string;
  referenceImages?: ReferenceImage[];
  referenceImageUrls?: string[];
  resolution?: resolutionType;
  negativePrompt?: string;
  dialogue?: string;
  voiceDescription?: string;
}

export interface VideoStatusResponse {
  id: string;
  status: string; // 'CREATED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
  videos: string[];
  duration?: number; // Duration in seconds
  error?: string;
}
