import { VideoParams, VideoStatusResponse } from "./types";
import { Generator } from "./interface";
import { resolutionType } from "@/utils/enum";

export class PixVerseProvider implements Generator {
  private readonly DEFAULT_POLL_INTERVAL = 15000;
  private readonly MAX_POLL_ATTEMPTS = 100;

  constructor(private config: { url: string; apiKey: string; resolution?: resolutionType }) {}

  async create(params: VideoParams): Promise<string> {
    const path = "image-to-video/pixverse-v5";

    // Freepik PixVerse V5 only supports 5 or 8 seconds.
    // Round to the closest valid duration.
    const requestedDuration = params.durationSeconds || 5;
    const finalDuration = requestedDuration <= 6.5 ? 5 : 8;

    const body = {
      image_url: params.firstFrameUrl,
      prompt: params.prompt?.trim() || "",
      resolution: params.resolution || this.config.resolution || resolutionType.Low,
      duration: finalDuration,
    };
    return this.createTask(path, body, "PixVerse");
  }

  private async createTask(path: string, body: any, name: string): Promise<string> {
    const taskId = await this.submitTask(path, body, name);
    return this.pollTask(taskId, path, name);
  }

  private async submitTask(path: string, body: any, name: string): Promise<string> {
    console.log(`${name.toUpperCase()}-CREATE-VIDEO`, JSON.stringify(body, null, 2));

    const response = await fetch(`${this.config.url}/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-freepik-api-key": this.config.apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create ${name} video task: ${error}`);
    }

    const { data } = await response.json();
    const taskId = data?.task_id;

    if (!taskId) throw new Error(`Invalid response from ${name} API: no task_id`);
    console.log(`✓ ${name} video task created: ${taskId}`);

    return taskId;
  }

  async getStatus(taskId: string): Promise<VideoStatusResponse> {
    const path = "image-to-video/pixverse-v5";
    const response = await fetch(`${this.config.url}/${path}/${taskId}`, {
      method: "GET",
      headers: {
        "x-freepik-api-key": this.config.apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get video status: ${response.status} - ${errorText}`);
    }

    const { data } = await response.json();
    if (!data || !data.task_id) throw new Error(`Invalid response from API`);

    return {
      id: data.task_id,
      status: data.status,
      videos: data.generated || [],
    };
  }

  private async pollTask(taskId: string, path: string, name: string): Promise<string> {
    let attempts = 0;
    while (attempts < this.MAX_POLL_ATTEMPTS) {
      attempts++;
      try {
        const result = await this.getStatus(taskId);
        console.log(`⏳ [${name}] Attempt ${attempts} - Status: ${result.status}`);

        if (result.status === "COMPLETED") {
          if (!result.videos?.length) throw new Error("Task completed but no video URLs returned");
          console.log(`🎬 [${name}] video generation completed: ${result.videos[0]}`);
          return result.videos[0];
        }

        if (result.status === "FAILED") {
          throw new Error(`${name} task failed`);
        }
      } catch (error) {
        console.error(`⚠️ [${name}] getStatus failed (attempt ${attempts}):`, error);
        if (attempts >= 4) throw new Error(`${name} polling failed: 4 consecutive errors`);
      }
      await new Promise((resolve) => setTimeout(resolve, this.DEFAULT_POLL_INTERVAL));
    }
    throw new Error(`${name} task timed out after ${attempts} attempts`);
  }
}
