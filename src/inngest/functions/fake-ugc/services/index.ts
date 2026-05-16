import { config } from "@/inngest/config";
import { DistributedSemaphore } from "@/inngest/services/semaphore";
import { SttService } from "@/lib/transcribe/deepgram";
import { TtsService } from "@/lib/tts";
import { R2StorageService } from "@/lib/r2-storage";
import { GeminiService } from "@/lib/gemini/generator";
import { ImageGenerator } from "@/lib/image-generation";
import { VideoGenerator } from "@/lib/video-generation";
import { LipSyncService } from "@/lib/lip-sync-generator";
import { PipelineServices } from "../../common/steps/types";

export function initializeFakeUgcServices(): PipelineServices {
  const elevenLabsSemaphore = new DistributedSemaphore("elevenlabs:tts_slots", 2, 30000);

  const tts = new TtsService(
    config.elevenLabs.url,
    config.elevenLabs.key,
    config.elevenLabs.model,
    elevenLabsSemaphore,
  );

  const stt = new SttService(config.deepgram.url, config.deepgram.key, config.deepgram.model);

  const gemini = new GeminiService(config.gemini.key, config.gemini.imageModel);

  const imageGenerator = new ImageGenerator({
    provider: "gemini",
    params: {
      apiKey: config.gemini.key,
      model: "gemini-3.1-flash-image-preview", // nano-banana-2
    },
  });

  const videoGenerator = new VideoGenerator({
    provider: "veo",
    params: {
      geminiApiKey: config.gemini.key,
      model: "veo-3.1-lite-generate-preview",
    },
  });

  const storage = new R2StorageService({
    bucketName: config.r2.bucket,
    accessKeyId: config.r2.accessKeyId,
    secretAccessKey: config.r2.secretAccessKey,
    accountId: config.r2.accountId,
    cdn: config.r2.cdn,
  });

  const lipSyncService = new LipSyncService(config.freepik.url, config.freepik.key);

  return {
    tts,
    stt,
    gemini,
    imageGenerator,
    videoGenerator,
    storage,
    lipSyncService,
  } as any;
}
