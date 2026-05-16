import { VideoParams, VideoStatusResponse } from "./types";
import { Generator } from "./interface";
import { kie } from "@/lib/kie";

export class RunwayProvider implements Generator {
  private readonly DEFAULT_POLL_INTERVAL = 15000;
  private readonly MAX_POLL_ATTEMPTS = 100;

  constructor(private config: { apiKey: string; resolution?: string }) {}

  async create(params: VideoParams): Promise<string> {
    const body = {
      prompt: params.prompt?.trim() || "",
      imageUrl: params.firstFrameUrl,
      duration: params.durationSeconds || 5,
      aspectRatio: params.aspectRatio || "9:16",
      quality: params.resolution || "720p",
    };
    return this.createKieRunwayTask(body, "Runway");
  }

  private async createKieRunwayTask(body: any, name: string): Promise<string> {
    const taskId = await this.submitKieRunwayTask(body, name);
    return this.pollKieRunwayTask(taskId, name);
  }

  private async submitKieRunwayTask(body: any, name: string): Promise<string> {
    console.log(`${name.toUpperCase()}-CREATE-VIDEO-REQUEST:`, JSON.stringify(body, null, 2));

    const { data, ok, status } = await kie.generateRunwayVideo(body);

    console.log(`${name.toUpperCase()}-CREATE-VIDEO-RESPONSE:`, JSON.stringify(data, null, 2));

    if (!ok) {
      throw new Error(
        `Failed to create ${name} video task (HTTP ${status}): ${data?.msg || "Unknown error"}`,
      );
    }

    if (data?.code !== 200 && data?.code !== undefined) {
      throw new Error(`Kie API Error (${data?.code}): ${data?.msg || "Unknown error"}`);
    }

    const taskId = data?.data?.taskId || data?.taskId;

    if (!taskId || typeof taskId !== "string") {
      throw new Error(`Invalid response from ${name} API: no valid taskId in response`);
    }

    console.log(`✓ ${name} video task created: ${taskId}`, JSON.stringify(body, null, 2));

    return taskId;
  }

  async getStatus(taskId: string): Promise<VideoStatusResponse> {
    const { data, ok } = await kie.getRunwayStatus(taskId);
    if (!ok) throw new Error(`Failed taskId ${taskId} to fetch status`);

    const result = data?.data || data;
    if (!result) throw new Error("Empty response from status API");

    let status = "IN_PROGRESS";
    if (result.state === "success") status = "COMPLETED";
    if (result.state === "fail") status = "FAILED";

    return {
      id: taskId,
      status: status,
      videos: result.videoInfo?.videoUrl ? [result.videoInfo.videoUrl] : [],
      error: result.failMsg,
    };
  }

  private async pollKieRunwayTask(taskId: string, name: string): Promise<string> {
    let attempts = 0;
    while (attempts < this.MAX_POLL_ATTEMPTS) {
      attempts++;
      try {
        const result = await this.getStatus(taskId);
        console.log(`⏳ [${name}] Attempt ${attempts} - Status: ${result.status}`);

        if (result.status === "COMPLETED") {
          if (!result.videos?.[0]) throw new Error("Task completed but no video URL returned");
          console.log(`🎬 [${name}] video generation completed: ${result.videos[0]}`);
          return result.videos[0];
        }

        if (result.status === "FAILED") {
          throw new Error(`${name} task failed: ${result.error}`);
        }
      } catch (error) {
        console.error(`⚠️ [${name}] status failed (attempt ${attempts}):`, error);
        if (attempts >= 10) throw new Error(`${name} polling failed: 10 consecutive errors`);
      }
      await new Promise((resolve) => setTimeout(resolve, this.DEFAULT_POLL_INTERVAL));
    }
    throw new Error(`${name} task timed out after ${attempts} attempts`);
  }
}
