import { TtsService } from "@/lib/tts";
import { SttService } from "@/lib/transcribe/deepgram";
import { OpenAIService } from "@/lib/openai";
import { GeminiService } from "@/lib/gemini/generator";
import { ImageGenerator } from "@/lib/image-generation";
import { VideoGenerator } from "@/lib/video-generation";
import { StockVideoService } from "@/lib/stock/video";
import { LipSyncService } from "@/lib/lip-sync-generator";
import { R2StorageService } from "@/lib/r2-storage";
import { VideoSchema } from "@/types/segment";

export interface PipelineServices {
  tts: TtsService;
  stt: SttService;
  openaiTranscriber: OpenAIService;
  gemini: GeminiService;
  imageGenerator: ImageGenerator;
  videoGenerator: VideoGenerator;
  pexels: StockVideoService;
  lipSyncService: LipSyncService;
  storage: R2StorageService;
}

export interface StepContext {
  services: PipelineServices;
  scheme: VideoSchema;
  schemeId: string;
  attempt: number;
}
