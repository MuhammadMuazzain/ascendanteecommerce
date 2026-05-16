import { PersonGeneration } from "@google/genai";
import { GenerationBaseParams } from "../types";

export interface NanobananaConfig {
  apiKey: string;
  model: string;
}

export type ImageInput = string | { data: string; mimeType: string };

export interface GeminiParams extends GenerationBaseParams {
  model: string;
  imageUrls?: string[]; // Legacy
  imageInputs?: ImageInput[];
  numberOfImages?: number;
  personGeneration?: PersonGeneration;
  options?: {
    webp?: boolean;
    resize: {
      width?: number;
      height?: number;
    };
  };
}
