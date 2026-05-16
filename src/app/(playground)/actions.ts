"use server";

import { ExpandImageService } from "@/lib/expand-image";
import { ImageGenerator } from "@/lib/image-generation";
import { createStyledPrompt } from "@/lib/prompts";
import { VideoGenerator } from "@/lib/video-generation";
import { StockVideoService } from "@/lib/stock/video";
import { StockImageService } from "@/lib/stock/image";
import { TtsService } from "@/lib/tts";
import { SttService } from "@/lib/transcribe/deepgram";
import { config } from "@/inngest/config";
import { DistributedSemaphore } from "@/inngest/services/semaphore";
import { resolutionType } from "@/utils/enum";

// --- SERVICES ---

const expandService = new ExpandImageService(config.freepik.url, config.freepik.key);

const imageGenerator = new ImageGenerator({
  provider: "seedream45",
  params: {
    freepikUrl: config.freepik.url,
    freepikApiKey: config.freepik.key,
  },
});

const videoGenerator = new VideoGenerator({
  provider: "veo",
  params: {
    geminiApiKey: config.gemini.key,
    resolution: "1080p",
  },
});

const stockVideoService = new StockVideoService(config.pexels.url, config.pexels.key);

const stockImageService = new StockImageService(config.pixabay.url, config.pixabay.key);

const elevenLabsSemaphore = new DistributedSemaphore("elevenlabs:tts_slots", 5, 30000);

const ttsService = new TtsService(
  config.elevenLabs.url,
  config.elevenLabs.key,
  config.elevenLabs.model,
  elevenLabsSemaphore,
);

const sttService = new SttService(config.deepgram.url, config.deepgram.key, config.deepgram.model);

// --- ACTIONS ---

// 1. Expand Image
export async function expandImageAction(params: {
  image: string;
  prompt?: string;
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
}) {
  try {
    const result = await expandService.expand(params);
    return { success: true, url: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 2. Image Generation
export async function generateSeedreamAction(params: any) {
  try {
    const styledPrompt = createStyledPrompt(params.prompt, {
      styleDescription: params.style,
    });
    const result = await imageGenerator.create({
      ...params,
      prompt: styledPrompt,
    });
    return { success: true, url: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function generateGeminiAction(params: any) {
  try {
    const styledPrompt = createStyledPrompt(params.prompt, {
      styleDescription: params.style,
      isProduct: params.isProduct,
    });
    const result = await imageGenerator.create({
      ...params,
      prompt: styledPrompt,
    });
    return { success: true, base64: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function generateGeminiV3Action(params: any) {
  try {
    const styledPrompt = createStyledPrompt(params.prompt, {
      styleDescription: params.style,
      isProduct: params.isProduct,
    });
    const result = await imageGenerator.create({
      ...params,
      prompt: styledPrompt,
    });
    return { success: true, base64: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function generateGeminiV2Action(params: any) {
  try {
    const styledPrompt = createStyledPrompt(params.prompt, {
      styleDescription: params.style,
      isProduct: params.isProduct,
    });
    const result = await imageGenerator.create({
      ...params,
      prompt: styledPrompt,
    });
    return { success: true, base64: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 3. Video Generation
export async function generateWanAction(params: any) {
  try {
    const videoGenerator = new VideoGenerator({
      provider: "wan",
      params: {
        url: config.freepik.url,
        apiKey: config.freepik.key,
      },
    });
    const result = await videoGenerator.create(params);
    return { success: true, url: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function generatePixVerseAction(params: any) {
  try {
    const videoGenerator = new VideoGenerator({
      provider: "pixverse",
      params: {
        url: config.freepik.url,
        apiKey: config.freepik.key,
        resolution: resolutionType.Low,
      },
    });

    const result = await videoGenerator.create(params);
    return { success: true, url: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function generateHailuoAction(params: any) {
  try {
    const videoGenerator = new VideoGenerator({
      provider: "hailuo",
      params: {
        url: config.freepik.url,
        apiKey: config.freepik.key,
      },
    });
    const result = await videoGenerator.create(params);
    return { success: true, url: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function generateRunwayAction(params: any) {
  try {
    const videoGenerator = new VideoGenerator({
      provider: "runway",
      params: {
        apiKey: config.freepik.key,
      },
    });
    const result = await videoGenerator.create(params);
    return { success: true, url: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Veo Specific Actions
export async function getVeoStatusAction(operationName: string) {
  try {
    const result = await videoGenerator.getStatus(operationName);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function generateVeoLocalAction(params: any) {
  try {
    const result = await videoGenerator.getStatus(params);
    return { success: true, url: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 4. Stock
export async function searchPexelsVideosAction(query: string) {
  try {
    const result = await stockVideoService.searchVideos({
      query,
      per_page: 10,
    });
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function searchPixabayVideosAction(query: string) {
  try {
    const result = await stockImageService.searchVideos({
      query,
      per_page: 10,
    });
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 5. TTS
export async function getVoicesAction() {
  try {
    const result = await ttsService.getVoices({});
    return { success: true, data: result.voices };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function synthesizeSpeechAction(text: string, voiceId: string) {
  try {
    const result = await ttsService.synthesize(text, voiceId);
    if (!result.success) throw new Error("Synthesis failed");
    // Convert ArrayBuffer to base64 for client
    const base64 = Buffer.from(result.buffer).toString("base64");
    return { success: true, audioBase64: base64 };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 6. Transcribe
export async function transcribeAudioAction(formData: FormData) {
  // Not implemented
  return { success: false, error: "Not implemented" };
}

export async function transcribeUrlAction(url: string) {
  try {
    const result = await sttService.transcribeV2(url);
    return { success: true, data: result.data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 7. Repurpose Video
import { inngest } from "@/inngest/client";

export async function triggerRepurposeAction(url: string, name: string, productName?: string) {
  try {
    await inngest.send({
      name: "video/repurpose",
      data: { url, name, productName },
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
