import { GenerationBaseParams } from "../types";

export interface SeedreamParams extends GenerationBaseParams {
  guidanceScale?: number;
  imageUrls?: string[];
}
