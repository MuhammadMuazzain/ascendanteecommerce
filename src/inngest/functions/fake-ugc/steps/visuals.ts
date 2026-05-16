import fs from "fs";
import { type StepContext } from "../../common/steps/types";
import { type PriceItem, type SegmentAsset } from "@/inngest/utils/types";
import { getShotDurations, getBRollDisplayTime } from "../../common/steps/timings";
import { generateImage, generateVideoClip } from "../../common/steps/visuals";
import { segmentQueries } from "@/lib/database/segment-queries";
import { fileUrlToBuffer } from "../../common/utils/common";
import { persistAsset } from "../../common/steps/utils";
import { ensureObject } from "../../common/services/utils";
import { generateId } from "@/utils/id";
import { convertMsToSeconds, convertSecondsToMs } from "@/inngest/utils/common";
import { VOICEOVER_PAUSE, VOICEOVER_INIT_PAUSE } from "@/inngest/utils/constant";

/**
 * Resilient async retry wrapper with exponential backoff for spotty APIs (like Gemini Image Gen)
 */
async function withRetry<T>(fn: (attempt: number) => Promise<T>, maxRetries = 3): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn(i);
    } catch (err: any) {
      lastErr = err;
      console.warn(`[RETRY] Task failed (attempt ${i + 1}/${maxRetries}):`, err.message);
      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000 * (i + 1))); // Exponential backoff
      }
    }
  }
  throw lastErr;
}

/**
 * Modular Step 1: Generate Shot First Frames
 */
export async function generateShotFirstFrames(
  step: any,
  context: StepContext,
  userId: string | null,
  projectId: string | null,
): Promise<{
  prices: PriceItem[];
  segmentAssets: Record<string, SegmentAsset[]>;
  previewUrl?: string;
}> {
  const { scheme, services, schemeId } = context;
  const segments = scheme.segments;
  const prices: PriceItem[] = [];
  const segmentAssets: Record<string, SegmentAsset[]> = {};
  let previewUrl: string | undefined;

  const updates: any[] = [];

  for (const seg of segments) {
    if (!seg.shots?.length) continue;

    let segmentUpdated = false;
    const currentAssets: SegmentAsset[] = [];

    const shotResults = await Promise.all(
      seg.shots.map(async (shot, index) => {
        if (shot.imageUrl) return null;

        const isProductShot = shot.type === "product";

        return step.run(`Generate image for segment ${seg.id} shot ${index}`, async () => {
          try {
            return await withRetry(async (attempt) => {
              console.log("GENERATING IMAGE FOR SHOT", seg.id, index);
              const fallbackModel = attempt > 0 ? "gemini-2.5-flash-image" : undefined;
              const { imageUrl: img, price: imgPrice } = await generateImage(
                context,
                seg,
                isProductShot,
                shot.firstFramePrompt || "",
                shot.type,
                fallbackModel,
              );

              const { buffer, extension } = await fileUrlToBuffer(img);
              const filePath = `VIDEOS/${schemeId}/${seg.id}/IMAGE/${generateId()}.${extension}`;
              const currentFrame = await services.storage.uploadData(filePath, buffer);

              const asset: SegmentAsset = {
                id: generateId(),
                type: "image",
                status: "completed",
                url: currentFrame,
                prompt: `${shot.type}-${shot.firstFramePrompt}`,
              };

              await persistAsset(userId, projectId, schemeId, filePath, currentFrame, {
                sourceType: "ai_generated",
                assetType: "image",
                originalFilename: `shot_frame_${seg.id}_${generateId()}.${extension}`,
              });

              return { currentFrame, imgPrice, asset, index, success: true };
            });
          } catch (err: any) {
            console.error(`Failed to generate image for shot`, err);
            return { index, success: false, error: err.message };
          }
        });
      }),
    );

    shotResults.forEach((result: any) => {
      if (result) {
        if (result.success) {
          seg.shots![result.index].imageUrl = result.currentFrame;
          seg.shots![result.index].status = "completed";
          prices.push(result.imgPrice);
          segmentUpdated = true;
          currentAssets.push(result.asset);
          if (!previewUrl) previewUrl = result.currentFrame;
        } else {
          seg.shots![result.index].status = "failed";
          seg.shots![result.index].error = result.error;
          segmentUpdated = true;
        }
      }
    });

    if (segmentUpdated) {
      segmentAssets[seg.id] = currentAssets;
      seg.assets = [...(seg.assets || []), ...currentAssets];
      updates.push({
        id: seg.id,
        segment_data: JSON.parse(JSON.stringify(ensureObject(seg))),
      });
    }
  }

  const validUpdates = updates.filter((u): u is NonNullable<typeof u> => u !== null);
  if (validUpdates.length > 0) {
    await segmentQueries.bulkUpdateSegments(validUpdates);
  }

  return { prices, segmentAssets, previewUrl };
}

/**
 * Modular Step 2: Generate Shot Timings
 */
