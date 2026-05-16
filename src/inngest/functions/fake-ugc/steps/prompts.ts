import { NonRetriableError } from "inngest";
import { type Schema } from "@/lib/schema-generator/types";
import { type PipelineServices } from "../../common/steps/types";
import { buildFakeUgcUnifiedPrompt } from "../prompts";
import { type VideoSchema } from "@/inngest/utils/types";
import { type VisualShot, type VisualBroll } from "@/lib/schema-generator/types";

/**
 * Stage 1: Generate Visual Prompts for Fake UGC
 *
 * Unlike standard UGC, this focuses strictly on product imagery and lifestyle
 * montages. It does NOT use an avatar image.
 */
export async function generateFakeUgcPrompts(
  scheme: VideoSchema,
  services: PipelineServices,
  step: any,
) {
  return step.run("generate-fake-ugc-prompts-service", async () => {
    const assets = scheme.assets || [];
    const productName = scheme.product?.name;
    const productDescription = scheme.product?.description;
    const schema = scheme as any;

    if (!schema.segments || schema.segments.length === 0) {
      throw new NonRetriableError("Schema with segments is required");
    }

    const segmentsText = schema.segments
      .map((s: any, i: number) => `Segment ${i + 1} (ID: ${s.id}): ${s.text}`)
      .join("\n");

    const assetLabels = assets
      .map((a: any, i: number) => `Image ${i + 1} Label: ${a.label || "n/a"}`)
      .join("\n");

    const prompt = buildFakeUgcUnifiedPrompt(
      segmentsText,
      schema.topic?.name,
      schema.topic?.description,
      productName,
      productDescription,
      schema.visuals?.style,
      assetLabels,
    );

    const result = await services.gemini.generateFakeUGCUnifiedPrompts(schema, prompt, assets);

    if (!result.prompts || result.prompts.length === 0) {
      throw new NonRetriableError("Failed to generate Fake UGC visual prompts");
    }

    return { generatedPrompts: result.prompts };
  });
}

export const applyPromptsToSegments = (
  scheme: VideoSchema,
  generatedPrompts: { segmentId: string; shots: VisualShot[]; bRolls?: VisualBroll[] }[],
) => {
  return scheme.segments.map((s: any, index: number) => {
    let segmentPrompts = generatedPrompts.find((p) => p.segmentId === s.id);
    if (!segmentPrompts && generatedPrompts.length === scheme.segments.length) {
      segmentPrompts = generatedPrompts[index];
    }
    return { ...s, shots: segmentPrompts?.shots ?? [], bRolls: segmentPrompts?.bRolls ?? [] };
  });
};
