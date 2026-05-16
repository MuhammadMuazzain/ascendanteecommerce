import { nanoid } from "nanoid";
import { VideoSchema, Segment, CharacterConfig, UserScriptBlock } from "@/types/segment";
import { resolutionType, aspectRatioType } from "@/utils/enum";

export interface GenerateCharacterVideoInput {
  blocks?: UserScriptBlock[];
  /** New format: segments with nested character objects from the script generator */
  segments?: CharacterSegmentInput[];
  product?: { name?: string; description?: string };
  assets?: { url: string; type: string }[];
  visuals?: { style?: string; type?: string };
}

/** A scene segment as produced by the new CHARACTER_AD_SCRIPT_OUTPUT_SCHEMA */
export interface CharacterSegmentInput {
  title: string;
  text: string;
  character: {
    name: string;
    role: "villain" | "hero" | "human" | "narrator";
    visualDescription: string;
    voiceDescription: string;
    emotion: string;
  };
  sceneDescription: string;
  videoDescription: string;
  productInteractionType?: UserScriptBlock["productInteractionType"];
}

const DEFAULT_STYLE =
  "High-end 3D Pixar/Illumination animation style, cinematic lighting, ultra-detailed textures, vibrant colors";
const DEFAULT_ASPECT_RATIO = "9:16";
const DEFAULT_TITLE = "Character-Driven Ad";

/** Appended to firstFramePrompt to prevent AI image layout artifacts */
const SINGLE_FRAME_SUFFIX =
  "single cinematic frame, NO TEXT, no letters, no words, no labels, no split screen, no panels, no collage, no before-and-after, no multiple views, no text overlays, no watermarks, no borders";

const DEFAULT_HERO_VISUAL = (style: string) =>
  `Cute character, highly expressive facial features, premium realistic materials, ultra-clean, brightly lit, ${style}`;
const DEFAULT_VILLAIN_VISUAL = (style: string) =>
  `Mischievous character or anthropomorphized object representing the problem, highly expressive facial features, premium solid materials, ${style}`;
const DEFAULT_HUMAN_VISUAL = (style: string) =>
  `blurred cinematic human subject in background, reacting with emotional frustration or stress, out of focus (bokeh), ${style}`;
const DEFAULT_SCENE_VISUAL = (style: string) =>
  `Clean, bright, modern premium interior, cinematic lighting, volumetric light rays, glossy reflections, ${style}`;
const DEFAULT_MOTION_VISUAL =
  "Energetic, expressive, and playful character animation, highly dynamic movements reacting to the product";

const calculateEstimatedDuration = (text: string): number => {
  if (!text) return 4;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  // Standard speech rate ~2.5 words per second
  return Math.ceil(words / 2.5);
};

/**
 * Splits text deterministically into ≤8-second (~20 words) shots.
 * Prefers splitting sentences at periods, then commas if still too long.
 * Continuously merges them to be as close to 20 words as possible without exceeding.
 */
function splitTextIntoShots(text: string): string[] {
  // Capture chunks of text + optional trailing punctuation
  const atomicChunks = text.match(/[^.!?,\u2014\u2013;:]+[.!?,\u2014\u2013;:]*/g) || [text];

  const mergedShots: string[] = [];
  let currentShot = "";

  for (const chunk of atomicChunks) {
    const trimmedChunk = chunk.trim();
    if (!trimmedChunk) continue;

    const currentWords = currentShot.trim().split(/\s+/).filter(Boolean).length;
    const chunkWords = trimmedChunk.split(/\s+/).filter(Boolean).length;

    if (currentShot === "") {
      currentShot = trimmedChunk;
    } else if (currentWords + chunkWords <= 20) {
      currentShot += " " + trimmedChunk;
    } else {
      mergedShots.push(currentShot);
      currentShot = trimmedChunk;
    }
  }

  if (currentShot) mergedShots.push(currentShot);

  // Hard fallback for long strings without any punctuation: strict 20-word split
  const finalShots: string[] = [];
  for (const shot of mergedShots) {
    const words = shot.split(/\s+/).filter(Boolean);
    for (let i = 0; i < words.length; i += 20) {
      finalShots.push(words.slice(i, i + 20).join(" "));
    }
  }

  return finalShots;
}

/** Build a product-action prefix for a given interaction type */
function buildProductActionPrefix(
  interaction: string,
  productName: string,
  productDescription?: string,
): string {
  let productAction = "";
  switch (interaction) {
    case "packaging_hero":
      productAction = `The external product packaging and container are prominently displayed. `;
      break;
    case "product_content_hero":
      productAction = `The actual internal product content (the substance itself) is shown clearly as the center of focus. `;
      break;
    case "packaging_in_hand":
      productAction = `The character holds the product's packaging/container naturally in their stable hands. `;
      break;
    case "product_content_in_hand":
      productAction = `The character holds the actual inner product content (e.g., gummy, liquid, or substance) in their hand for scale. `;
      break;
    case "packaging_on_surface":
      productAction = `The product packaging/container rests neatly on a nearby surface. `;
      break;
    case "product_content_on_surface":
      productAction = `The actual inner product content (the substance itself) rests neatly on a nearby surface. `;
      break;
    case "product_reveal":
      productAction = `The character specifically shows the transition from the packaging to the actual internal product content. `;
      break;
  }
  return `${productAction}Featuring the product "${productName}" (${productDescription || ""}). `;
}

