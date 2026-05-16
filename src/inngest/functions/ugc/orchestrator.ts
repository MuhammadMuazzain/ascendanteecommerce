import { NonRetriableError } from "inngest";
import { nanoid } from "nanoid";

import { getInngestApp } from "../../index";
import type { VideoSchema } from "../../utils/types";

import { db } from "@/lib/database";
import { withDbRetry } from "@/lib/database/retry";
import { initializeUgcServices } from "./services";
import * as pipelineSteps from "./steps";

import { ResolverStatus } from "@/utils/enum";
import { advanceGenerationTask } from "../../utils/generation-progress";
import { enhanceUgcSegment } from "./utils/audio-enhancer";
import { DistributedSemaphore } from "../../services/semaphore";

import { fetchWorkflowState } from "../common/services/utils";
import { UGC_TASK_KEYS, UGC_TASKS } from "./constants";
import { generateCreativePrompt } from "@/lib/prompts";
import { collectProductAssetUrls } from "@/lib/ugc/product-assets";

const phonosSemaphore = new DistributedSemaphore("phonos:audio_enhancement_slots", 5, 300000);

const inngest = getInngestApp();

export const ugcVideoOrchestrator = inngest.createFunction(
  {
    id: "ugc-video-orchestrator",
    triggers: { event: "ugc/video.orchestrate" },
  },

  async ({ event, step }) => {
    let scheme: VideoSchema = event.data.scheme;
    const schemeId = scheme.id;

    let metadataPersisted = false;
    try {
      // ========================================================================
      // PIPELINE STAGES - CONTROLS
      // ========================================================================
      const STAGE_1_ANALYSIS_SCHEMA = true; // Phase 1: Script Analysis & Rendering Schema
      const STAGE_2_A_ROLL_VIDEO = true; // Phase 2: Generating main Avatar shots
      const STAGE_3_CUTAWAY_B_ROLL = false; // Phase 3: Generating full-screen B-roll clips
      const STAGE_4_OVERLAY_IMAGE = false; // Phase 4: Generating demonstrative Image Overlays (nano-banana-2)
      const STAGE_5_VOICE_ALIGNMENT = true; // Phase 5: Optional Voice Cloning & Alignment (STS)
      const STAGE_6_AUDIO_ENHANCEMENT = false; // Phase 6: Phonos Refinement
      // ========================================================================

      // --- PHASE 1: AI ANALYSIS & SCHEMA GENERATION ---
      await step.run("publish-start-toast", async () => {});

      await step.run("mark-generation-progress", async () => {
        await advanceGenerationTask(schemeId, UGC_TASK_KEYS.ANALYSIS, UGC_TASKS);
        await db
          .updateTable("generations")
          .set({ status: ResolverStatus.PROGRESS })
          .where("id", "=", schemeId)
          .execute();
      });

      const services = initializeUgcServices();
      const runToken = (event.id ?? nanoid()).slice(0, 8);

      // ========================================================================
      // STAGE 1: PLANSET GENERATION
      // ========================================================================
      if (STAGE_1_ANALYSIS_SCHEMA) {
        let generatedSchema: any = null;
        // 1. Generate Schema
        generatedSchema = await step.run("generate-schema", async () => {
          return pipelineSteps.generateInitialSchema(scheme);
        });

        // 2. Merge Segments
        const { segments: mergedSegments } = await step.run("merge-segments", async () => {
          return pipelineSteps.mergeSegments(generatedSchema);
        });

        // Ensure segments have deterministic IDs
        scheme.segments = mergedSegments.map((s: any, index: number) => ({
          ...s,
          id: `${schemeId}-seg-${index}`,
          estimatedDuration: s.estimatedDuration ?? Math.round((s.text ?? "").length / 20),
        }));

        if (generatedSchema.segments) {
          generatedSchema.segments = scheme.segments as any;
        }

        // Initial save to enable early rendering of the storyboard skeleton
        await step.run("save-schema-initial", async () => {
          return pipelineSteps.saveSchema(schemeId, scheme, ResolverStatus.PROGRESS);
        });

        await step.run("mark-generation-progress-assets", async () => {
          return await advanceGenerationTask(schemeId, UGC_TASK_KEYS.ASSETS, UGC_TASKS);
        });

        await step.run("mark-generation-progress-shots", async () => {
          console.log("Marking generation progress for shots");
          return await advanceGenerationTask(schemeId, UGC_TASK_KEYS.SHOTS, UGC_TASKS);
        });

        // 4. Generate Prompts (Shots and B-Rolls) - Unified to reduce latency
        // 4. Generate Prompts (Shots and B-Rolls) - Unified to reduce latency
        console.log("Generating unified shots and b-rolls for scheme:");
        const { prompts: unifiedPrompts } = await pipelineSteps.generateUgcUnifiedPrompts(
          scheme,
          generatedSchema,
          services,
          step,
        );

        const shots = (unifiedPrompts || []).map((p: any) => ({
          segmentId: p.segmentId,
          shots: p.shots,
        }));
        const bRolls = (unifiedPrompts || []).map((p: any) => ({
          segmentId: p.segmentId,
          bRolls: p.bRolls,
        }));

        scheme.segments = pipelineSteps.mapPromptsToSegments(scheme, shots, bRolls);

        // BAKE CREATIVE PROMPT: Pre-assemble the rich prompt for the UI to display and edit
        scheme.segments = scheme.segments.map((seg: any) => {
          const updatedShots = (seg.shots || []).map((shot: any) => {
            const dialogue = `AUDIO DIALOGUE (SPOKEN ONLY): ${seg.text || ""}`;
            const visuals = `VISUALS: ${shot.scenePrompt || "Professional environment"}`;
            const actions = `ACTIONS: ${shot.videoPrompt || "Natural speaking performance"}`;

            const newShot = {
              ...shot,
              videoPrompt: `${dialogue}\n${visuals}\n${actions}`.trim(),
            };
            delete newShot.scenePrompt;
            return newShot;
          });

          const updatedBRolls = (seg.bRolls || []).map((br: any) => {
            const visuals = `VISUALS: ${br.scenePrompt || "Cinematic cutaway"}`;
            const actions = `ACTIONS: ${br.videoPrompt || "Subtle motion"}`;

            const newBRoll = {
              ...br,
              videoPrompt: `${visuals}\n${actions}`.trim(),
            };
            delete newBRoll.scenePrompt;
            return newBRoll;
          });

          return {
            ...seg,
            shots: updatedShots,
            bRolls: updatedBRolls,
          };
        });

        await step.run("mark-generation-progress-schema", async () => {
          return await advanceGenerationTask(schemeId, UGC_TASK_KEYS.SCHEMA, UGC_TASKS);
        });

        // 5. Finalize Schema
        scheme.title = generatedSchema.title || "";
        scheme.description = generatedSchema.description || "";
        scheme.tags = generatedSchema.tags || [];
        scheme.promptPreview = generatedSchema.prompt_preview || "";
        scheme.topic = generatedSchema.topic;

        await step.run("save-schema-with-prompts", async () => {
          return pipelineSteps.saveSchema(schemeId, scheme, ResolverStatus.PROGRESS);
        });
      }

      // ========================================================================
      // STAGE 2: A-ROLL VIDEO GENERATION (AVATAR)
      // ========================================================================
      if (STAGE_2_A_ROLL_VIDEO) {
        const { dbSegments, projectId, schemaId, dbSchema } = await step.run(
          "fetch-group-2-state",
          async () => fetchWorkflowState(schemeId),
        );

        await step.run("publish-veo-start-toast", async () => {});

        await step.run("update-generation-veo-progress", async () => {
          return await db
            .updateTable("generations")
            .set({ metadata: { message: "Building rendering plan..." } })
            .where("id", "=", schemeId)
            .execute();
        });

        const sortedSegments = dbSegments;
        const avatarUrl = (dbSchema.avatar as any)?.url || scheme.avatar?.url;
        if (!avatarUrl?.trim()) {
          throw new NonRetriableError(
            "UGC video generation requires an avatar. Select or upload an avatar before generating.",
          );
        }
        const productUrls = collectProductAssetUrls({
          assets: ((dbSchema.assets as any[]) || scheme.assets) ?? [],
          productImages: (scheme as any).productImages,
          productImage: (scheme as any).productImage,
        });

        if (productUrls.length === 0) {
          console.warn(
            `[UGC] No product image URLs for scheme ${schemeId} — clips will use prompt text only`,
          );
        } else {
          console.log(`[UGC] Product reference URLs for Veo (${productUrls.length}):`, productUrls);
        }

        const { waves } = (await step.run("build-generation-plan", async () => {
          return pipelineSteps.buildGenerationPlan(sortedSegments as any);
        })) as { waves: any[][] };

        const allWaveItems = waves.flat();

        // 0. Persist All Metadata Before Generation
        await step.run("persist-generation-plan-metadata", async () => {
          for (const item of allWaveItems) {
            await pipelineSteps.updateUgcShotMetadata({
              segmentDbId: item.segmentId,
              mode: item.mode,
              firstFrameSource: item.firstFrameSource,
            });
          }
        });

        metadataPersisted = true;

        const dbSchemaSurrogate = {
          ...scheme,
          aspect_ratio: scheme.aspectRatio,
          avatar: dbSchema.avatar || scheme.avatar,
          assets: dbSchema.assets || scheme.assets,
        };

        // Phase 1: generate A-roll strictly in segment order so each clip continues from the previous last frame.
        await step.run("publish-rendering-toast", async () => {});

        let previousClipResult: { lastFrameUrl?: string } | undefined;
        for (const waveItem of allWaveItems) {
          const {
            segmentId: segmentDbId,
            segData,
            needsPreviousFrame,
            mode,
            firstFrameSource,
          } = waveItem;

          const segmentId = segData.id as string;

          const result: any = await step.run(
            `generate-ugc-video-${segmentId}-${runToken}`,
            async () => {
              return await pipelineSteps.generateUgcVideo({
                request: {
                  text: segData.text || "",
                  estimatedDuration: segData.estimatedDuration ?? 5,
                  shot: segData.shots?.[0],
                  mode,
                  firstFrameSource,
                  avatarUrl,
                  product: {
                    urls: productUrls,
                    name: (dbSchemaSurrogate as any)?.product?.name,
                    description: (dbSchemaSurrogate as any)?.product?.description,
                  },
                  aspectRatio: dbSchemaSurrogate.aspect_ratio || "9:16",
                  schemaId: schemeId,
                  segmentId,
                  firstFrameUrl: needsPreviousFrame
                    ? previousClipResult?.lastFrameUrl
                    : undefined,
                },
                services,
              });
            },
          );

          await step.run(`update-segment-final-url-${segmentId}-${runToken}`, async () => {
            return await pipelineSteps.updateVeoSegmentInDb({
              segmentDbId,
              segData,
              finalR2Url: result.improvedUrl || result.finalTrimmedUrl,
              actualDuration: result.actualDuration,
              tsUrl: result.tsUrl,
              mode,
              firstFrameSource,
            });
          });

          previousClipResult = result;
        }

        await step.run("publish-generation-complete-toast", async () => {});
      }

      // ========================================================================
      // STAGE 3: CUTAWAY B-ROLL VIDEO GENERATION
      // ========================================================================
      if (STAGE_3_CUTAWAY_B_ROLL) {
        const { dbSegments, projectId } = await step.run("fetch-stage-3-state", async () =>
          fetchWorkflowState(schemeId),
        );

        const cutawayTasks = dbSegments.flatMap((segment) => {
          const segData = segment.segment_data as any;
          const bRolls = (segData.bRolls || []) as any[];
          const cutaways = bRolls.filter((b) => b.displayMode === "cutaway");

          return cutaways.map(async (bRoll, bIndex) => {
            return await step.run(
              `generate-cutaway-${segment.id}-${bIndex}-${runToken}`,
              async () => {
                return await pipelineSteps.generateUgcBrollVideo({
                  segment,
                  bRoll,
                  projectId,
                  schemaId: schemeId,
                  services,
                  runToken,
                });
              },
            );
          });
        });

        if (cutawayTasks.length > 0) {
          await step.run("publish-cutaway-start-toast", async () => {});
          await Promise.all(cutawayTasks);
        }
      }

      // ========================================================================
      // STAGE 4: OVERLAY B-ROLL IMAGE GENERATION
      // ========================================================================
      if (STAGE_4_OVERLAY_IMAGE) {
        const { dbSegments, projectId } = await step.run("fetch-stage-4-state", async () =>
          fetchWorkflowState(schemeId),
        );

        const overlayTasks = dbSegments.flatMap((segment) => {
          const segData = segment.segment_data as any;
          const bRolls = (segData.bRolls || []) as any[];
          const overlays = bRolls.filter((b) => b.displayMode === "overlay");

          return overlays.map(async (bRoll, bIndex) => {
            return await step.run(
              `generate-overlay-${segment.id}-${bIndex}-${runToken}`,
              async () => {
                return await pipelineSteps.generateUgcBrollImage({
                  segment,
                  bRoll,
                  projectId,
                  schemaId: schemeId,
                  services,
                  model: "gemini-3.1-flash-image-preview",
                });
              },
            );
          });
        });

        if (overlayTasks.length > 0) {
          await step.run("publish-overlay-start-toast", async () => {});
          await Promise.all(overlayTasks);
        }
      }

      // ========================================================================
      // STAGE 5: VOICE ALIGNMENT (STS)
      // ========================================================================
      if (STAGE_5_VOICE_ALIGNMENT) {
        const { dbSegments, projectId } = await step.run("fetch-stage-5-state", async () =>
          fetchWorkflowState(schemeId),
        );

        await step.run("publish-voice-start-toast", async () => {});
        await step.run("update-generation-voice-progress", async () => {
          return await advanceGenerationTask(schemeId, UGC_TASK_KEYS.VOICES, UGC_TASKS);
        });

        const userVoice = scheme.voice;
        let stsSuccess = false;

        const alignSegmentsWithVoice = async (clonedVoiceId: string, voiceTag: string) => {
          await step.run(`mark-generation-progress-voice-align-${voiceTag}`, async () => {
            return await advanceGenerationTask(schemeId, UGC_TASK_KEYS.VOICEALIGN, UGC_TASKS);
          });

          await Promise.all(
            dbSegments.map(async (segment) => {
              const sd = segment.segment_data as any;
              const videoAsset = (sd.assets || sd.shots || []).find(
                (a: any) => a.type === "video" && a.videoUrl && a.active !== false,
              );
              const currentUrl = videoAsset?.videoUrl || sd.shots?.[0]?.videoUrl;

              if (!currentUrl) return;

              const stsResult = await step.run(
                `process-sts-${segment.id}-${voiceTag}-${runToken}`,
                async () => {
                  return await pipelineSteps.processStsSegment(
                    segment,
                    clonedVoiceId,
                    projectId,
                    services,
                  );
                },
              );

              return await step.run(
                `update-segment-sts-${segment.id}-${voiceTag}-${runToken}`,
                async () => {
                  return await pipelineSteps.updateVeoSegmentInDb({
                    segmentDbId: segment.id,
                    segData: segment.segment_data,
                    finalR2Url: stsResult.comparison.updated,
                    actualDuration: (segment.segment_data as any).estimatedDuration || 5,
                  });
                },
              );
            }),
          );
        };

        // User-selected voice from script-to-video (catalog id or uploaded sample)
        if (userVoice?.url || userVoice?.id) {
          const voiceTag = "user";
          try {
            const clonedVoiceId = userVoice.url
              ? await step.run(`clone-voice-${voiceTag}-${runToken}`, async () => {
                  return await pipelineSteps.cloneVoice(userVoice.url!, services);
                })
              : userVoice.id!;

            await alignSegmentsWithVoice(clonedVoiceId, voiceTag);
            stsSuccess = true;
          } catch (err: any) {
            console.error("[Voice Alignment] User-selected voice failed:", err);
            if (!err.message?.includes("VOICE_ACCESS_DENIED")) {
              throw err;
            }
          }
        }

        // Fallback: clone from best generated segment audio when no user voice or user voice failed
        if (!stsSuccess) {
          const candidates = await step.run("select-voice-candidates", async () => {
            return pipelineSteps.selectVoiceCandidates(dbSegments, services);
          });

          const maxRetries = Math.min(candidates.length, 3);

          for (let attempt = 0; attempt < maxRetries; attempt++) {
            const candidate = candidates[attempt];
            const voiceTag = `v${attempt}`;

            try {
              const clonedVoiceId = await step.run(
                `clone-voice-${voiceTag}-${runToken}`,
                async () => {
                  return await pipelineSteps.cloneVoice(candidate.videoUrl, services);
                },
              );

              await alignSegmentsWithVoice(clonedVoiceId, voiceTag);
              stsSuccess = true;
              break;
            } catch (err: any) {
              console.error(`[Voice Alignment] Attempt ${attempt} failed:`, err);

              if (err.message?.includes("VOICE_ACCESS_DENIED")) {
                console.warn(
                  `[Voice Alignment] Candidate ${attempt} denied. Moving to next candidate...`,
                );
                continue;
              }

              throw err;
            }
          }
        }

        if (!stsSuccess) {
          console.error(
            "[Voice Alignment] All candidates failed or were denied. Workflow will continue without STS.",
          );
        }
      }

      // ========================================================================
      // STAGE 6: AUDIO ENHANCEMENT (PHONOS)
      // ========================================================================
      if (STAGE_6_AUDIO_ENHANCEMENT) {
        const { dbSegments, projectId } = await step.run("fetch-stage-6-state", async () =>
          fetchWorkflowState(schemeId),
        );

        const enhanceTasks = dbSegments.map(async (segment) => {
          const sd = segment.segment_data as any;
          const videoAsset = (sd.assets || sd.shots || []).find(
            (a: any) => a.type === "video" && a.videoUrl && a.active !== false,
          );
          let currentUrl = videoAsset?.videoUrl || sd.shots?.[0]?.videoUrl;

          if (!currentUrl) return;

          const enhancedResult = await step.run(
            `enhance-after-sts-${segment.id}-${runToken}`,
            async () => {
              const release = await phonosSemaphore.acquire();
              try {
                return await enhanceUgcSegment(
                  currentUrl,
                  {
                    schemaId: schemeId,
                    projectId,
                    segmentId: segment.id,
                    runToken,
                    phase: "post-sts",
                  },
                  services,
                );
              } finally {
                await release();
              }
            },
          );

          return await step.run(`update-segment-refinement-${segment.id}-${runToken}`, async () => {
            return await pipelineSteps.updateVeoSegmentInDb({
              segmentDbId: segment.id,
              segData: segment.segment_data,
              finalR2Url: enhancedResult?.improvedUrl || currentUrl,
              actualDuration: (segment.segment_data as any).estimatedDuration || 5,
            });
          });
        });

        await Promise.all(enhanceTasks);
      }

      // Final Step: Complete
      await step.run("publish-done-toast", async () => {});

      // Update generation status to COMPLETED
      await step.run("mark-generation-completed", async () => {
        return await withDbRetry(() =>
          db
            .updateTable("generations")
            .set({ status: ResolverStatus.COMPLETED })
            .where("id", "=", schemeId)
            .execute(),
        );
      });

      return { success: true };
    } catch (err: any) {
      console.error("UGC Master V3 Error:", err);
      const message = err instanceof Error ? err.message : "Unknown error";
      await step.run("publish-error-toast", async () => {});

      if (schemeId) {
        // If we haven't even persisted the metadata, the user can't fix things manually.
        // In that case, we mark as FAILED. Otherwise, we mark as COMPLETED so the UI is usable.
        const finalStatus = metadataPersisted ? ResolverStatus.COMPLETED : ResolverStatus.FAILED;

        await db
          .updateTable("generations")
          .set({ status: finalStatus })
          .where("id", "=", schemeId)
          .execute();

        if (!metadataPersisted) {
          throw new NonRetriableError(`UGC Master V3 workflow failed early: ${message}`, {
            cause: err,
          });
        }
      }

      return { success: false, error: message };
    }
  },
);