export async function generateShotTimings(
  context: StepContext,
  userId: string | null,
  projectId: string | null,
): Promise<{ prices: PriceItem[] }> {
  const { scheme } = context;
  const segments = scheme.segments;
  const prices: PriceItem[] = [];

  const updates = await Promise.all(
    segments.map(async (seg, i) => {
      // Get audio data directly from segment
      const audioData = seg.textToSpeech as any;
      const captionUrl = (seg.speechToText as any)?.src;
      const originalDurationMs = audioData?.duration;

      if (!originalDurationMs || !captionUrl) {
        console.warn(`[TIMINGS] Skipping segment ${seg.id} - missing audio/caption metadata`);
        return null;
      }

      const isFirstSegment = i === 0;
      const startPause = isFirstSegment ? VOICEOVER_INIT_PAUSE : VOICEOVER_PAUSE / 2;
      const endPause = VOICEOVER_PAUSE / 2;

      const startPauseMs = convertSecondsToMs(startPause);
      const endPauseMs = convertSecondsToMs(endPause);
      const netDurationSec = convertMsToSeconds(originalDurationMs);

      // 1. Calculate Shot Timings
      if (seg.shots?.length) {
        const shotDurationsSec = await getShotDurations(captionUrl, seg.shots, netDurationSec, 0);
        let segmentPosMs = 0;

        for (let j = 0; j < seg.shots.length; j++) {
          const shot = seg.shots[j];
          let shotDurationMs = convertSecondsToMs(shotDurationsSec[j]);

          if (j === 0) shotDurationMs += startPauseMs;
          if (j === seg.shots.length - 1) shotDurationMs += endPauseMs;

          shotDurationMs = Math.round(shotDurationMs);

          const from = segmentPosMs;
          const to = from + shotDurationMs;

          shot.display = { from, to };
          shot.duration = shotDurationMs;

          segmentPosMs += shotDurationMs;
        }
      }

      // 2. Calculate B-Roll Timings
      if (seg.bRolls?.length) {
        await Promise.all(
          seg.bRolls.map(async (broll) => {
            if (broll.words) {
              const dataTime = await getBRollDisplayTime(broll.words, captionUrl, startPauseMs);
              if (dataTime) {
                broll.display = {
                  from: dataTime.display.from,
                  to: dataTime.display.to,
                };
                broll.duration = dataTime.display.to - dataTime.display.from;
              }
            }
          }),
        );
      }

      // 3. Set Relative Audio/Caption Display for converter
      if (seg.textToSpeech) {
        (seg.textToSpeech as any).display = {
          from: startPauseMs,
          to: startPauseMs + originalDurationMs,
        };
      }
      if (seg.speechToText) {
        (seg.speechToText as any).display = {
          from: startPauseMs,
          to: startPauseMs + originalDurationMs,
        };
      }

      // Total segment duration in the timeline
      const totalSegmentDurationMs = originalDurationMs + startPauseMs + endPauseMs;
      seg.duration = totalSegmentDurationMs;

      return {
        id: seg.id,
        segment_data: JSON.parse(JSON.stringify(ensureObject(seg))),
      };
    }),
  );

  const validUpdates = updates.filter((u): u is NonNullable<typeof u> => u !== null);
  if (validUpdates.length > 0) {
    await segmentQueries.bulkUpdateSegments(validUpdates);
  }

  return { prices };
}

/**
 * Modular Step 3: Generate Shot Videos
 */