/**
 * Build a fully-mapped segment from character + scene data.
 * Shared by both the new `segments` format and the legacy `blocks` format.
 */
function buildMappedSegment(
  index: number,
  schemaId: string,
  globalStyle: string,
  character: CharacterConfig,
  data: {
    title: string;
    text: string;
    sceneDescription?: string;
    videoDescription?: string;
    emotion?: string;
    productInteractionType?: string;
  },
  product?: { name?: string; description?: string },
): Segment & { character: CharacterConfig } {
  const segmentId = `${schemaId}-seg-${index}`;
  const calculatedDuration = calculateEstimatedDuration(data.text);
  const durationMs = calculatedDuration * 1000;

  const interaction = data.productInteractionType || "none";
  const isProductShot = interaction !== "none";

  let promptPrefix = globalStyle;
  if (isProductShot && product?.name) {
    promptPrefix = `${globalStyle}, ${buildProductActionPrefix(interaction, product.name, product.description)}`;
  }

  const emotionPrompt = data.emotion ? `with a ${data.emotion} expression` : "";
  const characterVisual = `${character.visualDescription}${emotionPrompt ? `, ${emotionPrompt}` : ""}`;

  // Stage 1: firstFramePrompt (Persona + Ambient)
  const isContentShot = interaction.includes("product_content");
  const visualQuality = `cinematic lighting, ultra-detailed textures, ${globalStyle}`;
  const packagingAccuracy =
    "The product packaging in the scene must be reproduced with exact colors, exact branding text, and exact label details from the reference image — do not stylize, recolor, or alter the product packaging in any way, photorealistic product, faithful brand reproduction";
  const contentAccuracy =
    "Focus heavily on the texture, material, and visual characteristics of the internal product content (the substance) as shown in the reference images — maintain high visual fidelity to its shape and appearance.";
  const productAccuracy = isContentShot ? contentAccuracy : packagingAccuracy;
  const sceneVisual = data.sceneDescription || DEFAULT_SCENE_VISUAL(globalStyle);

  const firstFramePrompt = [
    globalStyle,
    characterVisual,
    sceneVisual,
    visualQuality,
    isProductShot ? productAccuracy : "",
    SINGLE_FRAME_SUFFIX,
  ]
    .filter(Boolean)
    .join(", ");

  // Stage 2: videoPrompt (Veo)
  const finalVideoPrompt = [
    promptPrefix,
    characterVisual,
    sceneVisual,
    data.videoDescription || DEFAULT_MOTION_VISUAL,
    "the character has NO TEXT, NO LETTERS, AND NO WORDS on them.",
    SINGLE_FRAME_SUFFIX,
  ]
    .filter(Boolean)
    .join(", ");

  const result = {
    id: segmentId,
    title: data.title,
    description: data.videoDescription || data.sceneDescription || "",
    text: data.text,
    characterId: character.id,
    character: { ...character, emotion: data.emotion },
    emotion: data.emotion,
    tags: [character.name, character.role, data.emotion || ""],
    prompt_preview: `${promptPrefix}, ${character.visualDescription} in ${sceneVisual}`,
    shots: splitTextIntoShots(data.text).map((words, shotIndex) => {
      const shotDurationS = calculateEstimatedDuration(words);
      let snappedDurationS = 8;
      if (shotDurationS <= 4) snappedDurationS = 4;
      else if (shotDurationS <= 6) snappedDurationS = 6;
      else snappedDurationS = 8;
      const durationMs = snappedDurationS * 1000;

      return {
        type: isProductShot ? "product" : "generic",
        category: character.role,
        characterId: character.id,
        words,
        emotion: data.emotion,
        firstFramePrompt: shotIndex === 0 ? firstFramePrompt : undefined,
        videoPrompt: finalVideoPrompt,
        display: { from: 0, to: durationMs }, // To be fixed in loop below
        duration: durationMs,
      };
    }),
    duration: durationMs,
    estimatedDuration: calculatedDuration,
  };

  // Fix consecutive display timings and recalculate parent segment duration
  let cumulativeMs = 0;
  for (const shot of result.shots) {
    shot.display.from = cumulativeMs;
    shot.display.to = cumulativeMs + shot.duration;
    cumulativeMs += shot.duration;
  }
  result.duration = cumulativeMs;
  result.estimatedDuration = cumulativeMs / 1000;

  return result as Segment & { character: CharacterConfig };
}

/**
 * Maps the frontend's JSON payload into the internal VideoSchema.
 *
 * Accepts TWO input shapes:
 * 1. **New format** (preferred): `input.segments` — array of scene objects each with a nested
 *    `character: { name, role, visualDescription, voiceDescription }`. Produced by the character
 *    ad script generator using `CHARACTER_AD_SCRIPT_OUTPUT_SCHEMA`.
 * 2. **Legacy format**: `input.blocks` — flat `UserScriptBlock[]` array.
 *
 * In both cases, every output `Segment` will have a `character` field set to the resolved
 * `CharacterConfig` object so the orchestrator downstream can work with character data directly.
 */
