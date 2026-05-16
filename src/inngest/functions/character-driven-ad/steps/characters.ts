import { VideoSchema } from "@/types/segment";
import { CharacterAdServices } from "../services";
import { fileUrlToBuffer } from "../../common/utils/common";

/**
 * Stage 1: Generate one scene-specific composition image per shot.
 * Each image captures the character's appearance + scene action,
 * and is stored as shot.imageUrl to be used as firstFrameUrl or
 * referenceImages in Stage 2 (veo.ts).
 */
export const generateCharacterSeedImages = async (
  schemeId: string,
  scheme: VideoSchema,
  services: CharacterAdServices,
  runToken: string,
) => {
  const characters = scheme.characters || [];
  const globalStyle = scheme.visuals.style;

  // Generate a scene image for every shot across all segments
  const promises: Promise<{ segmentId: string; shotIndex: number; imageUrl: string }>[] = [];

  for (const segment of scheme.segments) {
    const character = characters.find((c) => c.id === segment.characterId);
    if (!character) continue;

    const shots = segment.shots || [];

    for (let shotIndex = 0; shotIndex < shots.length; shotIndex++) {
      const shot = shots[shotIndex];

      promises.push(
        (async () => {
          // shot.firstFramePrompt is pre-computed in mapping.ts:
          // - product shots  → neutral ready-pose (hands free, no product)
          // - generic shots  → full scene context
          // Both already include SINGLE_FRAME_SUFFIX.
          const prompt =
            shot.firstFramePrompt ||
            `${globalStyle}, ${character.visualDescription?.trim() || character.role}, cinematic lighting, Pixar style`;

          console.log(
            `[Stage 1] Generating scene image for ${segment.id} shot ${shotIndex} (${shot.type}): ${prompt.slice(0, 80)}...`,
          );

          // For product shots: pass real product assets so the generator uses the actual
          // packaging instead of hallucinating one. Non-product shots get no references.
          const productImageUrls =
            shot.type === "product" && scheme.assets?.length
              ? scheme.assets.filter((a) => a.type === "image").map((a) => a.url)
              : [];

          console.log("PROMPT: ", prompt);
          const imageUrl = await services.imageGenerator.create({
            prompt,
            aspectRatio: scheme.aspectRatio,
            ...(productImageUrls.length ? { imageUrls: productImageUrls } : {}),
          });

          // Upload to R2 for persistence
          const { buffer, contentType } = await fileUrlToBuffer(imageUrl);
          const storagePath = `character-driven-ad/${schemeId}/scenes/${segment.id}-shot-${shotIndex}.png`;
          const persistentUrl = await services.r2.uploadData(storagePath, buffer, contentType);

          return { segmentId: segment.id, shotIndex, imageUrl: persistentUrl, prompt };
        })(),
      );
    }
  }

  return Promise.all(promises);
};
