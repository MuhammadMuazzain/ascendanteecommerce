import { aspectRatioType } from "@/utils/enum";

export type ModelProvider = "gemini" | "seedream4" | "seedream45";

export interface GenerationResponse {
  id: string;
  url?: string;
  status: string;
}

export interface Generator {
  create(params: any): Promise<string>;
  getStatus?(id: string): Promise<GenerationResponse>;
}

export type GeneratorConfig =
  | {
      provider: "gemini";
      params: {
        apiKey: string;
        model: string;
      };
    }
  | {
      provider: "seedream4";
      params: {
        freepikUrl: string;
        freepikApiKey: string;
      };
    }
  | {
      provider: "seedream45";
      params: {
        freepikUrl: string;
        freepikApiKey: string;
      };
    };

export interface BaseGenerationParams {
  prompt: string;
  aspectRatio?: aspectRatioType;
}
