import { GeminiService } from "@/lib/gemini/generator";
import { VideoSchema } from "@/types/segment";

// ---------------------------------------------------------------------------
// Gemini output schema for shot prompt generation
// ---------------------------------------------------------------------------

const SMART_SHOTS_OUTPUT_SCHEMA = {
  description: "Smart video and emotion prompt generation for pre-split shots.",
  type: "object",
  properties: {
    segments: {
      type: "array",
      items: {
        type: "object",
        properties: {
          segmentId: {
            type: "string",
            description: "The segment ID exactly as provided in the input",
          },
          shots: {
            type: "array",
            description:
              "The array of enhanced shots, MUST match the exact length and text of the input shots.",
            items: {
              type: "object",
              properties: {
                words: {
                  type: "string",
                  description:
                    "The exact same words provided in the input shot. DO NOT CHANGE THESE.",
                },
                videoPrompt: {
                  type: "string",
                  description:
                    "Unique Veo video prompt for this shot. MUST be a CONTINUATION of the previous shot's action and camera. " +
                    "Describe character body language, facial expression, and movement fluidly during these specific words.",
                },
                emotion: {
                  type: "string",
                  description:
                    "Character emotion at this exact moment " +
                    "(e.g. 'smug and confident', 'suddenly alarmed', 'triumphant').",
                },
              },
              required: ["words", "videoPrompt", "emotion"],
            },
          },
        },
        required: ["segmentId", "shots"],
      },
    },
  },
  required: ["segments"],
};

const getSmartShotsSystemPrompt = (
  visualStyle: string,
  productName?: string,
  productDescription?: string,
) =>
  `You are a director of photography and character animator for ads rendered in ${visualStyle}.
You are currently generating a video ad for the following product:
- Product Name: ${productName || "Unknown Product"}
- Product Description: ${productDescription || "No description provided"}

Your task: Given a script broken down into specific pre-timed video shots, generate a highly descriptive \`videoPrompt\` and \`emotion\` for EACH shot.

RULES:
1. DO NOT CHANGE THE WORDS: You will be given the exact spoken words for each shot. Keep them exactly as provided.
2. CONTINUITY IS CRUCIAL: These shots are physically split from a single continuous sentence to fit video generation time limits. 
   - They must look and feel like one continuous scene. 
   - DO NOT make jarring camera cuts or completely change the character's core action between consecutive shots.
   - Maintain the same general framing (e.g. Mid-shot) and tone across the continuous shots.
   - Describe the CONTINUATION of the movement smoothly (e.g. "Shot 1: character begins lifting arms... Shot 2: character finishes lifting arms and points").
3. HUMAN INTERACTION & LIVE ACTION: If the dialogue specific to THIS shot describes an effect on a human body or an action involving the product, the prompt MUST describe a stylized 3D human actively doing that action or experiencing that effect alongside the speaking character. The visual action MUST strictly match the exact words spoken in this shot slice. Generalize this to whatever the actual product is.
4. NO TEXT overlays: Always specify that the character has no empty text or labels.

EXAMPLE:
INPUT SHOTS:
- Shot 1: "Hi, I'm Self-Tanner. You rub me all over your body hoping for that perfect glow,"
- Shot 2: "but what you usually get is streaky legs, orange palms, and a strong chemical smell that sticks around for hours."

OUTPUT:
Shot 1: 
  words="Hi, I'm Self-Tanner. You rub me all over your body hoping for that perfect glow,"
  emotion="smug, confident"
  videoPrompt="Mid-shot, a messy lotion bottle character speaks smugly while a stylized 3D woman in the background is shown enthusiastically rubbing lotion onto her arms, bokeh bathroom background, ${visualStyle}"
Shot 2:
  words="but what you usually get is streaky legs, orange palms, and a strong chemical smell that sticks around for hours."
  emotion="gleefully evil"
  videoPrompt="Mid-shot, continuous shot, bottle character spins playfully as the camera shifts to show the woman behind looking disappointed at her newly streaky, violently orange legs and palms, bokeh bathroom background, ${visualStyle}"
`;

