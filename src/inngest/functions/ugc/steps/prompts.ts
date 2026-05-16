import { UgcServices } from "../services";
import * as ugcServices from "../services/prompts";
import { buildUgcUnifiedPrompt } from "../prompts";

export const generateUgcShots = async (
  scheme: any,
  generatedSchema: any,
  services: UgcServices,
  step: any,
) => {
  return step.run("generate-ugc-shots-service", async () => {
    return ugcServices.generateUgcShots(scheme, generatedSchema, services.gemini);
  });
};

export const generateUgcBRolls = async (
  scheme: any,
  generatedSchema: any,
  ugcShots: any,
  services: UgcServices,
  step: any,
) => {
  return step.run("generate-ugc-brolls-service", async () => {
    return ugcServices.generateUgcBRolls(scheme, generatedSchema, ugcShots, services.gemini);
  });
};

export const generateUgcUnifiedPrompts = async (
  scheme: any,
  generatedSchema: any,
  services: UgcServices,
  step: any,
) => {
  return step.run("generate-ugc-unified-prompts-service", async () => {
    const segmentsText = (scheme.segments || [])
      .map((s: any, i: number) => `Segment ${i + 1} (ID: ${s.id}): ${s.text}`)
      .join("\n");

    const assetLabels = (scheme.assets || [])
      .map((a: any, i: number) => `Image ${i + 1} Label: ${a.label || "n/a"}`)
      .join("\n");

    const prompt = buildUgcUnifiedPrompt(
      segmentsText,
      scheme.topic?.name,
      scheme.topic?.description,
      scheme.product?.name,
      scheme.product?.description,
      scheme.visuals?.style,
      assetLabels,
    );

    return services.gemini.generateUGCUnifiedPrompts(
      scheme,
      prompt,
      scheme.assets || [],
      scheme.avatar?.url,
    );
  });
};

export const mapPromptsToSegments = (scheme: any, ugcShots: any, ugcBRolls: any) => {
  return scheme.segments.map((s: any, index: number) => {
    let segmentShots = (ugcShots as any[]).find((p) => p.segmentId === s.id);
    if (!segmentShots && (ugcShots as any[]).length === scheme.segments.length) {
      segmentShots = (ugcShots as any[])[index];
    }

    let segmentBRolls = (ugcBRolls as any[]).find((p) => p.segmentId === s.id);
    if (!segmentBRolls && (ugcBRolls as any[]).length === scheme.segments.length) {
      segmentBRolls = (ugcBRolls as any[])[index];
    }

    let shots = segmentShots ? segmentShots.shots : [];
    let bRolls = segmentBRolls ? segmentBRolls.bRolls : [];

    if (shots && !Array.isArray(shots)) {
      shots = [shots];
    }
    if (bRolls && !Array.isArray(bRolls)) {
      bRolls = [bRolls];
    }

    return {
      ...s,
      shots: shots as any[],
      bRolls: bRolls as any[],
    };
  });
};
