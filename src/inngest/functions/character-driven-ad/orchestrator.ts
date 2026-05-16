import { nanoid } from "nanoid";
import { getInngestApp } from "../../index";
import { initializeCharacterAdServices } from "./services";
import {
  generateCharacterSeedImages,
  generateSegmentVideo,
  refineCharacterClips,
  generateCharacterSoundEffects,
  generateCharacterAdShots,
  mapShotsToSegments,
} from "./steps";
import { mapInputToSchema } from "./utils/mapping";
import { saveSchema } from "../common/steps";
import { db } from "@/lib/database";
import { ResolverStatus } from "@/utils/enum";
import { ToastType, VideoSchema } from "../../utils/types";
import { workflowChannel } from "../../utils/common";
import { GeminiService } from "@/lib/gemini/generator";
import { getCharacterAdParserSystemPrompt, CHARACTER_AD_SCRIPT_OUTPUT_SCHEMA } from "./prompts";

const inngest = getInngestApp();

/**
 * Character-Driven Ad Orchestrator
 *
 * Specialized pipeline for generating multi-character ads with native lip-sync.
 * Uses Veo 3.1 Fast's ability to generate video and lip-synced audio from a single payload.
 */
export const characterDrivenAdOrchestrator = inngest.createFunction(
  {
    id: "character-driven-ad-orchestrator",
    triggers: { event: "character-ad/video.orchestrate" },
  },
  async ({ event, step }) => {
    let scheme: VideoSchema = event.data.scheme;
    const schemeId = scheme.id;
    const runToken = (event.id ?? nanoid()).slice(0, 8);
    const services = initializeCharacterAdServices();

    try {
      // 0. Stage 0: Schema Generation (from raw script or missing segments)
      if (!scheme.segments || scheme.segments.length === 0) {
        scheme = await step.run("generate-schema-from-content", async () => {
          let segmentsInput: any = scheme.segments;

          // If segments are missing but script is present, parse the script into segments
          if ((!segmentsInput || segmentsInput.length === 0) && scheme.script) {
            const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
            if (!apiKey) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set");

            const gemini = new GeminiService(apiKey, "gemini-3.1-flash-lite-preview");
            const systemPrompt = getCharacterAdParserSystemPrompt(
              scheme.visuals?.style,
              scheme.product?.name,
              scheme.product?.description,
            );

            // Extract visual asset urls so the LLM can use them for product/character analysis
            const imageUrls = (scheme.assets || [])
              .filter((a) => a.type === "image" && a.url)
              .map((a) => a.url as string);

            const result = await gemini.generateScriptAssistant({
              message: `Parse this script into structured segments: \n\n${scheme.script}`,
              imageUrls,
              productName: scheme.product?.name,
              productDescription: scheme.product?.description,
              systemPrompt,
              outputSchema: CHARACTER_AD_SCRIPT_OUTPUT_SCHEMA,
            });

            segmentsInput = result.segments;
          }

          const mapped = mapInputToSchema({
            segments: segmentsInput,
            blocks: scheme.blocks,
            product: scheme.product,
            assets: scheme.assets,
            visuals: scheme.visuals,
          });

          const updated = { ...scheme, ...mapped, id: schemeId };

          // Stage 0.5: Persist the generated schema to DB
          await saveSchema(schemeId, updated, ResolverStatus.PROGRESS);

          return updated;
        });
      }

      // 0.5. Stage 0.5: Smart LLM Shot Prompts Generation
      // The segments' shots are already pre-split deterministically by mapInputToSchema
      // (ensuring strict duration boundaries <= 8 seconds per shot).
      // Here, we take those shots and ask the LLM to write continuous "smart" Prompts and Emotions
      // specific to each shot.
      scheme = await step.run("generate-smart-shots-stage-0-5", async () => {
        const shotResults = await generateCharacterAdShots(scheme);
        const updatedScheme = { ...scheme, segments: mapShotsToSegments(scheme, shotResults) };

        // Save schema so downstream steps see the enhanced videoPrompts
        await saveSchema(schemeId, updatedScheme, ResolverStatus.PROGRESS);
        return updatedScheme;
      });

      // Temporary return to debug the output JSON before generation costs hit
      // return { scheme };

      // 1. Initial Status Update
      await step.run("mark-orchestration-start", async () => {
        await db
          .updateTable("generations")
          .set({ status: ResolverStatus.PROGRESS })
          .where("id", "=", schemeId)
          .execute();
      });

      await step.run("publish-analysis-start-toast", async () => {});

      // 2. Stage 1: Generate Scene Composition Images per Shot
      scheme = await step.run("initialize-character-images", async () => {
        const shotUpdates = await generateCharacterSeedImages(schemeId, scheme, services, runToken);

        // 1. Update segments (shot imageUrl + segment firstFrameUrl)
        const updatedSegments = scheme.segments.map((seg) => {
          const shotUpdate = shotUpdates.find((u) => u.segmentId === seg.id && u.shotIndex === 0);
          return {
            ...seg,
            firstFrameUrl: shotUpdate?.imageUrl || seg.firstFrameUrl,
            imageUrl: shotUpdate?.imageUrl || seg.imageUrl,
            shots: (seg.shots || []).map((shot, shotIndex) => {
              const update = shotUpdates.find(
                (u) => u.segmentId === seg.id && u.shotIndex === shotIndex,
              );
              return update ? { ...shot, imageUrl: update.imageUrl } : shot;
            }),
          };
        });

        // 2. Update character baseImageUrl for global consistency
        const updatedCharacters = (scheme.characters || []).map((char) => {
          const firstAppearance = shotUpdates.find((u) => {
            const seg = scheme.segments.find((s) => s.id === u.segmentId);
            return seg?.characterId === char.id;
          });
          return firstAppearance ? { ...char, baseImageUrl: firstAppearance.imageUrl } : char;
        });

        return {
          ...scheme,
          segments: updatedSegments,
          characters: updatedCharacters,
        };
      });
      // return {scheme}
      // Persist the full scheme back to DB metadata
      await step.run("sync-metadata-stage-1", async () => {
        await db
          .updateTable("generations")
          .set({ metadata: JSON.stringify(scheme) })
          .where("id", "=", schemeId)
          .execute();
        return scheme;
      });

      await step.run("publish-veo-start-toast", async () => {});

      // 3. Stage 2: Generate Videos (Veo 3.1 Fast)
      scheme = await step.run("generate-video-clips", async () => {
        const results = await generateSegmentVideo(schemeId, scheme, services, runToken);

        const updatedSegments = scheme.segments.map((seg) => {
          const result = results.find((r: any) => r.id === seg.id);
          if (result && (result as any).success) {
            return {
              ...seg,
              duration: (result as any).duration,
              shots: (result as any).shots,
            };
          }
          return seg;
        });

        return { ...scheme, segments: updatedSegments };
      });

      // Persist the full scheme back to DB metadata
      await step.run("sync-metadata-stage-2", async () => {
        await db
          .updateTable("generations")
          .set({ metadata: JSON.stringify(scheme) })
          .where("id", "=", schemeId)
          .execute();
        return scheme;
      });

      // 4. Stage 3: Audio Refinement (ElevenLabs Audio Isolation + ffmpeg merge)
      await step.run("publish-refinement-start-toast", async () => {});

      scheme = await step.run("refine-generated-videos", async () => {
        // Collect current clips from ALL shots in ALL segments
        const clipsToRefine = scheme.segments
          .flatMap((seg) =>
            (seg.shots || []).map((shot: any, index: number) => ({
              id: `${seg.id}-shot-${index}`,
              url: shot.videoUrl || seg.imageUrl,
              segmentId: seg.id,
              shotIndex: index,
            })),
          )
          .filter((c) => !!c.url);

        const refinedClips = await refineCharacterClips(
          schemeId,
          clipsToRefine as any[],
          services,
          runToken,
        );

        // Update with refined URLs strictly matching the shot index
        const updatedSegments = scheme.segments.map((seg) => {
          return {
            ...seg,
            shots: (seg.shots || []).map((shot: any, index: number) => {
              const refined = refinedClips.find((c) => c.id === `${seg.id}-shot-${index}`);
              return {
                ...shot,
                videoUrl: refined && refined.url ? refined.url : shot.videoUrl,
              };
            }),
          };
        });

        return { ...scheme, segments: updatedSegments };
      });

      // Persist the full scheme back to DB metadata
      await step.run("sync-metadata-stage-3", async () => {
        await db
          .updateTable("generations")
          .set({ metadata: JSON.stringify(scheme) })
          .where("id", "=", schemeId)
          .execute();
        return scheme;
      });

      // 5. Stage 4: Generate Sound Effects
      await step.run("publish-sfx-start-toast", async () => {});

      scheme = await step.run("generate-sound-effects", async () => {
        // We need Stage 2 results for analysis (original native audio)
        // Find the "generate-video-clips" result from historical steps
        // NOTE: In Inngest, we could pass it down, but here it's easier to access from scheme
        // if we didn't overwrite the original URLs. But we did refined them.
        // So we might need to store the original URLs somewhere if we want "meaningful analysis".
        // For now, let's assume we can find them if we were careful.
        // Actually, the previous implementation tried to find it in `videoResults`.
        // I'll make sure it's available or accessible.

        const clipsForSfx = scheme.segments.map((seg) => {
          return {
            id: seg.id,
            url: (seg.shots?.[0] as any)?.videoUrl,
            // We'll use the current URL for analysis if we don't have the original
            originalUrl: (seg.shots?.[0] as any)?.videoUrl,
          };
        });

        const finalClips = await generateCharacterSoundEffects(
          schemeId,
          clipsForSfx,
          services,
          runToken,
        );

        // Update scheme with refined URLs and SFX
        const updatedSegments = scheme.segments.map((seg) => {
          const finalClip = finalClips.find((c) => c.id === seg.id);
          if (finalClip) {
            return {
              ...seg,
              soundEffects: finalClip.soundEffects,
              effects: finalClip.effects,
              shots: (seg.shots || []).map((shot) => ({
                ...shot,
                videoUrl: finalClip.url,
                effects: finalClip.effects,
              })),
            };
          }
          return seg;
        });

        return { ...scheme, segments: updatedSegments };
      });

      // One final metadata sync before completion
      await step.run("sync-metadata-final", async () => {
        await db
          .updateTable("generations")
          .set({ metadata: JSON.stringify(scheme) })
          .where("id", "=", schemeId)
          .execute();
        return scheme;
      });

      // 5. Final Status Update
      await step.run("mark-orchestration-complete", async () => {
        // Update generations metadata with the finalized character/segment mapping
        await db
          .updateTable("generations")
          .set({
            status: ResolverStatus.COMPLETED,
            metadata: JSON.stringify(scheme),
          })
          .where("id", "=", schemeId)
          .execute();
      });

      await step.run("publish-done-toast", async () => {});

      return { success: true };
    } catch (err: any) {
      console.error("[Character Ad Orchestrator Error]:", err);
      const message = err.message || "Unknown error";

      await step.run("publish-error-toast", async () => {});

      await db
        .updateTable("generations")
        .set({ status: ResolverStatus.FAILED })
        .where("id", "=", schemeId)
        .execute();

      throw err;
    }
  },
);
