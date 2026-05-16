import { aspectRatioType } from "@/utils/enum";
import { Generator, GenerationResponse } from "../interface";
import { SeedreamParams } from "./types";

export class Seedream45Provider implements Generator {
  private freepikUrl: string;
  private freepikApiKey: string;
  private readonly DEFAULT_POLL_INTERVAL = 15000;
  private readonly MAX_POLL_ATTEMPTS = 100;

  constructor(config: { freepikUrl: string; freepikApiKey: string }) {
    this.freepikUrl = config.freepikUrl;
    this.freepikApiKey = config.freepikApiKey;
  }

  async create(params: SeedreamParams): Promise<string> {
    let path = "text-to-image/seedream-v4-5";
    let name = "Seedream 4.5";
    if (params.imageUrls?.length) {
      path = "text-to-image/seedream-v4-5-edit";
      name = "Seedream 4.5-Edit";
    }

    let aspect_ratio_id = "social_story_9_16";
    if (params.aspectRatio === aspectRatioType.SIXTEEN_NINE) {
      aspect_ratio_id = "widescreen_16_9";
    } else if (params.aspectRatio === aspectRatioType.ONE) {
      aspect_ratio_id = "square_1_1";
    }

    const body = {
      prompt: params.prompt.trim(),
      aspect_ratio: aspect_ratio_id,
      guidance_scale: params.guidanceScale ?? 2.5,
      reference_images: params.imageUrls,
    };

    console.log(`${name.toUpperCase()}`, JSON.stringify(body, null, 2));

    const createResponse = await fetch(`${this.freepikUrl}/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-freepik-api-key": this.freepikApiKey,
      },
      body: JSON.stringify(body),
    });

    if (!createResponse.ok) {
      const error = await createResponse.text();
      console.error(error);
      throw new Error(`Failed to create ${name} task`);
    }

    const { data } = await createResponse.json();
    const taskId = data?.task_id;

    if (!taskId) throw new Error(`Invalid response from ${name} API: no task_id`);

    console.log(`✓ ${name} task created: ${taskId}`);

    return this.pollTask(taskId, path, name);
  }

  async getStatus(taskId: string, path?: string, name?: string): Promise<GenerationResponse> {
    if (path && name) {
      const response = await fetch(`${this.freepikUrl}/${path}/${taskId}`, {
        method: "GET",
        headers: {
          "x-freepik-api-key": this.freepikApiKey,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get ${name} status: ${response.status} - ${errorText}`);
      }

      const { data } = await response.json();

      if (!data || !data.task_id) throw new Error(`Invalid response from ${name} API`);

      return {
        id: data.task_id,
        status: data.status,
        url: data.generated?.[0] || undefined,
      };
    }

    const tryFetch = async (path: string, name: string) => {
      try {
        const response = await fetch(`${this.freepikUrl}/${path}/${taskId}`, {
          method: "GET",
          headers: {
            "x-freepik-api-key": this.freepikApiKey,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to get ${name} status: ${response.status} - ${errorText}`);
        }

        const { data } = await response.json();
        if (!data || !data.task_id) throw new Error(`Invalid response from ${name} API`);

        return {
          id: data.task_id,
          status: data.status,
          url: data.generated?.[0] || undefined,
        };
      } catch (error) {
        return null;
      }
    };

    // Try standard 4.5 first
    let result = await tryFetch("text-to-image/seedream-v4-5", "Seedream 4.5");
    if (result) return result;

    // Try 4.5-edit
    result = await tryFetch("text-to-image/seedream-v4-5-edit", "Seedream 4.5-Edit");
    if (result) return result;

    throw new Error(`Task ${taskId} not found in Seedream 4.5 nor 4.5-Edit`);
  }

  private async pollTask(taskId: string, path: string, name: string): Promise<string> {
    let attempts = 0;
    let consecutiveFailures = 0;
    let consecutiveErrors = 0;

    while (attempts < this.MAX_POLL_ATTEMPTS) {
      attempts++;

      try {
        const result = await this.getStatus(taskId, path, name);
        consecutiveErrors = 0;

        console.log(`⏳ [${name}] Attempt ${attempts} - Status: ${result.status}`);

        if (result.status === "COMPLETED") {
          if (!result.url) throw new Error("Task completed but no image URL returned");
          console.log(`🖼️ ${name} image generation completed: ${result.url}`);
          return result.url;
        }

        if (result.status === "FAILED") {
          consecutiveFailures++;
          if (consecutiveFailures >= 4) {
            throw new Error(`${name} task failed after 4 consecutive failure statuses`);
          }
        } else {
          consecutiveFailures = 0;
        }
      } catch (error) {
        consecutiveErrors++;
        console.error(`⚠️ [${name}] getStatus failed (attempt ${consecutiveErrors}):`, error);
        if (consecutiveErrors >= 4) throw new Error(`${name} polling failed: 4 consecutive errors`);
      }

      await new Promise((resolve) => setTimeout(resolve, this.DEFAULT_POLL_INTERVAL));
    }

    throw new Error(`${name} task timed out after ${attempts} attempts`);
  }
}
