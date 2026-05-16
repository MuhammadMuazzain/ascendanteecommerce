export const KIE_API_BASE_URL = "https://api.kie.ai";

export interface KieGenerateVideoParams {
  prompt: string;
  imageUrls?: string[];
  model?: "veo3" | "veo3_fast";
  watermark?: string;
  callBackUrl?: string;
  aspect_ratio?: "16:9" | "9:16" | "Auto";
  seeds?: number;
  enableFallback?: boolean;
  enableTranslation?: boolean;
  generationType?: "TEXT_2_VIDEO" | "FIRST_AND_LAST_FRAMES_2_VIDEO" | "REFERENCE_2_VIDEO";
}

export interface KieCreateTaskParams {
  model: string;
  input: {
    prompt: string;
    image_input?: string[];
    aspect_ratio?: string;
    resolution?: string;
    output_format?: string;
  };
  callBackUrl?: string;
}

export async function kieFetch(endpoint: string, options: RequestInit = {}) {
  const apiKey = process.env.KIE_API_KEY;
  if (!apiKey) {
    throw new Error("KIE_API_KEY is not defined");
  }

  const url = endpoint.startsWith("http") ? endpoint : `${KIE_API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json();
  return { data, status: response.status, ok: response.ok };
}

export const kie = {
  generateVideo: (params: KieGenerateVideoParams) =>
    kieFetch("/api/v1/veo/generate", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  getVeoStatus: (taskId: string) =>
    kieFetch(`/api/v1/veo/record-info?taskId=${taskId}`, {
      method: "GET",
    }),

  get1080pVideo: (taskId: string) =>
    kieFetch(`/api/v1/veo/get-1080p-video?taskId=${taskId}`, {
      method: "GET",
    }),

  createImageTask: (params: KieCreateTaskParams) =>
    kieFetch("/api/v1/jobs/createTask", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  getImageStatus: (taskId: string) =>
    kieFetch(`/api/v1/jobs/recordInfo?taskId=${taskId}`, {
      method: "GET",
    }),
  generateRunwayVideo: (params: any) =>
    kieFetch("/api/v1/runway/generate", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  getRunwayStatus: (taskId: string) =>
    kieFetch(`/api/v1/runway/record-detail?taskId=${taskId}`, {
      method: "GET",
    }),
};
