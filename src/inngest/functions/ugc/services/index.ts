import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { GeminiService } from "@/lib/gemini/generator";
import { VideoGenerator } from "@/lib/video-generation";
import { ImageGenerator } from "@/lib/image-generation";
import { R2StorageService } from "@/lib/r2-storage";
import { SttService } from "@/lib/transcribe/deepgram";
import { TtsService } from "@/lib/tts";
import { config } from "../../../config";

export interface UgcServices {
  gemini: GeminiService;
  elevenlabs: ElevenLabsClient;
  videoGenerator: VideoGenerator;
  imageGenerator: ImageGenerator;
  r2: R2StorageService;
  stt: SttService;
  tts: TtsService;
}

export function initializeUgcServices(): UgcServices {
  const gemini = new GeminiService(config.gemini.key, config.gemini.imageModel);

  const elevenlabs = new ElevenLabsClient({
    apiKey: config.elevenLabs.key,
  });

  const videoGenerator = new VideoGenerator({
    provider: "veo",
    params: {
      geminiApiKey: config.gemini.key,
    },
  });

  const imageGenerator = new ImageGenerator({
    provider: "gemini",
    params: {
      apiKey: config.gemini.key,
      model: config.gemini.imageModel,
    },
  });

  const r2 = new R2StorageService({
    bucketName: config.r2.bucket,
    accessKeyId: config.r2.accessKeyId,
    secretAccessKey: config.r2.secretAccessKey,
    accountId: config.r2.accountId,
    cdn: config.r2.cdn,
  });

  const stt = new SttService(config.deepgram.url, config.deepgram.key, config.deepgram.model);

  const tts = new TtsService(config.elevenLabs.url, config.elevenLabs.key, config.elevenLabs.model);

  return {
    gemini,
    elevenlabs,
    videoGenerator,
    imageGenerator,
    r2,
    stt,
    tts,
  };
}
