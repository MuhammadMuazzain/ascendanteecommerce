import { VideoType } from "@/utils/enum";
import { GeminiService } from "@/lib/gemini/generator";
import type { Schema, VisualShot, VisualBroll } from "@/lib/schema-generator/types";
import * as productPrompts from "../../product-image-ads/prompts";
import * as narrativePrompts from "../../narrative/prompts";
import { buildVideoGenerationSchemaContext, buildVideoGenerationPrompt } from "@/lib/prompts";

export const generateStandardPrompts = async (
  scheme: any,
  generatedSchema: any,
  gemini: GeminiService,
) => {
  const isProductVideo =
    scheme.type === "product-video-ad" || (scheme.product?.name && scheme.product?.description);

  let generatedPrompts:
    | { segmentId: string; shots: VisualShot[]; bRolls?: VisualBroll[] }[]
    | undefined;
  let prePrice: any;

  if (isProductVideo) {
    if (scheme?.visuals?.type === VideoType.AI_IMAGES) {
      let schemaPrompts, price;

      const segmentsText = (generatedSchema.segments || [])
        .map((s: any, i: number) => `Segment ${i + 1} (ID: ${s.id}): ${s.text}`)
        .join("\n");

      if (scheme.assets?.length) {
        const pacingInstruction = productPrompts.getProductImagePacingInstruction();
        const schemaContext = buildVideoGenerationSchemaContext(
          segmentsText,
          pacingInstruction,
          generatedSchema.topic?.name,
          generatedSchema.description,
        );
        const prompt = productPrompts.buildProductImagePrompt(
          productPrompts.buildProductContextBlock(
            scheme.product?.name,
            scheme.product?.description,
          ),
          schemaContext,
          productPrompts.SCHEMA_OUTPUT_INSTRUCTIONS,
          scheme.visuals.style,
        );

        const res = await gemini.generateProductImagePrompts(
          scheme.assets.map((a: any) => a.url),
          prompt,
          generatedSchema as Schema,
        );
        schemaPrompts = res.prompts;
        price = res.price;
      } else {
        const pacingInstruction = narrativePrompts.getNarrativeImagePacingInstruction();
        const prompt = narrativePrompts.buildNarrativeImagePrompt(
          segmentsText,
          pacingInstruction,
          generatedSchema.topic?.name,
          generatedSchema.description,
          scheme.visuals.style,
        );

        const res = await gemini.generateStandardImagePrompts(prompt, generatedSchema as Schema);
        schemaPrompts = res.prompts;
        price = res.price;
      }
      prePrice = price;
      generatedPrompts = schemaPrompts as any;
    } else if (scheme?.visuals?.type === VideoType.AI_VIDEOS) {
      let videoPrompts, price;

      const segmentsText = (generatedSchema.segments || [])
        .map((s: any, i: number) => `Segment ${i + 1} (ID: ${s.id}): ${s.text}`)
        .join("\n");

      if (scheme.assets?.length) {
        const pacingInstruction = productPrompts.getProductVideoPacingInstruction();
        const schemaContext = productPrompts.buildProductVideoSchemaContext(
          segmentsText,
          pacingInstruction,
          scheme.product?.name,
          scheme.product?.description,
          scheme.visuals.style,
        );
        const prompt = buildVideoGenerationPrompt(
          productPrompts.buildProductContextBlock(
            scheme.product?.name,
            scheme.product?.description,
          ),
          schemaContext,
          "",
          scheme.visuals.style,
        );

        const res = await gemini.generateProductVideoPrompts(
          scheme.assets.map((a: any) => a.url),
          prompt,
          generatedSchema as Schema,
        );
        videoPrompts = res.prompts;
        price = res.price;
      } else {
        const pacingInstruction = narrativePrompts.getNarrativeVideoPacingInstruction();
        const prompt = narrativePrompts.buildNarrativeVideoPrompt(
          segmentsText,
          pacingInstruction,
          generatedSchema.topic?.name,
          generatedSchema.description,
          scheme.visuals.style,
        );

        const res = await gemini.generateStandardVideoPrompts(prompt, generatedSchema as Schema);
        videoPrompts = res.prompts;
        price = res.price;
      }
      prePrice = price;
      generatedPrompts = videoPrompts as any;
    } else {
      prePrice = { service: "Gemini", type: "Chat", price: 0 };
    }
  } else {
    // Standard video
    if (scheme?.visuals?.type === VideoType.AI_IMAGES) {
      const segmentsText = (generatedSchema.segments || [])
        .map((s: any, i: number) => `Segment ${i + 1} (ID: ${s.id}): ${s.text}`)
        .join("\n");
      const pacingInstruction = narrativePrompts.getNarrativeImagePacingInstruction();
      const prompt = narrativePrompts.buildNarrativeImagePrompt(
        segmentsText,
        pacingInstruction,
        generatedSchema.topic?.name,
        generatedSchema.description,
        scheme.visuals.style,
      );

      const { prompts: schemaPrompts, price } = await gemini.generateStandardImagePrompts(
        prompt,
        generatedSchema as Schema,
      );
      prePrice = price;
      generatedPrompts = schemaPrompts as any;
    } else if (scheme?.visuals?.type === VideoType.AI_VIDEOS) {
      const segmentsText = (generatedSchema.segments || [])
        .map((s: any, i: number) => `Segment ${i + 1} (ID: ${s.id}): ${s.text}`)
        .join("\n");
      const pacingInstruction = narrativePrompts.getNarrativeVideoPacingInstruction();
      const prompt = narrativePrompts.buildNarrativeVideoPrompt(
        segmentsText,
        pacingInstruction,
        generatedSchema.topic?.name,
        generatedSchema.description,
        scheme.visuals.style,
      );

      const { prompts: videoPrompts, price } = await gemini.generateStandardVideoPrompts(
        prompt,
        generatedSchema as Schema,
      );
      prePrice = price;
      generatedPrompts = videoPrompts as any;
    } else {
      prePrice = { service: "Gemini", type: "Chat", price: 0 };
    }
  }

  return { generatedPrompts, prePrice };
};

