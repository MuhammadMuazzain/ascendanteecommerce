import * as narrativeServices from "../services/prompts";
import { VideoSchema } from "@/inngest/utils/types";
import { VisualShot, VisualBroll } from "@/lib/schema-generator/types";

export const generateNarrativePrompts = async (
  scheme: VideoSchema,
  generatedSchema: any,
  step: any,
) => {
  return step.run("generate-narrative-prompts-service", async () => {
    return narrativeServices.generateNarrativePrompts(scheme, generatedSchema);
  });
};

export const applyPromptsToSegments = (
  scheme: VideoSchema,
  generatedPrompts: { segmentId: string; shots: VisualShot[]; bRolls?: VisualBroll[] }[],
) => {
  return scheme.segments.map((s, index) => {
    let segmentPrompts = generatedPrompts.find((p) => p.segmentId === s.id);
    if (!segmentPrompts && generatedPrompts.length === scheme.segments.length) {
      segmentPrompts = generatedPrompts[index];
    }
    return { ...s, shots: segmentPrompts?.shots ?? [], bRolls: segmentPrompts?.bRolls ?? [] };
  });
};
