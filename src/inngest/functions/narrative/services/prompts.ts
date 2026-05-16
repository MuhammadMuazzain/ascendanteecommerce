import { GeminiService } from "@/lib/gemini/generator";
import { config } from "@/inngest/config";
import { VideoSchema } from "@/inngest/utils/types";
import { Schema, VisualShot, VisualBroll } from "@/lib/schema-generator/types";
import { VideoType } from "@/utils/enum";
import {
  buildNarrativeImagePrompt,
  getNarrativeImagePacingInstruction,
  buildNarrativeVideoPrompt,
  getNarrativeVideoPacingInstruction,
} from "../prompts";

export const generateNarrativePrompts = async (scheme: VideoSchema, generatedSchema: any) => {
  const gemini = new GeminiService(config.gemini.key, config.gemini.model2);
  let prePrice: any = { service: "Gemini", type: "Chat", price: 0 };
  let generatedPrompts:
    | { segmentId: string; shots: VisualShot[]; bRolls?: VisualBroll[] }[]
    | undefined;

  const segmentsText = (generatedSchema.segments || [])
    .map((s: any, i: number) => `Segment ${i + 1} (ID: ${s.id}): ${s.text}`)
    .join("\n");

  if (scheme?.visuals.type === VideoType.AI_IMAGES) {
    const pacingInstruction = getNarrativeImagePacingInstruction();
    const prompt = buildNarrativeImagePrompt(
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
    generatedPrompts = schemaPrompts as { segmentId: string; shots: VisualShot[] }[];
  } else if (scheme?.visuals.type === VideoType.AI_VIDEOS) {
    const pacingInstruction = getNarrativeVideoPacingInstruction();
    const prompt = buildNarrativeVideoPrompt(
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
    // @ts-ignore
    generatedPrompts = videoPrompts;
  }

  return { generatedPrompts, prePrice };
};
