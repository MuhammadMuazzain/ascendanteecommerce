import fs from "fs";
import { getInngestApp } from "../../index";
import { initializeServices } from "./services";
import { generateImage, generateVideoClip } from "./steps/visuals";
import { ensureObject } from "./services/utils";
import { segmentQueries } from "@/lib/database/segment-queries";
import { projectQueries } from "@/lib/database/project-queries";
import { generationQueries } from "@/lib/database/generation-queries";
import { fileUrlToBuffer } from "./utils/common";
import { generateId } from "@/utils/id";
import { persistAsset } from "./steps/utils";
import { Segment, VideoSchema } from "@/types/segment";
import { convertMsToSeconds } from "@/inngest/utils/common";

const inngest = getInngestApp();

/**
 * Common logic for fetching schema state for standard shots
 */
async function fetchState(
  step: any,
  schemeId: string,
): Promise<{
  schema: VideoSchema;
  segments: { id: string; segment_data: Segment }[];
  fetchedProjectId: string | null;
}> {
  return await step.run("fetch-state", async () => {
    let schema = await segmentQueries.findSchemaById(schemeId);
    let rawSegments: any[] = [];
    let fetchedProjectId: string | null = null;

    if (schema) {
      rawSegments = await segmentQueries.findSegmentsBySchemaId(schemeId);
    } else {
      const project = await projectQueries.findByGenerationId(schemeId);
      if (project) {
        fetchedProjectId = project.id;
        schema = await segmentQueries.findSchemaByProjectId(project.id);
        if (schema) {
          rawSegments = await segmentQueries.findSegmentsBySchemaId(schema.id);
        }
      }
    }

    if (!schema || !rawSegments.length) {
      throw new Error("Schema or segments not found");
    }

    const segments = rawSegments.map((s) => ({
      id: s.id,
      segment_data: ensureObject(s.segment_data) as Segment,
    }));

    const typedSchema = schema
      ? ({
          ...schema,
          aspectRatio: (schema as any).aspect_ratio,
          promptPreview: (schema as any).prompt_preview,
          segments: [],
        } as unknown as VideoSchema)
      : null;

    return {
      schema: typedSchema!,
      segments,
      fetchedProjectId,
    };
  });
}

/**
 * STANDARD SHOT IMAGE GENERATION
 */