export function mapInputToSchema(input: GenerateCharacterVideoInput): VideoSchema {
  const schemaId = `char-ad-${nanoid(8)}`;
  const globalStyle = input.visuals?.style || DEFAULT_STYLE;
  const aspectRatio = DEFAULT_ASPECT_RATIO;
  const videoTitle = DEFAULT_TITLE;

  // ── Resolve input source ────────────────────────────────────────────────
  const hasNewSegments = input.segments && input.segments.length > 0;
  const hasLegacyBlocks = input.blocks && input.blocks.length > 0;

  if (!hasNewSegments && !hasLegacyBlocks) {
    throw new Error("mapInputToSchema: either `segments` or `blocks` must be provided");
  }

  // ── Build character registry ────────────────────────────────────────────
  const characterMap = new Map<string, CharacterConfig>();

  if (hasNewSegments) {
    // New format: read character from each segment
    input.segments!.forEach((seg) => {
      const { name, role, visualDescription, voiceDescription } = seg.character;
      if (!characterMap.has(name)) {
        let finalVisualDescription = visualDescription;
        if (!finalVisualDescription) {
          if (role === "hero") finalVisualDescription = DEFAULT_HERO_VISUAL(globalStyle);
          else if (role === "villain") finalVisualDescription = DEFAULT_VILLAIN_VISUAL(globalStyle);
          else if (role === "human") finalVisualDescription = DEFAULT_HUMAN_VISUAL(globalStyle);
          else finalVisualDescription = DEFAULT_SCENE_VISUAL(globalStyle);
        }
        characterMap.set(name, {
          id: `char-${nanoid(4)}`,
          name,
          role,
          visualDescription: finalVisualDescription,
          voiceDescription:
            voiceDescription ||
            (role === "villain" ? "Raspy, sneaky, fast-talking" : "Warm, deep, confident"),
          baseImageUrl: undefined,
        });
      }
    });
  } else {
    // Legacy format: read character from blocks
    input.blocks!.forEach((block) => {
      if (!characterMap.has(block.characterName)) {
        let visualDescription = block.characterDescription;
        if (!visualDescription) {
          if (block.characterRole === "hero") visualDescription = DEFAULT_HERO_VISUAL(globalStyle);
          else if (block.characterRole === "villain")
            visualDescription = DEFAULT_VILLAIN_VISUAL(globalStyle);
          else if (block.characterRole === "human")
            visualDescription = DEFAULT_HUMAN_VISUAL(globalStyle);
          else visualDescription = DEFAULT_SCENE_VISUAL(globalStyle);
        }
        characterMap.set(block.characterName, {
          id: `char-${nanoid(4)}`,
          name: block.characterName,
          role: block.characterRole,
          visualDescription,
          voiceDescription:
            block.voiceDescription ||
            (block.characterRole === "villain"
              ? "Raspy, sneaky, fast-talking"
              : "Warm, deep, confident"),
          baseImageUrl: undefined,
        });
      }
    });
  }

  const characters = Array.from(characterMap.values());

  // ── Map to segments ─────────────────────────────────────────────────────
  let segments: (Segment & { character: CharacterConfig })[];

  if (hasNewSegments) {
    segments = input.segments!.map((seg, index) => {
      const character = characterMap.get(seg.character.name)!;
      return buildMappedSegment(
        index,
        schemaId,
        globalStyle,
        character,
        {
          title: seg.title,
          text: seg.text,
          sceneDescription: seg.sceneDescription,
          videoDescription: seg.videoDescription,
          emotion: seg.character.emotion,
          productInteractionType: seg.productInteractionType,
        },
        input.product,
      );
    });
  } else {
    segments = input.blocks!.map((block, index) => {
      const character = characterMap.get(block.characterName)!;
      return buildMappedSegment(
        index,
        schemaId,
        globalStyle,
        character,
        {
          title: `Scene ${index + 1}: ${block.characterName}`,
          text: block.dialogue,
          sceneDescription: block.sceneDescription,
          videoDescription: block.videoDescription,
          emotion: block.emotion,
          productInteractionType: block.productInteractionType,
        },
        input.product,
      );
    });
  }

  return {
    id: schemaId,
    title: videoTitle,
    description: `Character-driven ad: ${videoTitle}`,
    promptPreview: globalStyle,
    tags: ["character-driven-ad", ...characters.map((c) => c.name)],
    voice: { name: "Native / Veo 3.1" },
    visuals: {
      type: "character-driven-ad" as any,
      style: globalStyle,
    },
    caption: {
      id: "modern-captions",
      name: "Modern",
      position: "bottom",
      size: "medium",
    },
    resolution: resolutionType.High,
    aspectRatio: aspectRatio as aspectRatioType,
    type: "character-driven-ad",
    audioMode: "native-video-model",
    characters,
    segments,
  };
}