export const generateStandardBRolls = async (
  scheme: any,
  generatedSchema: any,
  generatedPrompts: any,
  gemini: GeminiService,
) => {
  if (
    generatedPrompts &&
    scheme.avatar?.url &&
    (scheme?.visuals?.type === VideoType.AI_IMAGES || scheme?.visuals?.type === VideoType.AI_VIDEOS)
  ) {
    const segmentsTextForBrolls = (generatedSchema.segments || [])
      .map((s: any, i: number) => {
        let text = `Segment ${i + 1} (ID: ${s.id}):\nText: ${s.text}\n`;
        const segmentShots = generatedPrompts.find((gs: any) => gs.segmentId === s.id)?.shots || [];
        if (segmentShots.length > 0) {
          text += `Planned Shots for this segment (Narrator should usually YIELD to these if they are product-focused):\n`;
          segmentShots.forEach((shot: any, idx: number) => {
            text += `  - Shot ${idx + 1} (type: ${shot.type})\n`;
          });
        }
        return text;
      })
      .join("\n\n");

    const brollPrompt = productPrompts.buildProductAdBrollInteractionPrompt(
      segmentsTextForBrolls,
      generatedSchema.topic?.name,
      generatedSchema.description,
      scheme.product?.name,
      scheme.product?.description,
      scheme.visuals.style,
    );

    const bRollsPrompts = await gemini.generateProductAdBrolls(
      generatedSchema as Schema,
      brollPrompt,
      scheme.avatar!.url,
    );

    if (bRollsPrompts && bRollsPrompts.length > 0) {
      return generatedPrompts.map((p: any) => {
        const bRoll = bRollsPrompts.find((b: any) => b.segmentId === p.segmentId);
        return {
          ...p,
          bRolls: bRoll ? bRoll.bRolls : [],
        };
      });
    }
  }
  return generatedPrompts;
};

export const mapStandardPromptsToSegments = (scheme: any, generatedPrompts: any) => {
  if (!generatedPrompts || generatedPrompts.length === 0) return scheme.segments;

  return scheme.segments.map((s: any, index: number) => {
    let segmentPrompts = generatedPrompts.find((p: any) => p.segmentId === s.id);
    if (!segmentPrompts && generatedPrompts.length === scheme.segments.length) {
      segmentPrompts = generatedPrompts[index];
    }
    const shots = segmentPrompts ? segmentPrompts.shots : [];
    const bRolls = segmentPrompts?.bRolls ? segmentPrompts.bRolls : [];
    return { ...s, shots, bRolls };
  });
};
