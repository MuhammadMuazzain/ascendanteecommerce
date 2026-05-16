import { GoogleGenAI } from "@google/genai";
import type { Schema, Segment } from "./types";
import { buildVideoSchemaSystemPrompt, buildVideoSchemaUserPrompt } from "@/lib/prompts";
import { generateSegmentId } from "./utils";
import { GOOGLE_GENAI_MODEL, GOOGLE_GENAI_TEMPERATURE } from "./constants";

export interface SchemeGenOptions {
  googleApiKey?: string;
}

/**
 * Validates that an API key is available
 */
function validateApiKey(apiKey: string | undefined): string {
  if (!apiKey) {
    throw new Error(
      "Google GenAI API key is required. Provide it via options or GOOGLE_GENERATIVE_AI_API_KEY environment variable.",
    );
  }
  return apiKey;
}

/**
 * Parses and validates the Google GenAI response
 */
function parseGenAIResponse(responseContent: string | null | undefined): Omit<
  Schema,
  "segments"
> & {
  segments: (Omit<Segment, "id"> & { id?: string; prompt_preview?: string })[];
} {
  if (!responseContent) {
    throw new Error("No response from Google GenAI");
  }

  return JSON.parse(responseContent) as Omit<Schema, "segments"> & {
    segments: (Omit<Segment, "id"> & {
      id?: string;
      prompt_preview?: string;
    })[];
  };
}

/**
 * Adds unique IDs to segments if not already present
 */
function addSegmentIds(segments: (Omit<Segment, "id"> & { id?: string })[]): Segment[] {
  return segments.map((segment) => ({
    ...segment,
    id: segment.id || generateSegmentId(),
  }));
}

/**
 * Generates a video schema from input using Google GenAI
 */
export async function generateSchema(input: Schema, options?: SchemeGenOptions): Promise<Schema> {
  // Validate API key
  const apiKey = validateApiKey(options?.googleApiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY);

  // Initialize Google GenAI client
  const genAI = new GoogleGenAI({ apiKey });

  // Generate prompts
  const systemPrompt = buildVideoSchemaSystemPrompt(input);
  const userPrompt = buildVideoSchemaUserPrompt(input);

  try {
    // Call Google GenAI API
    const result = await genAI.models.generateContent({
      model: GOOGLE_GENAI_MODEL,
      contents: [
        {
          role: "user",
          parts: [{ text: `System: ${systemPrompt}\n\nUser: ${userPrompt}` }],
        },
      ],
      config: {
        responseMimeType: "application/json",
        temperature: GOOGLE_GENAI_TEMPERATURE,
      },
    });

    // Parse response
    const responseContent = result.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsedResponse = parseGenAIResponse(responseContent);

    // Add IDs to segments
    const segmentsWithIds = addSegmentIds(parsedResponse.segments);

    // Construct final schema
    const schema: Schema = {
      title: parsedResponse.title,
      description: parsedResponse.description,
      tags: parsedResponse.tags,
      prompt_preview: parsedResponse.prompt_preview,
      segments: segmentsWithIds,
      voice: input.voice,
      visuals: input.visuals,
      caption: input.caption,
      music: input.music,
      aspectRatio: input.aspectRatio,
      topic: input.topic,
      animation: input.animation,
      assets: input.assets,
      avatar: input.avatar,
      type: input.type,
      pacing: input.pacing,
      product: input.product,
      script: input.script,
    };

    console.log("schema", JSON.stringify(schema, null, 2));
    return schema;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to generate schema: ${error.message}`);
    }
    throw error;
  }
}
