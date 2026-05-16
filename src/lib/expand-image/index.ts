interface FluxExpandParams {
  image: string; // Base64 image to expand
  prompt?: string;
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
}

interface FluxExpandStatusResponse {
  id: string;
  status: string; // 'CREATED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  images: string[];
}

const DEFAULT_POLL_INTERVAL = 5000; // 5 seconds
const MAX_POLL_ATTEMPTS = 60; // 60 * 5s = 5 minutes

export class ExpandImageService {
  private url: string;
  private apiKey: string;
  private webhookUrl?: string;

  constructor(url: string, apiKey: string, webhookUrl?: string) {
    this.url = url;
    this.apiKey = apiKey;
    this.webhookUrl = webhookUrl;
  }

  async expand(params: FluxExpandParams): Promise<string> {
    console.log("FLUX-EXPAND-IMAGE", {
      prompt: params.prompt,
      expand: "100px all sides",
    });

    const body = {
      image: params.image,
      prompt: params.prompt || "Expand the background seamlessly",
      left: params.left ?? 100,
      right: params.right ?? 100,
      top: params.top ?? 100,
      bottom: params.bottom ?? 100,
      webhook_url: this.webhookUrl,
    };

    const createResponse = await fetch(`${this.url}/image-expand/flux-pro`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-freepik-api-key": this.apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`Failed to create expand task: ${createResponse.status} - ${errorText}`);
    }

    const { data } = await createResponse.json();
    const taskId = data?.task_id;

    if (!taskId) throw new Error("Invalid response from API: no task_id");

    console.log(`✓ Expand task created: ${taskId}`);

    return this.pollTask(taskId);
  }

  async getStatus(taskId: string): Promise<FluxExpandStatusResponse> {
    try {
      const response = await fetch(`${this.url}/image-expand/flux-pro/${taskId}`, {
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
        images: data.generated || [],
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

      let statusResult: FluxExpandStatusResponse | null = null;

      try {
        statusResult = await this.getStatus(taskId);
        consecutiveGetStatusErrors = 0;
      } catch (error) {
        consecutiveGetStatusErrors++;
        console.error(`getStatus attempt ${consecutiveGetStatusErrors} for task ${taskId} failed`);
        if (consecutiveGetStatusErrors >= 4) {
          throw new Error(`Flux Expand polling failed: getStatus failed 4 consecutive times`);
        }
        await this.sleep(DEFAULT_POLL_INTERVAL);
        continue;
      }

      console.log(`⏳ Attempt ${attempts} for task ${taskId} - Status: ${statusResult.status}`);

      if (statusResult.status === "COMPLETED") {
        const urls = statusResult.images;
        if (!urls || urls.length === 0) {
          throw new Error("Task completed but no image URLs were returned");
        }
        console.log(`🎨 Flux Expand completed: ${urls[0]}`);
        return urls[0];
      }

      if (statusResult.status === "FAILED") {
        consecutiveFailures++;
        console.error(`Flux Expand task ${taskId} failed (${consecutiveFailures}/4)`);
        if (consecutiveFailures >= 4) {
          throw new Error("Flux Expand task failed after 4 consecutive FAILED statuses");
        }
      } else {
        consecutiveFailures = 0;
      }

      await this.sleep(DEFAULT_POLL_INTERVAL);
    }

    throw new Error(
      `Flux Expand task timed out after ${(MAX_POLL_ATTEMPTS * DEFAULT_POLL_INTERVAL) / 1000}s`,
    );
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
