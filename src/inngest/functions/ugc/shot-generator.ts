import { getInngestApp } from "../../index";
import { db } from "@/lib/database";
import { initializeUgcServices } from "./services";
import { generateUgcVideo } from "./steps/veo";
import { generateSegmentFrame } from "@/lib/ugc/frame-generator";
import { generationQueries } from "@/lib/database/generation-queries";
import { segmentQueries } from "@/lib/database/segment-queries";
import { ensureObject } from "../common/services/utils";
import { DistributedSemaphore } from "../../services/semaphore";
import { nanoid } from "nanoid";
import { Segment, VideoSchema } from "@/types/segment";
import { projectQueries } from "@/lib/database/project-queries";

const inngest = getInngestApp();
const phonosSemaphore = new DistributedSemaphore("phonos:audio_enhancement_slots", 5, 300000);

/**
 * UGC SHOT IMAGE GENERATION
 */
export const generateUGCImage = inngest.createFunction(
  {
    id: "generate-ugc-image",
    triggers: { event: "ugc/shot.generate.image" },
  },
  async ({ event, step }) => {
    const { generationId, schemeId, segments, avatarUrl, productUrls, aspectRatio } = event.data;
    const segment = segments[0]; // UGC frames API usually takes one segment at a time from UI

    try {
      await generationQueries.update(generationId, { progress: 10, status: "PROGRESS" });

      await generationQueries.update(generationId, { progress: 30 });

      const url = await step.run("generate-frame", async () => {
        return await generateSegmentFrame({
          segmentDescription: segment.description,
          segmentText: segment.text,
          firstFrame: segment.firstFrame,
          shotType: segment.type as any,
          avatarUrl,
          productUrls: segment.shotType === "generic" ? undefined : productUrls,
          aspectRatio: aspectRatio || "9:16",
        });
      });

      await generationQueries.update(generationId, { progress: 70 });

      // Update segment in DB
      await step.run(`update-db-${generationId}`, async () => {
        const freshSeg = await db
          .selectFrom("segments")
          .select("segment_data")
          .where("id", "=", segment.id)
          .executeTakeFirst();

        const currentSegData = freshSeg ? ensureObject(freshSeg.segment_data) : segment;

        const newAsset = {
          id: `asset-${nanoid()}`,
          type: "image" as const,
          url,
          status: "completed" as const,
          active: true,
          prompt: segment.description,
        };

        currentSegData.assets = [...(currentSegData.assets || []), newAsset];
        if (currentSegData.shots?.[0]) {
          currentSegData.shots[0].imageUrl = url;
          currentSegData.shots[0].status = "completed";
        }

        await db
          .updateTable("segments")
          .set({ segment_data: currentSegData, updated_at: new Date() })
          .where("id", "=", segment.id)
          .execute();
      });

      await generationQueries.update(generationId, {
        status: "COMPLETED",
        progress: 100,
        output: { url },
      });

      return { success: true, url };
    } catch (error: any) {
      await generationQueries.update(generationId, {
        status: "FAILED",
        output: { error: error.message },
      });
      throw error;
    }
  },
);

/**
 * UGC SHOT VIDEO GENERATION
 */