// ---------------------------------------------------------------------------
// Shot enhancement types
// ---------------------------------------------------------------------------

export interface EnhancedShot {
  words: string;
  videoPrompt: string;
  emotion: string;
}

export interface EnhancedSegmentResult {
  segmentId: string;
  shots: EnhancedShot[];
}

// ---------------------------------------------------------------------------
// Step function
// ---------------------------------------------------------------------------

/**
 * Stage 0.5 — LLM Smart Shot Generation
 *
 * Takes the pre-split shots (split deterministically via spacing in mapping.ts)
 * and calls Gemini to generate unique, high-quality videoPrompts and emotions
 * for EACH shot, maintaining strict continuity since they are split mid-sentence.
 */
export const generateCharacterAdShots = async (
  scheme: VideoSchema,
): Promise<EnhancedSegmentResult[]> => {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set");

  const visualStyle = scheme.visuals?.style ?? "High-end 3D Pixar/Illumination animation style";
  const gemini = new GeminiService(apiKey, "gemini-3-flash-preview");

  // Format the input payload: we only care about segments that actually have shots
  const segmentList = (scheme.segments || [])
    .map((s, i) => {
      const shotsText = (s.shots || [])
        .map((shot, j) => `  Shot ${j + 1}: "${shot.words}"`)
        .join("\n");
      return `Segment ${i + 1} (ID: ${s.id}):\n${shotsText}`;
    })
    .join("\n\n");

  const imageUrls = (scheme.assets || [])
    .filter((a) => a.type === "image" && a.url)
    .map((a) => a.url as string);

  const result: { segments: EnhancedSegmentResult[] } = await gemini.generateScriptAssistant({
    message:
      `Generate unique \`videoPrompt\` and \`emotion\` for each of these pre-split shots.\n\n` +
      `INPUT SEGMENTS AND SHOTS:\n${segmentList}`,
    systemPrompt: getSmartShotsSystemPrompt(
      visualStyle,
      scheme.product?.name,
      scheme.product?.description,
    ),
    productName: scheme.product?.name,
    productDescription: scheme.product?.description,
    imageUrls,
    outputSchema: SMART_SHOTS_OUTPUT_SCHEMA,
  });

  return result.segments ?? [];
};

// ---------------------------------------------------------------------------
// Mapper — apply Enhanced LLM shots back onto scheme.segments
// ---------------------------------------------------------------------------

export const mapShotsToSegments = (
  scheme: VideoSchema,
  shotResults: EnhancedSegmentResult[],
): VideoSchema["segments"] => {
  return scheme.segments.map((seg) => {
    const result = shotResults.find((r) => r.segmentId === seg.id);

    if (!result || !result.shots || result.shots.length === 0) {
      console.warn(
        `[Smart Shots] No enhanced shots returned for segment ${seg.id}, using defaults.`,
      );
      return seg;
    }

    const updatedShots = (seg.shots || []).map((originalShot: any, i: number) => {
      // Find the LLM enhancements for the corresponding shot by index or text match.
      const enhancement =
        result.shots[i] || result.shots.find((s) => s.words.includes(originalShot.words));

      if (!enhancement) {
        return originalShot;
      }

      const styleContext = scheme.visuals?.style ?? "";
      const characterVisual = (seg as any).character?.visualDescription ?? "";
      const sceneDesc = (seg as any).sceneDescription ?? "";

      const videoPrompt = [
        styleContext,
        characterVisual,
        sceneDesc,
        enhancement.videoPrompt,
        "the character has NO TEXT, NO LETTERS, AND NO WORDS on them.",
        "single cinematic frame, NO TEXT, no letters, no split screen, no panels",
      ]
        .filter(Boolean)
        .join(", ");

      return {
        ...originalShot,
        emotion: enhancement.emotion || originalShot.emotion,
        videoPrompt,
      };
    });

    return {
      ...seg,
      shots: updatedShots,
    };
  });
};
