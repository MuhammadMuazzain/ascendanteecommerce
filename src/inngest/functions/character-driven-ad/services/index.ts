import { GeminiService } from "@/lib/gemini/generator";
import { VideoGenerator } from "@/lib/video-generation";
import { ImageGenerator } from "@/lib/image-generation";
import { R2StorageService } from "@/lib/r2-storage";
import { TtsService } from "@/lib/tts";
import { config } from "../../../config";

export interface CharacterAdServices {
  gemini: GeminiService;
  videoGenerator: VideoGenerator;
  imageGenerator: ImageGenerator;
  r2: R2StorageService;
  tts: TtsService;
}

/**
 * Specialized service initialization for Character-Driven Ads.
 * Uses Nano Banana 2 (Gemini-2.5-Flash-Image-Preview) for character seeds
 * and Veo 3.1 Fast for final lip-synced videos.
 */
export function initializeCharacterAdServices(): CharacterAdServices {
  const gemini = new GeminiService(config.gemini.key, config.gemini.imageModel);
  const VEO_MODEL = "veo-3.1-lite-generate-preview";

  // Video Generator: Veo 3.1 Fast
  const videoGenerator = new VideoGenerator({
    provider: "veo",
    params: {
      geminiApiKey: config.gemini.key,
      model: VEO_MODEL,
    },
  });

  // Image Generator: Nano Banana 2 (Gemini 2.5 Preview)
  const imageGenerator = new ImageGenerator({
    provider: "gemini",
    params: {
      apiKey: config.gemini.key,
      model: config.gemini.imageModel, // Correctly point to the nano-banana-2 model
    },
  });

  const r2 = new R2StorageService({
    bucketName: config.r2.bucket,
    accessKeyId: config.r2.accessKeyId,
    secretAccessKey: config.r2.secretAccessKey,
    accountId: config.r2.accountId,
    cdn: config.r2.cdn,
  });

  return {
    gemini,
    videoGenerator,
    imageGenerator,
    r2,
    tts: new TtsService(config.elevenLabs.url, config.elevenLabs.key, config.elevenLabs.model),
  };
}
