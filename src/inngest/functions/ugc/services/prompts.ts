import { GeminiService } from "@/lib/gemini/generator";
import type { Schema } from "@/lib/schema-generator/types";
import { buildUgcShotPrompt, buildUgcBrollPrompt } from "../prompts";

export const generateUgcShots = async (
  scheme: any,
  generatedSchema: any,
  gemini: GeminiService,
) => {
  const segmentsText = (generatedSchema.segments || [])
    .map((s: any, i: number) => `Segment ${i + 1} (ID: ${s.id}): ${s.text}`)
    .join("\n");

  const assetLabels = (scheme.assets || [])
    .map((a: any, i: number) => `Image ${i + 1} Label: ${a.label || "n/a"}`)
    .join("\n");

  const prompt = buildUgcShotPrompt(
    segmentsText,
    generatedSchema.topic?.name,
    generatedSchema.description,
    scheme.product?.name,
    scheme.product?.description,
    scheme.visuals?.style,
    assetLabels,
  );

  return gemini.generateUGCPrompts(
    generatedSchema as Schema,
    prompt,
    (scheme.assets as any) || [],
    scheme.avatar?.url,
  );
};

export const generateUgcBRolls = async (
  scheme: any,
  generatedSchema: any,
  ugcShots: any,
  gemini: GeminiService,
) => {
  const segmentsText = (generatedSchema.segments || [])
    .map((s: any, i: number) => {
      let text = `Segment ${i + 1} (ID: ${s.id}):\nText: ${s.text}\n`;
      const segmentShots = (ugcShots as any[]).find((gs) => gs.segmentId === s.id)?.shots || [];
      if (segmentShots.length > 0) {
        text += `A-Roll (Avatar) Shots for this segment:\n`;
        segmentShots.forEach((shot: any, idx: number) => {
          text += `  - Shot ${idx + 1} (type: ${shot.type}): ${shot.videoPrompt}\n`;
        });
      }
      return text;
    })
    .join("\n\n");

  const assetLabels = (scheme.assets || [])
    .map((a: any, i: number) => `Image ${i + 1} Label: ${a.label || "n/a"}`)
    .join("\n");

  const prompt = buildUgcBrollPrompt(
    segmentsText,
    generatedSchema.topic?.name,
    generatedSchema.description,
    scheme.product?.name,
    scheme.product?.description,
    scheme.visuals?.style,
    assetLabels,
  );

  return gemini.generateUGCBrolls(
    generatedSchema as Schema,
    prompt,
    (scheme.assets as any) || [],
    scheme.avatar?.url,
  );
};
