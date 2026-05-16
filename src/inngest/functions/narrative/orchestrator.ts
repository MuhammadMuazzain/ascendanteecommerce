import { NonRetriableError } from "inngest";

import { getInngestApp } from "../../index";
import type { PriceItem, SegmentAsset, VideoSchema } from "../../utils/types";

import { db } from "@/lib/database";
import { withDbRetry } from "@/lib/database/retry";
import { initializeServices } from "../common/services";
import * as narrativeSteps from "./steps/index";
import * as narrativeVisuals from "./steps/visuals";
import * as pipelineSteps from "../common/steps";

import { ResolverStatus, VideoType } from "@/utils/enum";
import { workflowChannel } from "../../utils/common";
import { ToastType } from "../../utils/types";
import { advanceGenerationTask } from "../../utils/generation-progress";
import { ensureObject, fetchWorkflowState } from "../common/services/utils";
import { NARRATIVE_TASK_KEYS, NARRATIVE_TASKS } from "./constants";
import { applyLipsyncToScheme } from "../lipsync-resolver";

const inngest = getInngestApp();

export const narrativeVideoOrchestrator = inngest.createFunction(
  { id: "narrative-video-orchestrator", triggers: { event: "video/narrative.orchestrate" } },

  async ({ event, step, attempt }) => {
    let scheme: VideoSchema = event.data.scheme;
    const schemeId = scheme.id;
    const channel = workflowChannel(schemeId);
    const services = initializeServices();
    let resultPreviewUrl: string | undefined = undefined;

    try {
      await step.run("publish-start-toast", async () => {});

      await step.run("mark-generation-progress-analysis", async () => {
        await advanceGenerationTask(schemeId, NARRATIVE_TASK_KEYS.ANALYSIS, NARRATIVE_TASKS);
        await db
          .updateTable("generations")
          .set({ status: ResolverStatus.PROGRESS })
          .where("id", "=", schemeId)
          .execute();
      });

      // ========================================================================
      // PIPELINE STAGES - CONTROLS
      // ========================================================================
      const STAGE_1_SCHEMA_PROMPTS = true;
      const STAGE_2_AUDIO_CAPTIONS = true;
      const STAGE_3_FIRST_FRAMES = true;
      const STAGE_4_TIMINGS = true;
      const STAGE_5_VIDEOS = true;
      const STAGE_6_LIPSYNC = true;
      const STAGE_7_FINALIZING = true;

      let prePrice: PriceItem = {
        price: 0,
        service: "Gemini-2-V5",
        type: "analysis_initial",
      };
      let audioData: any = null;
      let allVisualPrices: any[] = [];
      let context: any = null;
      let userId: string | null = null;
      let projectId: string = "";
      let result: any = null;

      // ========================================================================
      // STAGE 1: SCHEMA AND PROMPT GENERATION
      // ========================================================================
      if (STAGE_1_SCHEMA_PROMPTS) {
        const generatedSchema = await step.run("generate-schema", async () => {
          return pipelineSteps.generateInitialSchema(scheme);
        });

        const { segments: mergedSegments } = await step.run("merge-segments", async () => {
          return pipelineSteps.mergeSegments(generatedSchema);
        });

        scheme.segments = mergedSegments.map((s: any, index: number) => ({
          ...s,
          id: `${schemeId}-seg-${index}`,
          estimatedDuration: s.estimatedDuration ?? Math.round((s.text ?? "").length / 20),
        }));

        if (generatedSchema.segments) {
          generatedSchema.segments = scheme.segments as any;
        }

        scheme.title = generatedSchema.title || "";
        scheme.description = generatedSchema.description || "";
        scheme.tags = generatedSchema.tags || [];
        scheme.promptPreview = generatedSchema.prompt_preview || "";
        scheme.topic = generatedSchema.topic;

        await step.run("save-schema-initial", async () => {
          return pipelineSteps.saveSchema(schemeId, scheme, ResolverStatus.PROGRESS);
        });

        const { generatedPrompts, prePrice: resolvedPrePrice } =
          await narrativeSteps.generateNarrativePrompts(scheme, generatedSchema, step);
        prePrice = resolvedPrePrice ?? prePrice;

        if (generatedPrompts && generatedPrompts.length > 0) {
          scheme.segments = narrativeSteps.applyPromptsToSegments(scheme, generatedPrompts);

          await step.run("save-schema-with-prompts", async () => {
            return pipelineSteps.saveSchema(schemeId, scheme, ResolverStatus.PROGRESS);
          });
        }
      }

      // ========================================================================
      // STAGE 2: AUDIO AND CAPTIONS
      // ========================================================================
      if (STAGE_2_AUDIO_CAPTIONS) {
        const { dbSegments, projectId: fetchedProjectId } = await step.run(
          "fetch-stage-2-state",
          async () => fetchWorkflowState(schemeId),
        );
        projectId = fetchedProjectId;
        scheme.segments = dbSegments.map((s: any) => s.segment_data);

        await step.run("mark-generation-progress-assets", async () => {
          return advanceGenerationTask(schemeId, NARRATIVE_TASK_KEYS.ASSETS, NARRATIVE_TASKS);
        });

        const validationData = await step.run("Validation data preprocessing", () =>
          pipelineSteps.validateUserId(schemeId),
        );
        userId = validationData.userId;

        await step.run("mark-generation-progress-audio", async () => {
          return advanceGenerationTask(schemeId, NARRATIVE_TASK_KEYS.AUDIO, NARRATIVE_TASKS);
        });

        audioData = await step.run("Processing audio and captions", () =>
          pipelineSteps.processAudioAndCaptions(
            { services, scheme, schemeId, attempt },
            userId,
            projectId,
          ),
        );

        if (audioData?.segmentAssets) {
          scheme.segments = scheme.segments.map((s) => ({
            ...s,
            speechToText: audioData.segmentAssets[s.id]?.speechToText || s.speechToText,
            textToSpeech: audioData.segmentAssets[s.id]?.textToSpeech || s.textToSpeech,
          }));
          await step.run("save-schema-with-audio", async () => {
            return pipelineSteps.saveSchema(schemeId, scheme, ResolverStatus.PROGRESS);
          });
        }
      }

      try {
        // ========================================================================
        // STAGE 3: FIRST FRAMES
        // ========================================================================
        if (
          STAGE_3_FIRST_FRAMES &&
          (scheme.visuals.type === VideoType.AI_IMAGES ||
            scheme.visuals.type === VideoType.AI_VIDEOS)
        ) {
          const { dbSegments } = await step.run("fetch-stage-3-state", async () =>
            fetchWorkflowState(schemeId),
          );
          scheme.segments = dbSegments.map((s: any) => ensureObject(s.segment_data));
          context = { services, scheme, schemeId, attempt };

          const step3Results = await step.run("Generating shot first frames", () =>
            narrativeVisuals.generateShotFirstFrames(context, userId, projectId),
          );
          if (step3Results.previewUrl) resultPreviewUrl = step3Results.previewUrl;
          if (step3Results.prices) allVisualPrices.push(...step3Results.prices);
        }

        // ========================================================================
        // STAGE 4: TIMINGS
        // ========================================================================
        if (STAGE_4_TIMINGS) {
          const { dbSegments } = await step.run("fetch-stage-4-state", async () =>
            fetchWorkflowState(schemeId),
          );
          scheme.segments = dbSegments.map((s: any) => ensureObject(s.segment_data));
          context = { services, scheme, schemeId, attempt };

          await step.run("mark-generation-progress-timings", async () => {
            return advanceGenerationTask(schemeId, NARRATIVE_TASK_KEYS.TIMINGS, NARRATIVE_TASKS);
          });

          const { prices } = await step.run("Generating shot timings", () =>
            narrativeVisuals.generateShotTimings(context, userId, projectId),
          );
          if (prices) allVisualPrices.push(...prices);
        }

        // ========================================================================
        // STAGE 5: VIDEOS
        // ========================================================================
        if (STAGE_5_VIDEOS && scheme.visuals.type === VideoType.AI_VIDEOS) {
          const { dbSegments } = await step.run("fetch-stage-5-state", async () =>
            fetchWorkflowState(schemeId),
          );
          scheme.segments = dbSegments.map((s: any) => ensureObject(s.segment_data));
          context = { services, scheme, schemeId, attempt };

          await step.run("mark-generation-progress-media", async () => {
            return advanceGenerationTask(schemeId, NARRATIVE_TASK_KEYS.MEDIA, NARRATIVE_TASKS);
          });

          const { prices } = await step.run("Generating shot videos", () =>
            narrativeVisuals.generateShotVideos(context, userId, projectId),
          );
          if (prices) allVisualPrices.push(...prices);
        }

        // ========================================================================
        // CONSOLIDATION
        // ========================================================================
        result = await step.run("Consolidating modular results", async () => {
          const { dbSegments: finalSegments } = await fetchWorkflowState(schemeId);
          scheme.segments = finalSegments.map((s: any) => ensureObject(s.segment_data));

          const allPrices: PriceItem[] = [...(audioData?.prices || [])];
          const allSegmentAssets: Record<string, SegmentAsset[]> = {};

          if (audioData?.segmentAssets) {
            Object.entries(audioData.segmentAssets).forEach(([id, data]: [string, any]) => {
              allSegmentAssets[id] = data.assets || [];
            });
          }

          let totalDurationMs = 0;
          scheme.segments.forEach((seg: any) => {
            if (seg.duration) totalDurationMs += seg.duration;
            if (seg.assets?.length) {
              allSegmentAssets[seg.id] = [...(allSegmentAssets[seg.id] || []), ...seg.assets];
            }
          });

          return {
            ...scheme,
            prices: [...allPrices, ...allVisualPrices],
            segmentAssets: allSegmentAssets,
            preview_url: resultPreviewUrl || (scheme as any).preview_url,
            duration: totalDurationMs,
          };
        });

        // ========================================================================
        // STAGE 6: LIPSYNC
        // ========================================================================
        if (STAGE_6_LIPSYNC && scheme.avatar?.url) {
          await step.run("mark-generation-progress-lipsync", async () => {
            return advanceGenerationTask(schemeId, NARRATIVE_TASK_KEYS.LIPSYNC, NARRATIVE_TASKS);
          });
          result = await step.run("apply-lipsync-to-schema", async () => {
            return applyLipsyncToScheme(result || scheme, schemeId);
          });
        }

        // ========================================================================
        // STAGE 7: FINALIZING
        // ========================================================================
        if (STAGE_7_FINALIZING) {
          await step.run("mark-generation-progress-finalizing", async () => {
            return advanceGenerationTask(schemeId, NARRATIVE_TASK_KEYS.FINALIZING, NARRATIVE_TASKS);
          });

          await step.run("update-segments-post-resolver", async () => {
            const { segmentQueries: sq } = await import("@/lib/database/segment-queries");
            let finalScheme = result || scheme;

            // Re-fetch current schema from DB if result is null (stateless resume)
            if (!result) {
              const currentGen = await db
                .selectFrom("generations")
                .select("output")
                .where("id", "=", schemeId)
                .executeTakeFirst();
              if (
                currentGen?.output &&
                typeof currentGen.output === "object" &&
                (currentGen.output as any).segments
              ) {
                finalScheme = currentGen.output as any;
              }
            }

            await sq.bulkUpdateSegments(
              finalScheme.segments.map((s: any, index: number) => ({
                id: s.id,
                order: index,
                segment_data: JSON.parse(JSON.stringify(ensureObject(s))),
              })),
            );

            const allPrices = [
              ...(audioData?.prices || []),
              ...allVisualPrices,
              ...(prePrice ? [prePrice] : []),
            ];
            const validPricing = allPrices.filter((p) => p && typeof p.price === "number");
            const totalCost = validPricing.reduce((acc, obj) => acc + obj.price, 0);

            const currentGeneration = await db
              .selectFrom("generations")
              .select("metadata")
              .where("id", "=", schemeId)
              .executeTakeFirst();

            const currentMetadata = (currentGeneration?.metadata as object) || {};

            await withDbRetry(() =>
              db
                .updateTable("generations")
                .set({
                  output: JSON.parse(JSON.stringify(finalScheme)),
                  metadata: JSON.parse(
                    JSON.stringify({
                      ...currentMetadata,
                      title: finalScheme.title,
                      totalCost,
                    }),
                  ),
                  status: ResolverStatus.COMPLETED,
                  progress: 100,
                })
                .where("id", "=", schemeId)
                .execute(),
            );
          });
        }

        return { result: result || scheme };
      } catch (err: any) {
        console.error(`[ORCHESTRATOR] Generation failed for ${schemeId}:`, err);
        await step.run("mark-generation-failed", async () => {
          return db
            .updateTable("generations")
            .set({
              status: ResolverStatus.FAILED,
              progress: 0,
              metadata: { error: err.message || "Unknown error" },
            })
            .where("id", "=", schemeId)
            .execute();
        });
        throw err;
      }
    } catch (err: any) {
      console.error("Narrative Orchestrator Error:", err);
      const message = err instanceof Error ? err.message : "Unknown error";
      if (schemeId) {
        await db
          .updateTable("generations")
          .set({ status: ResolverStatus.FAILED })
          .where("id", "=", schemeId)
          .execute();
      }
      throw new NonRetriableError(`Narrative workflow failed: ${message}`, { cause: err });
    }
  },
);