export const generateUGCVideo = inngest.createFunction(
  {
    id: "generate-ugc-video",
    triggers: { event: "ugc/shot.generate.video" },
  },
  async ({ event, step }) => {
    const {
      generationId,
      schemeId,
      segmentId,
      shotId,
      firstFrameUrl,
      lastFrameUrl,
      aspectRatio,
      videoPrompt,
      userId,
      assetId,
      avatarUrl,
      productUrls,
      mode,
      firstFrameSource,
    } = event.data;

    try {
      // debug params
      await step.run(`debug-params-${generationId}`, async () => {
        return event.data;
      });
      const services = initializeUgcServices();
      await generationQueries.update(generationId, { progress: 10 });

      // Fetch segment data
      const dbSegment = await step.run(`fetch-segment-${generationId}`, async () => {
        const res = await db
          .selectFrom("segments")
          .selectAll()
          .where("id", "=", segmentId)
          .executeTakeFirst();
        if (!res) throw new Error("Segment not found");
        return {
          ...res,
          segment_data: ensureObject(res.segment_data) as Segment,
        };
      });

      const schema = await step.run(`fetch-schema-${generationId}`, async () => {
        let res = await segmentQueries.findSchemaById(schemeId);

        if (!res) {
          const project = await projectQueries.findByGenerationId(schemeId);
          if (project) {
            res = await segmentQueries.findSchemaByProjectId(project.id);
          }
        }

        if (!res) throw new Error("Schema not found");

        // Map DB snake_case to Interface camelCase
        return {
          ...res,
          aspectRatio: (res as any).aspect_ratio,
          promptPreview: (res as any).prompt_preview,
          segments: [], // Will be filled if needed, but generateUgcVideo handles individual segments
        } as unknown as VideoSchema;
      });

      await generationQueries.update(generationId, { progress: 30 });

      const dialogueRegex = /AUDIO DIALOGUE \(SPOKEN ONLY\):\s*([\s\S]*?)(?:\r?\n\s*VISUALS:|$)/i;
      const match = (videoPrompt || "").match(dialogueRegex);
      const extractedText = match ? match[1].trim() : "";

      const result = await step.run(`generate-video-${generationId}`, async () => {
        return await generateUgcVideo({
          request: {
            text: extractedText || dbSegment.segment_data.text || "",
            estimatedDuration: dbSegment.segment_data.estimatedDuration ?? 5,
            shot: {
              ...(dbSegment.segment_data.shots?.[0] || {}),
              videoPrompt: videoPrompt,
            } as any,
            mode: mode,
            firstFrameSource: firstFrameSource,
            avatarUrl,
            product: {
              urls: productUrls || [],
              name: (schema as any)?.product?.name,
              description: (schema as any)?.product?.description,
            },
            aspectRatio: aspectRatio || "9:16",
            schemaId: schemeId,
            segmentId,
            firstFrameUrl: firstFrameUrl || undefined,
          },
          services,
        });
      });

      await generationQueries.update(generationId, { progress: 70 });

      await step.run(`update-db-${generationId}`, async () => {
        const finalUrl = result.finalTrimmedUrl || result.rawR2Url;
        const actualDuration = result.actualDuration || 0;
        const durationMs = actualDuration * 1000;

        const existingAssets = (dbSegment.segment_data.assets ?? []).map((a: any) => ({
          ...a,
          active: a.type === "video" ? false : a.active,
        }));

        const updatedAssets = [
          ...existingAssets,
          {
            id: assetId || `asset-${nanoid()}`,
            type: "video" as const,
            url: finalUrl,
            status: "completed" as const,
            active: true,
            prompt: videoPrompt || dbSegment.segment_data.text || "",
          },
        ];

        const updatePayload: any = {
          ...dbSegment.segment_data,
          assets: updatedAssets,
          estimatedDuration: actualDuration,
        };

        if (updatePayload.shots?.[0]) {
          const originalShot = updatePayload.shots[0];
          updatePayload.shots[0] = {
            ...originalShot,
            videoUrl: finalUrl,
            status: "completed",
            duration: durationMs,
            display: { from: 0, to: durationMs },
            videoPrompt: videoPrompt || originalShot.videoPrompt,
            text: result.originalText || extractedText || originalShot.text || "",
          };
          // Also update the top-level segment text if we extracted it
          if (result.originalText || extractedText) {
            updatePayload.text = result.originalText || extractedText;
          }
        }

        await db
          .updateTable("segments")
          .set({ segment_data: updatePayload, updated_at: new Date() })
          .where("id", "=", segmentId)
          .execute();
      });

      const finalVideoUrl = result.finalTrimmedUrl || result.rawR2Url;
      await generationQueries.update(generationId, {
        status: "COMPLETED",
        progress: 100,
        output: { url: finalVideoUrl },
      });

      return { success: true, url: result.finalTrimmedUrl || result.rawR2Url };
    } catch (error: any) {
      await generationQueries.update(generationId, {
        status: "FAILED",
        output: { error: error.message },
      });
      throw error;
    }
  },
);
