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
 * Modular Step 1: Generate Shot First Frames
 */
export async function generateShotFirstFrames(
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

  for (const seg of segments) {
    if (!seg.shots?.length) continue;

    let segmentUpdated = false;
    const currentAssets: SegmentAsset[] = [];

    for (const shot of seg.shots) {
      if (shot.imageUrl) continue;

      const { imageUrl: img, price: imgPrice } = await generateImage(
        context,
        seg,
        false,
        shot.firstFramePrompt || "",
        shot.type,
      );

      const { buffer, extension } = await fileUrlToBuffer(img);
      const filePath = `VIDEOS/${schemeId}/${seg.id}/IMAGE/${generateId()}.${extension}`;
      const currentFrame = await services.storage.uploadData(filePath, buffer);

      shot.imageUrl = currentFrame;
      prices.push(imgPrice);
      segmentUpdated = true;

      const asset: SegmentAsset = {
        id: generateId(),
        type: "image",
        status: "completed",
        url: currentFrame,
        prompt: `${shot.type}-${shot.firstFramePrompt}`,
      };
      currentAssets.push(asset);

      if (!previewUrl) previewUrl = currentFrame;

      await persistAsset(userId, projectId, schemeId, filePath, currentFrame, {
        sourceType: "ai_generated",
        assetType: "image",
        originalFilename: `shot_frame_${seg.id}_${generateId()}.${extension}`,
      });
    }

    if (segmentUpdated) {
      segmentAssets[seg.id] = currentAssets;
      seg.assets = [...(seg.assets || []), ...currentAssets];
      await segmentQueries.bulkUpdateSegments([
        {
          id: seg.id,
          segment_data: JSON.parse(JSON.stringify(ensureObject(seg))),
        },
      ]);
    }
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

  let globalCurrentTimeMs = 0;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];

    // Get audio data directly from segment
    const audioData = seg.textToSpeech as any;
    const captionUrl = (seg.speechToText as any)?.src;
    const originalDurationMs = audioData?.duration;

    if (!originalDurationMs || !captionUrl) {
      console.warn(`[TIMINGS] Skipping segment ${seg.id} - missing audio/caption metadata`);
      continue;
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
      for (const broll of seg.bRolls) {
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
      }
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
    globalCurrentTimeMs += totalSegmentDurationMs;

    await segmentQueries.bulkUpdateSegments([
      {
        id: seg.id,
        segment_data: JSON.parse(JSON.stringify(ensureObject(seg))),
      },
    ]);
  }

  return { prices };
}

/**
 * Modular Step 3: Generate Shot Videos
 */
export async function generateShotVideos(
  context: StepContext,
  userId: string | null,
  projectId: string | null,
): Promise<{ prices: PriceItem[]; segmentAssets: Record<string, SegmentAsset[]> }> {
  const { scheme, schemeId } = context;
  const segments = scheme.segments;
  const prices: PriceItem[] = [];
  const segmentAssets: Record<string, SegmentAsset[]> = {};
  const tmpDir = "/tmp";

  for (const seg of segments) {
    if (!seg.shots?.length) continue;

    let segmentUpdated = false;
    const currentAssets: SegmentAsset[] = [];

    for (let i = 0; i < seg.shots.length; i++) {
      const shot = seg.shots[i];

      if (!shot.videoUrl && shot.display) {
        const combinedVideoPrompt =
          `${shot.videoPrompt || ""}. ${shot.scenePrompt || ""}`.trim() || shot.words || "";

        const clipDurationSec = convertMsToSeconds(shot.duration || 5000);

        try {
          const { videoPath, price } = await generateVideoClip(context, {
            seg,
            imageUrl: shot.imageUrl,
            duration: Math.max(5, clipDurationSec),
            tmpDir,
            promptOverride: combinedVideoPrompt,
            isProduct: false,
          });

          prices.push(price);

          const buffer = await fs.promises.readFile(videoPath);
          const r2Path = `VIDEOS/${schemeId}/${seg.id}/VIDEOS/${generateId()}.mp4`;
          const uploadedUrl = await context.services.storage.uploadData(r2Path, buffer);

          shot.videoUrl = uploadedUrl;

          const asset: SegmentAsset = {
            id: generateId(),
            type: "video",
            status: "completed",
            url: uploadedUrl,
            prompt: combinedVideoPrompt,
          };
          currentAssets.push(asset);

          await persistAsset(userId, projectId, schemeId, r2Path, uploadedUrl, {
            sourceType: "ai_generated",
            assetType: "video",
            originalFilename: `shot_video_${seg.id}_${generateId()}.mp4`,
            duration: shot.duration,
          });
        } catch (err) {
          console.error(`Failed to generate video for shot in segment ${seg.id}`, err);
        }
      }
      segmentUpdated = true;
    }

    if (segmentUpdated) {
      segmentAssets[seg.id] = currentAssets;
      await segmentQueries.bulkUpdateSegments([
        {
          id: seg.id,
          segment_data: JSON.parse(JSON.stringify(ensureObject(seg))),
        },
      ]);
    }
  }

  return { prices, segmentAssets };
}
