import { PersonGeneration } from "@google/genai";
import { aspectRatioType } from "@/utils/enum";

/**
 * Base parameters for actual image generation (technical)
 */
export interface GenerationBaseParams {
  prompt: string; // The FINAL styled prompt
  aspectRatio?: aspectRatioType;
}
