import { LatentSyncParams, LatentSyncStatusResponse } from "./types";

const DEFAULT_POLL_INTERVAL = 5000; // 5 seconds
const MAX_POLL_ATTEMPTS = 60; // 60 * 5s = 5 minutes

export class LipSyncService {
  private url: string;
  private apiKey: string;
  private webhookUrl?: string;

  constructor(url: string, apiKey: string, webhookUrl?: string) {
    this.url = url;
    this.apiKey = apiKey;
    this.webhookUrl = webhookUrl;
  }

  async sync(params: LatentSyncParams): Promise<string> {
    console.log("LATENT-SYNC-VIDEO", {
      video: params.videoUrl,
      audio: params.audioUrl,
    });

    const body = {
      video_url: params.videoUrl,
      audio_url: params.audioUrl,
      //seed: params.seed ?? 0,
      //guidance_scale: params.guidanceScale ?? 1,
      //return_private_url: params.returnPrivateUrl ?? false,
      //webhook_url: this.webhookUrl,
    };

    const createResponse = await fetch(`${this.url}/lip-sync/latent-sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-freepik-api-key": this.apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`Failed to create latent-sync task: ${createResponse.status} - ${errorText}`);
    }

    const { data } = await createResponse.json();
    const taskId = data?.task_id;

    if (!taskId) throw new Error("Invalid response from API: no task_id");

    console.log(`✓ Latent Sync task created: ${taskId}`);

    return this.pollTask(taskId);
  }

  async getStatus(taskId: string): Promise<LatentSyncStatusResponse> {
    try {
      const response = await fetch(`${this.url}/lip-sync/latent-sync/${taskId}`, {
        method: "GET",
        headers: {
          "x-freepik-api-key": this.apiKey,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed-${taskId} to get status: ${response.status} - ${errorText}`);
      }

      const { data } = await response.json();

      if (!data || !data.task_id) throw new Error("Invalid response from Freepik API");

      return {
        id: data.task_id,
        status: data.status,
        videos: data.generated || [],
      };
    } catch (error) {
      console.error(`getStatus-${taskId} failed: ${(error as Error).message}`);
      throw error;
    }
  }

  private async pollTask(taskId: string): Promise<string> {
    let attempts = 0;
    let consecutiveFailures = 0;
    let consecutiveGetStatusErrors = 0;

    while (attempts < MAX_POLL_ATTEMPTS) {
      attempts++;

      let statusResult: LatentSyncStatusResponse | null = null;

      try {
        statusResult = await this.getStatus(taskId);
        consecutiveGetStatusErrors = 0;
      } catch (error) {
        consecutiveGetStatusErrors++;
        console.error(`getStatus attempt ${consecutiveGetStatusErrors} for task ${taskId} failed`);
        if (consecutiveGetStatusErrors >= 4) {
          throw new Error(`Latent Sync polling failed: getStatus failed 4 consecutive times`);
        }
        await this.sleep(DEFAULT_POLL_INTERVAL);
        continue;
      }

      console.log(`⏳ Attempt ${attempts} for task ${taskId} - Status: ${statusResult.status}`);

      if (statusResult.status === "COMPLETED") {
        const urls = statusResult.videos;
        if (!urls || urls.length === 0) {
          throw new Error("Task completed but no video URLs were returned");
        }
        console.log(`🎬 Latent Sync completed: ${urls[0]}`);
        return urls[0];
      }

      if (statusResult.status === "FAILED") {
        consecutiveFailures++;
        console.error(`Latent Sync task ${taskId} failed (${consecutiveFailures}/4)`);
        if (consecutiveFailures >= 4) {
          throw new Error("Latent Sync task failed after 4 consecutive FAILED statuses");
        }
      } else {
        consecutiveFailures = 0;
      }

      await this.sleep(DEFAULT_POLL_INTERVAL);
    }

    throw new Error(
      `Latent Sync task timed out after ${(MAX_POLL_ATTEMPTS * DEFAULT_POLL_INTERVAL) / 1000}s`,
    );
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
