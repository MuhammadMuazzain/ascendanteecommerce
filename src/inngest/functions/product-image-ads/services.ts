import { config } from "@/inngest/config";
import { DistributedSemaphore } from "@/inngest/services/semaphore";
import { SttService } from "@/lib/transcribe/deepgram";
import { TtsService } from "@/lib/tts";
import { R2StorageService } from "@/lib/r2-storage";
import { OpenAIService } from "@/lib/openai";
import { StockVideoService } from "@/lib/stock/video";
import { GeminiService } from "@/lib/gemini/generator";
import { ImageGenerator } from "@/lib/image-generation";
import { LipSyncService } from "@/lib/lip-sync-generator";
import { PipelineServices } from "../common/steps/types";

export function initializeServices(): any {
  const elevenLabsSemaphore = new DistributedSemaphore("elevenlabs:tts_slots", 2, 30000);

  const tts = new TtsService(
    config.elevenLabs.url,
    config.elevenLabs.key,
    config.elevenLabs.model,
    elevenLabsSemaphore,
  );

  const stt = new SttService(config.deepgram.url, config.deepgram.key, config.deepgram.model);

  const openaiTranscriber = new OpenAIService(config.openai.key, config.openai.transcriptionModel);

  const gemini = new GeminiService(config.gemini.key, config.gemini.imageModel);

  const imageGenerator = new ImageGenerator({
    provider: "gemini",
    params: {
      apiKey: config.gemini.key,
      model: config.gemini.imageModel,
    },
  });

  const pexels = new StockVideoService(config.pexels.url, config.pexels.key);

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
    openaiTranscriber,
    gemini,
    imageGenerator,
    pexels,
    storage,
    lipSyncService,
  };
}
