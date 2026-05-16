import { ImageGenerator } from "@/lib/image-generation";
import { uploadBase64ToR2 } from "@/lib/upload-utils";
import { nanoid } from "nanoid";
import { aspectRatioType } from "@/utils/enum";
import { config } from "@/inngest/config";

export interface FrameGenerationParams {
  segmentDescription: string;
  segmentText: string;
  firstFrame?: string; // The LLM-authored exact starting frame description — primary instruction
  shotType?: "product" | "generic" | "b-roll";
  avatarUrl?: string;
  avatarDescription?: string; // Original prompt used to generate the avatar
  productUrls?: string[];
  previousFrameUrl?: string;
  aspectRatio?: string;
}

export interface GeneratedFrame {
  segmentId: string;
  frameUrl: string;
  prompt: string;
}

/**
 * Generates a detailed prompt for creating a UGC video first frame
 * that composites an avatar with product assets
 */
export function generateFramePrompt(params: FrameGenerationParams): string {
  const {
    segmentDescription,
    segmentText,
    firstFrame,
    shotType = "generic",
    avatarUrl,
    avatarDescription,
    productUrls = [],
    previousFrameUrl,
    aspectRatio = "9:16",
  } = params;

  // Decision logic based on shotType
  const isProductShot = shotType === "product";
  const isGenericShot = shotType === "generic";
  const isBRoll = shotType === "b-roll";

  // Build the composition prompt
  let prompt = "A professional UGC video first frame in 9:16 vertical format. \n\n";

  prompt += "[IMAGE CONTEXT]\n";
  let imageIndex = 1;
  const imageMap: Record<string, number> = {};

  if (previousFrameUrl) {
    imageMap["environment"] = imageIndex++;
    prompt += `- Image ${imageMap["environment"]} is the reference for the ENVIRONMENT/BACKGROUND.\n`;
  }
  if (avatarUrl) {
    imageMap["creator"] = imageIndex++;
    prompt += `- Image ${imageMap["creator"]} is the reference for the CREATOR (IDENTITY AND CLOTHING).\n`;
  }
  if (productUrls.length > 0) {
    // We always provide the product context for consistency,
    // but instructions will vary based on shotType
    imageMap["product"] = imageIndex++;
    prompt += `- Image ${imageMap["product"]} (and subsequent) are references for the PRODUCT.\n`;
  }
  prompt += "\n";

  prompt += "[PRIMARY INSTRUCTIONS]\n";

  if (avatarUrl) {
    prompt += `- IDENTITY CONSISTENCY: Maintain the EXACT identity, facial features, hair, and apparel of the person shown in Image ${imageMap["creator"]}. `;
    if (avatarDescription) {
      prompt += `The creator is described as: ${avatarDescription}. `;
    }
    prompt += "They should look directly at the camera with an authentic, engaging expression.\n";
  }

  if (previousFrameUrl) {
    prompt += `- ENVIRONMENT CONSISTENCY: Place the creator/product in the environment shown in Image ${imageMap["environment"]}. The background, lighting, and room layout must match exactly.\n`;
  }

  if (productUrls.length > 0) {
    if (isProductShot) {
      prompt += `- PRODUCT SHOT: The creator should be holding, using, or interacting with the product as described. The product must be clearly visible and in focus.\n`;
    } else if (isGenericShot) {
      prompt += `- GENERIC SHOT: The creator is NOT holding the product. They are gesturing naturally while speaking. **FOR CONTINUITY**: Place the product visibly in the scene (e.g., on a desk, table, or background shelf) but he creator should NOT be touching it.\n`;
    } else if (isBRoll) {
      prompt += `- B-ROLL SHOT: Detailed close-up of the product itself. No human figures should be visible unless they are only hands interacting.\n`;
    }
  }

  prompt += `\n[SCENE CONTENT]\n`;
  if (firstFrame) {
    // Use the LLM-authored firstFrame description as the primary instruction —
    // it already specifies exactly where the product is, the avatar pose, and the view mode.
    prompt += `- EXACT STARTING FRAME: ${firstFrame}\n`;
  } else {
    prompt += `- ${segmentDescription}\n`;
    prompt += `- Vibe from narration: "${segmentText.substring(0, 100)}"\n`;
  }
  prompt += "\n";

  prompt += "[QUALITY & STYLE]\n";
  prompt +=
    "- Style: Photorealistic, natural lighting, clean composition, shallow depth of field.\n";
  prompt +=
    "- STRICTLY NO TEXT: Do not include any text, captions, subtitles, labels, or UI overlays.\n";
  prompt += "- Single scene: Output exactly one image, not a collage.\n";

  return prompt;
}

/**
 * Generates a first frame for a UGC video segment
 */
export async function generateSegmentFrame(params: FrameGenerationParams): Promise<string> {
  const prompt = generateFramePrompt(params);

  const imageGenerator = new ImageGenerator({
    provider: "seedream45",
    params: {
      freepikUrl: config.freepik.url,
      freepikApiKey: config.freepik.key,
    },
  });

  // We now ALWAYS include all relevant URLs.
  // The improved generateFramePrompt instructions handle the logical placement.
  const imageUrls = [
    ...(params.previousFrameUrl ? [params.previousFrameUrl] : []),
    ...(params.avatarUrl ? [params.avatarUrl] : []),
    ...(params.productUrls || []),
  ];

  try {
    const base64Data = await imageGenerator.create({
      prompt,
      aspectRatio: params.aspectRatio as aspectRatioType,
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
    });

    // Upload the base64 output to R2
    const filename = `frames/ugc-${nanoid()}.png`;
    const frameUrl = await uploadBase64ToR2(base64Data, filename, "image/png");

    return frameUrl;
  } catch (error: any) {
    console.error("Failed to generate frame with Gemini:", error);
    throw error;
  }
}