export const generateStandardImage = inngest.createFunction(
  {
    id: "generate-standard-image",
    triggers: { event: "standard/shot.generate.image" },
  },
  async ({ event, step, attempt }) => {
    const {
      generationId,
      schemeId,
      segmentId,
      shotId,
      shotIndex,
      prompt,
      shotType,
      userId,
      projectId,
      model,
    } = event.data;

    try {
      const { schema, segments, fetchedProjectId } = await fetchState(step, schemeId);
      const services = initializeServices();
      const context = { services, scheme: schema, schemeId, attempt };
      await generationQueries.update(generationId, { progress: 10, status: "PROGRESS" });

      const targetSegment = segments.find((s) => s.id === segmentId)?.segment_data;
      if (!targetSegment) throw new Error("Segment not found");

      const targetShot =
        targetSegment.shots?.[shotIndex] ||
        (targetSegment.shots as any[])?.find((s) => s.id === shotId);
      if (!targetShot) throw new Error("Shot not found");

      const isProductShot = targetShot.type === "product" || shotType === "product";

      await generationQueries.update(generationId, { progress: 30 });

      const result = await step.run("generate-image", async () => {
        const preferredModel = model || targetShot.model || "gemini-2.5-flash-image";

        const { imageUrl, price } = await generateImage(
          context,
          targetSegment,
          isProductShot,
          prompt,
          shotType,
          preferredModel,
        );

        return { imageUrl, price };
      });

      await generationQueries.update(generationId, { progress: 70 });

      const uploadResult = await step.run("upload-and-persist", async () => {
        const { buffer, extension } = await fileUrlToBuffer(result.imageUrl);
        const r2Path = `VIDEOS/${schemeId}/${segmentId}/IMAGE/${generateId()}.${extension}`;
        const currentMedia = await services.storage.uploadData(r2Path, buffer);

        await persistAsset(userId, projectId || fetchedProjectId, schemeId, r2Path, currentMedia, {
          sourceType: "ai_generated",
          assetType: "image",
          originalFilename: `shot_frame_${segmentId}_${generateId()}.${extension}`,
        });

        return { currentMedia };
      });

      await step.run("update-database", async () => {
        targetShot.imageUrl = uploadResult.currentMedia;
        targetShot.status = "completed";
        targetShot.firstFramePrompt = prompt;
        targetShot.generationId = generationId;
        // New still invalidates any motion layer — prevent stale video + mismatched frame.
        delete (targetShot as any).videoUrl;

        // Single-shot segments reuse segment.assets fallbacks in the UI — deactivate stale clips after a new still.
        if ((targetSegment.shots?.length ?? 0) <= 1) {
          targetSegment.assets = (targetSegment.assets || []).map((a: any) =>
            a.type === "video" ? { ...a, active: false } : a,
          );
        }

        // Persist the shot type from the UI selection so it survives page refreshes
        if (shotType) targetShot.type = shotType;

        const newAsset = {
          id: generateId(),
          type: "image" as const,
          status: "completed" as const,
          url: uploadResult.currentMedia,
          prompt: `${shotType}-${prompt}`,
          generationId: generationId,
        };
        targetSegment.assets = [...(targetSegment.assets || []), newAsset];

        const dbId = segments.find((s) => s.id === segmentId)!.id;
        const cleanSeg = { ...targetSegment };
        delete (cleanSeg as any).dbId;

        await segmentQueries.bulkUpdateSegments([
          { id: dbId, segment_data: JSON.parse(JSON.stringify(cleanSeg)) },
        ]);
      });

      await generationQueries.update(generationId, {
        status: "COMPLETED",
        progress: 100,
        output: { url: uploadResult.currentMedia },
      });

      return { success: true, url: uploadResult.currentMedia, generationId };
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
 * STANDARD SHOT VIDEO GENERATION
 */
export const generateStandardVideo = inngest.createFunction(
  {
    id: "generate-standard-video",
    triggers: { event: "standard/shot.generate.video" },
  },
  async ({ event, step, attempt }) => {
    const {
      generationId,
      schemeId,
      segmentId,
      shotId,
      shotIndex,
      prompt,
      shotType,
      userId,
      projectId,
      model,
    } = event.data;

    try {
      const { schema, segments, fetchedProjectId } = await fetchState(step, schemeId);
      const services = initializeServices();
      const context = { services, scheme: schema, schemeId, attempt };
      await generationQueries.update(generationId, { progress: 10, status: "PROGRESS" });

      const targetSegment = segments.find((s) => s.id === segmentId)?.segment_data;
      if (!targetSegment) throw new Error("Segment not found");

      const targetShot =
        targetSegment.shots?.[shotIndex] ||
        (targetSegment.shots as any[])?.find((s) => s.id === shotId);
      if (!targetShot) throw new Error("Shot not found");

      const isProductShot = targetShot.type === "product" || shotType === "product";

      if (!targetShot.imageUrl) {
        throw new Error(
          "Shot has no first-frame image. Generate or refresh the still image before video.",
        );
      }

      await generationQueries.update(generationId, { progress: 30 });

      const result = await step.run("generate-video", async () => {
        const preferredModel = model || targetShot.model || "veo-3.1-fast-generate-preview";

        const durationMs =
          typeof targetShot.duration === "number" && targetShot.duration > 0
            ? targetShot.duration
            : 5000;
        let clipDurationSec = convertMsToSeconds(durationMs);
        if (!Number.isFinite(clipDurationSec) || clipDurationSec <= 0) clipDurationSec = 5;
        clipDurationSec = Math.min(Math.max(clipDurationSec, 3), 8);

        const { videoPath, price } = await generateVideoClip(context, {
          seg: targetSegment,
          imageUrl: targetShot.imageUrl,
          duration: clipDurationSec,
          tmpDir: "/tmp",
          promptOverride: prompt,
          isProduct: isProductShot,
          fallbackModel: preferredModel,
        });

        return { videoPath, price };
      });

      await generationQueries.update(generationId, { progress: 70 });

      const uploadResult = await step.run("upload-and-persist", async () => {
        const buffer = await fs.promises.readFile(result.videoPath);
        const r2Path = `VIDEOS/${schemeId}/${segmentId}/VIDEOS/${generateId()}.mp4`;
        const currentMedia = await services.storage.uploadData(r2Path, buffer);

        await persistAsset(userId, projectId || fetchedProjectId, schemeId, r2Path, currentMedia, {
          sourceType: "ai_generated",
          assetType: "video",
          originalFilename: `shot_video_${segmentId}_${generateId()}.mp4`,
        });

        return { currentMedia };
      });

      await step.run("update-database", async () => {
        targetShot.videoUrl = uploadResult.currentMedia;
        targetShot.status = "completed";
        targetShot.videoPrompt = prompt;
        targetShot.generationId = generationId;
        // Persist the shot type from the UI selection so it survives page refreshes
        if (shotType) targetShot.type = shotType;

        const newAsset = {
          id: generateId(),
          type: "video" as const,
          status: "completed" as const,
          url: uploadResult.currentMedia,
          prompt: `${shotType}-${prompt}`,
          generationId: generationId,
        };
        targetSegment.assets = [...(targetSegment.assets || []), newAsset];

        const dbId = segments.find((s) => s.id === segmentId)!.id;
        const cleanSeg = { ...targetSegment };
        delete (cleanSeg as any).dbId;

        await segmentQueries.bulkUpdateSegments([
          { id: dbId, segment_data: JSON.parse(JSON.stringify(cleanSeg)) },
        ]);
      });

      await generationQueries.update(generationId, {
        status: "COMPLETED",
        progress: 100,
        output: { url: uploadResult.currentMedia },
      });

      return { success: true, url: uploadResult.currentMedia, generationId };
    } catch (error: any) {
      await generationQueries.update(generationId, {
        status: "FAILED",
        output: { error: error.message },
      });
      throw error;
    }
  },
);
