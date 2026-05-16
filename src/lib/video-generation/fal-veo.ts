import { fal } from "@fal-ai/client";
import { VideoParams, VideoStatusResponse } from "./types";
import { Generator } from "./interface";

export class FalVeoProvider implements Generator {
  private apiKey: string;
  private model?: string;

  constructor(config: { apiKey: string; model?: string }) {
    this.apiKey = config.apiKey;
    this.model = config.model;
    // Set FAL_KEY globally for the client
    process.env.FAL_KEY = config.apiKey;
  }

  async create(params: VideoParams): Promise<{ url: string; duration: number }> {
    const modelToUse = this.determineModel(params);

    // Normalize input based on the model type
    const input: any = {
      prompt: params.prompt || params.videoPrompt || "",
      aspect_ratio:
        params.aspectRatio === "9:16" ? "9:16" : params.aspectRatio === "16:9" ? "16:9" : "auto",
      duration: params.durationSeconds ? `${params.durationSeconds}s` : "8s",
      resolution: "720p",
      auto_fix: (params as any).autoFix ?? true,
    };

    if (params.negativePrompt) {
      input.negative_prompt = params.negativePrompt;
    }

    if ((params as any).safetyTolerance) {
      input.safety_tolerance = (params as any).safetyTolerance;
    }

    // Model specialized input fields
    if (modelToUse.includes("first-last-frame-to-video")) {
      input.first_frame_url = params.firstFrameUrl;
      input.last_frame_url = params.lastFrameUrl;
    } else if (modelToUse.includes("reference-to-video")) {
      input.image_urls =
        params.referenceImageUrls || (params.firstFrameUrl ? [params.firstFrameUrl] : []);
    } else if (params.firstFrameUrl) {
      input.image_url = params.firstFrameUrl;
    } else if (params.referenceImageUrls && params.referenceImageUrls.length > 0) {
      input.image_url = params.referenceImageUrls[0];
    }

    console.log(`[FalVeo] Using model: ${modelToUse}`);
    console.log(`[FalVeo] Input:`, JSON.stringify(input, null, 2));

    const result: any = await fal.subscribe(modelToUse, {
      input,
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          update.logs.map((log) => log.message).forEach((msg) => console.log(`[FalVeo] ${msg}`));
        }
      },
    });

    if (!result.data || !result.data.video || !result.data.video.url) {
      throw new Error(`Fal generation failed: ${JSON.stringify(result.data)}`);
    }

    return {
      url: result.data.video.url,
      duration: params.durationSeconds || 8,
    };
  }

  private determineModel(params: VideoParams): string {
    let baseModel = this.model || "fal-ai/veo3.1/lite/image-to-video";

    // If both frames are provided, switch to first-last frame model if applicable
    if (params.firstFrameUrl && params.lastFrameUrl) {
      if (baseModel.includes("lite/image-to-video")) {
        return "fal-ai/veo3.1/lite/first-last-frame-to-video";
      }
      if (baseModel.includes("fast/image-to-video")) {
        return "fal-ai/veo3.1/fast/first-last-frame-to-video";
      }
    }

    // If reference images are provided and it's not already a reference model
    if (
      params.referenceImageUrls &&
      params.referenceImageUrls.length > 0 &&
      !baseModel.includes("reference-to-video")
    ) {
      return "fal-ai/veo3.1/reference-to-video";
    }

    return baseModel;
  }

  async getStatus(id: string): Promise<VideoStatusResponse> {
    return { id, status: "COMPLETED", videos: [] };
  }
}