export async function generateShotVideos(
  step: any,
  context: StepContext,
  userId: string | null,
  projectId: string | null,
): Promise<{ prices: PriceItem[]; segmentAssets: Record<string, SegmentAsset[]> }> {
  const { scheme, schemeId } = context;
  const segments = scheme.segments;
  const prices: PriceItem[] = [];
  const segmentAssets: Record<string, SegmentAsset[]> = {};
  const tmpDir = "/tmp";

  const updates: any[] = [];

  for (const seg of segments) {
    if (!seg.shots?.length) continue;

    let segmentUpdated = false;
    const currentAssets: SegmentAsset[] = [];

    const shotResults = await Promise.all(
      seg.shots.map(async (shot, i) => {
        if (!shot.videoUrl && shot.display) {
          return step.run(`Generate video for segment ${seg.id} shot ${i}`, async () => {
            try {
              return await withRetry(async (attempt) => {
                const isProductShot = shot.type === "product";
                const videoPrompt = shot.videoPrompt || shot.words || "";
                const clipDurationSec = convertMsToSeconds(shot.duration || 5000);
                const fallbackModel = attempt > 0 ? "veo-3.1-fast-generate-preview" : undefined;
                let durationSec = clipDurationSec;
                if (!Number.isFinite(durationSec) || durationSec <= 0) durationSec = 5;
                durationSec = Math.min(Math.max(durationSec, 3), 8);

                const { videoPath, price } = await generateVideoClip(context, {
                  seg,
                  imageUrl: shot.imageUrl,
                  duration: durationSec,
                  tmpDir,
                  promptOverride: videoPrompt,
                  isProduct: isProductShot,
                  fallbackModel,
                });

                const buffer = await fs.promises.readFile(videoPath);
                const r2Path = `VIDEOS/${schemeId}/${seg.id}/VIDEOS/${generateId()}.mp4`;
                const uploadedUrl = await context.services.storage.uploadData(r2Path, buffer);

                const asset: SegmentAsset = {
                  id: generateId(),
                  type: "video",
                  status: "completed",
                  url: uploadedUrl,
                  prompt: videoPrompt,
                };

                await persistAsset(userId, projectId, schemeId, r2Path, uploadedUrl, {
                  sourceType: "ai_generated",
                  assetType: "video",
                  originalFilename: `shot_video_${seg.id}_${generateId()}.mp4`,
                  duration: shot.duration,
                });

                return { i, uploadedUrl, price, asset, success: true };
              });
            } catch (err: any) {
              console.error(`Failed to generate video for shot in segment ${seg.id}`, err);
              return { i, success: false, error: err.message };
            }
          });
        }
        return null;
      }),
    );

    shotResults.forEach((result: any) => {
      if (result) {
        if (result.success) {
          seg.shots![result.i].videoUrl = result.uploadedUrl;
          seg.shots![result.i].status = "completed";
          prices.push(result.price);
          segmentUpdated = true;
          currentAssets.push(result.asset);
        } else {
          seg.shots![result.i].status = "failed";
          seg.shots![result.i].error = result.error;
          segmentUpdated = true;
        }
      }
    });

    if (segmentUpdated) {
      segmentAssets[seg.id] = currentAssets;
      updates.push({
        id: seg.id,
        segment_data: JSON.parse(JSON.stringify(ensureObject(seg))),
      });
    }
  }

  const validUpdates = updates.filter((u): u is NonNullable<typeof u> => u !== null);
  if (validUpdates.length > 0) {
    await segmentQueries.bulkUpdateSegments(validUpdates);
  }

  return { prices, segmentAssets };
}

/**
 * Modular Step 4: Generate B-Rolls
 */
export async function generateShotBRolls(
  step: any,
  context: StepContext,
  userId: string | null,
  projectId: string | null,
): Promise<{ prices: PriceItem[]; segmentAssets: Record<string, SegmentAsset[]> }> {
  const { scheme, services, schemeId } = context;
  const segments = scheme.segments;
  const prices: PriceItem[] = [];
  const segmentAssets: Record<string, SegmentAsset[]> = {};
  const updates: any[] = [];

  for (const seg of segments) {
    if (!seg.bRolls?.length) continue;

    let segmentUpdated = false;
    const currentAssets: SegmentAsset[] = [];

    const brollResults = await Promise.all(
      seg.bRolls.map(async (broll, i) => {
        if (broll.imageUrl || broll.videoUrl) return null;
        const isVideo = broll.type === "video";
        if (isVideo) return null;

        return step.run(`Generate B-Roll image for segment ${seg.id} broll ${i}`, async () => {
          try {
            return await withRetry(async (attempt) => {
              const fallbackModel = attempt > 0 ? "gemini-2.5-flash-image" : undefined;
              const { imageUrl: img, price: imgPrice } = await generateImage(
                context,
                seg,
                false,
                broll.firstFramePrompt || broll.words || "",
                "b-roll",
                fallbackModel,
              );

              const { buffer, extension } = await fileUrlToBuffer(img);
              const filePath = `VIDEOS/${schemeId}/${seg.id}/BROLL/${generateId()}.${extension}`;
              const uploadedUrl = await services.storage.uploadData(filePath, buffer);

              const asset: SegmentAsset = {
                id: generateId(),
                type: "image",
                status: "completed",
                url: uploadedUrl,
                prompt: broll.firstFramePrompt || broll.words || "b-roll",
              };

              await persistAsset(userId, projectId, schemeId, filePath, uploadedUrl, {
                sourceType: "ai_generated",
                assetType: "image",
                originalFilename: `broll_image_${seg.id}_${generateId()}.${extension}`,
              });

              return { i, uploadedUrl, imgPrice, asset, success: true };
            });
          } catch (err: any) {
            console.error(`Failed to generate B-roll image in segment ${seg.id}`, err);
            return { i, success: false, error: err.message };
          }
        });
      }),
    );

    brollResults.forEach((result: any) => {
      if (result) {
        if (result.success) {
          seg.bRolls![result.i].imageUrl = result.uploadedUrl;
          seg.bRolls![result.i].status = "completed";
          prices.push(result.imgPrice);
          segmentUpdated = true;
          currentAssets.push(result.asset);
        } else {
          seg.bRolls![result.i].status = "failed";
          seg.bRolls![result.i].error = result.error;
          segmentUpdated = true;
        }
      }
    });

    if (segmentUpdated) {
      segmentAssets[seg.id] = currentAssets;
      updates.push({
        id: seg.id,
        segment_data: JSON.parse(JSON.stringify(ensureObject(seg))),
      });
    }
  }

  const validUpdates = updates.filter((u): u is NonNullable<typeof u> => u !== null);
  if (validUpdates.length > 0) {
    await segmentQueries.bulkUpdateSegments(validUpdates);
  }

  return { prices, segmentAssets };
}
