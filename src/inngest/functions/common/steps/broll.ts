import fs from "fs";
import path from "path";
import os from "os";

import { config as appConfig } from "@/inngest/config";

import { convertSecondsToMs, convertMsToSeconds } from "@/inngest/utils/common";

import { VisualBroll } from "@/types/segment";
import { StepContext } from "./types";

import { generateId } from "@/utils/id";
import {
  Segment,
  MediaMetadata,
  PriceItem,
  SegmentAsset,
  VideoSegment,
} from "@/inngest/utils/types";
import { duplicateVideo, cutMedia } from "@/inngest/services/ffmpeg";
import { ServicePricing } from "@/inngest/utils/pricing";
import { downloadVideo, fileUrlToBuffer } from "@/inngest/functions/common/utils/common";
import { persistAsset } from "@/inngest/functions/common/steps/utils";

import { SegmentTiming } from "@/inngest/functions/common/steps/timings";
import { VideoGenerator } from "@/lib/video-generation";

export const processBaseBRoll = async (
  context: StepContext,
  segmentTimings: SegmentTiming[],
  userId: string | null,
  projectId: string | null,
): Promise<{
  url: string | null;
  prices: PriceItem[];
  segmentAssets: Record<string, SegmentAsset[]>;
}> => {
  const segmentAssets: Record<string, SegmentAsset[]> = {};
  const { services, schemeId, scheme } = context;
  const tmpDir = os.tmpdir();

  const segments = scheme.segments;
  const bRollSegments = segments.filter((s) => {
    const timing = segmentTimings.find((t) => t.id === s.id);
    return timing && timing.bRolls.length > 0;
  });

  if (bRollSegments.length === 0) {
    return { url: null, prices: [], segmentAssets: {} };
  }

  const getSegmentDuration = (id: string) => {
    const timing = segmentTimings.find((t) => t.id === id);
    if (!timing) return 0;
    return timing.clips.reduce((sum, clip) => sum + clip.duration, 0);
  };

  let longestBRollSegment = bRollSegments[0];
  let audioDuration = getSegmentDuration(longestBRollSegment.id);

  for (const s of bRollSegments) {
    const duration = getSegmentDuration(s.id);
    if (duration > audioDuration) {
      audioDuration = duration;
      longestBRollSegment = s;
    }
  }

  const firstBRoll = longestBRollSegment.bRolls![0];
  const prices: PriceItem[] = [];

  let assetImg: SegmentAsset = {
    id: generateId(),
    type: "image",
    status: "generating",
    prompt: firstBRoll.firstFrame!,
  };

  const avatarUrl = await services.imageGenerator.create({
    prompt: firstBRoll.firstFrame!,
    aspectRatio: scheme.aspectRatio,
    imageUrls: scheme.assets?.length ? scheme.assets.map((a: any) => a.url) : [],
  });

  prices.push({
    service: "Seedream",
    type: "image 4.5",
    price: ServicePricing.GENERATE_SEEDREAM_45_IMAGE,
  });

  const avatarFile = await fileUrlToBuffer(avatarUrl);
  const avatarFilePath = `VIDEOS/${schemeId}/AVATAR/${generateId()}.${avatarFile.extension}`;
  const avatarImageUrl = await services.storage.uploadData(avatarFilePath, avatarFile.buffer);

  assetImg = { ...assetImg, url: avatarImageUrl, status: "completed" };
  await persistAsset(userId, projectId, schemeId, avatarFilePath, avatarImageUrl, {
    sourceType: "ai_generated",
    assetType: "image",
    originalFilename: `bRoll_avatar_${schemeId}.${avatarFile.extension}`,
  });

  let assetVid: SegmentAsset = {
    id: generateId(),
    type: "video",
    status: "generating",
    prompt: firstBRoll.videoPrompt,
  };

  const HAILUO_DURATION_SECONDS = 5.8;
  const HAILUO_DURATION_MS = convertSecondsToMs(HAILUO_DURATION_SECONDS);

  const PIXVERSE_DURATION_SECONDS = 4.8;
  const PIXVERSE_DURATION_MS = convertSecondsToMs(PIXVERSE_DURATION_SECONDS);

  let videoToSyncUrl = "";
  if (audioDuration <= PIXVERSE_DURATION_MS) {
    const videoGenerator = new VideoGenerator({
      provider: "pixverse",
      params: {
        url: appConfig.freepik.url,
        apiKey: appConfig.freepik.key,
        resolution: scheme.resolution,
      },
    });

    const result = await videoGenerator.create({
      firstFrameUrl: avatarImageUrl,
      prompt: `${firstBRoll.videoPrompt}, the person must be speaking directly to the lens`,
      style: scheme.visuals.style,
      durationSeconds: 5,
      resolution: scheme.resolution,
    });
    videoToSyncUrl = typeof result === "string" ? result : result.url;

    prices.push({
      service: "PixVerse",
      type: `video_${scheme.resolution}`,
      price: ServicePricing.GENERATE_VIDEO_HIGH,
    });
  } else {
    const videoGenerator = new VideoGenerator({
      provider: "hailuo",
      params: {
        url: appConfig.freepik.url,
        apiKey: appConfig.freepik.key,
        resolution: scheme.resolution,
      },
    });

    const hailuoParams: any = {
      prompt: `${firstBRoll.videoPrompt}, the person must be speaking directly to the lens`,
      aspectRatio: scheme.aspectRatio,
      firstFrameUrl: avatarImageUrl,
      style: scheme.visuals.style,
    };
    if (audioDuration > HAILUO_DURATION_MS) hailuoParams.lastFrameUrl = avatarImageUrl;

    const resultVid = await videoGenerator.create(hailuoParams);
    const videoUrl = typeof resultVid === "string" ? resultVid : resultVid.url;

    prices.push({
      service: "Hailuo",
      type: `video_${scheme.resolution}`,
      price: ServicePricing.GENERATE_VIDEO_HIGH_V2,
    });

    if (!videoUrl) throw new Error("Broll video generation failed");

    const downloadedVideoPath = await downloadVideo(videoUrl, tmpDir);

    let videoToSyncPath = downloadedVideoPath;

    if (audioDuration > HAILUO_DURATION_MS) {
      const times = Math.ceil(audioDuration / HAILUO_DURATION_MS);
      const { buffer: duplicatedBuffer, ext: videoExt } = await duplicateVideo(
        downloadedVideoPath,
        times,
        tmpDir,
      );
      videoToSyncPath = path.join(tmpDir, `duplicated_base_${generateId()}${videoExt}`);
      fs.writeFileSync(videoToSyncPath, duplicatedBuffer);
    }

    videoToSyncUrl = await services.storage.uploadData(
      `VIDEOS/${schemeId}/BRoll_BASE/TEMP_SYNC_${generateId()}.mp4`,
      fs.readFileSync(videoToSyncPath),
    );
  }

  assetVid = { ...assetVid, url: videoToSyncUrl, status: "completed" };

  segmentAssets[schemeId] = [assetImg, assetVid];

  return { url: videoToSyncUrl, prices, segmentAssets };
};

export const processSegmentBRolls = async (
  context: StepContext,
  segmentTimings: SegmentTiming[],
  baseBRollVideoUrl: string | null,
  userId: string | null,
  projectId: string | null,
): Promise<{
  results: Record<string, VisualBroll[]>;
  prices: PriceItem[];
  segmentAssets: Record<string, SegmentAsset[]>;
}> => {
  const { services, schemeId, scheme } = context;
  const tmpDir = os.tmpdir();
  const results: Record<string, VisualBroll[]> = {};
  const segmentAssets: Record<string, SegmentAsset[]> = {};

  if (!baseBRollVideoUrl) return { results, prices: [], segmentAssets: {} };

  const localBaseVideoPath = await downloadVideo(baseBRollVideoUrl, tmpDir);

  const segments = scheme.segments;
  for (const s of segments) {
    if (!s.bRolls || s.bRolls.length === 0) continue;

    const segTimings = segmentTimings.find((t) => t.id === s.id);
    if (!segTimings) continue;

    const processedBRolls: VisualBroll[] = [];

    for (let i = 0; i < s.bRolls.length; i++) {
      const bRoll = s.bRolls[i];
      try {
        const dataTime = segTimings.bRolls.find((b) => b.originalBRollIndex === i);
        if (!dataTime) continue; // Already logged and skipped in timings logic

        const { from, to } = dataTime.display;
        const bRollDuration = dataTime.duration;

        console.log("adjusted B-Roll", {
          id: s.id,
          adjustedFrom: from,
          adjustedTo: to,
        });

        const { buffer: cutVideoBuffer, ext: videoExt } = await cutMedia(
          localBaseVideoPath,
          `${convertMsToSeconds(bRollDuration)}`,
          tmpDir,
        );

        const filePath = `VIDEOS/${schemeId}/${s.id}/BRoll_VIDEO/${generateId()}${videoExt}`;
        const url = await services.storage.uploadData(filePath, cutVideoBuffer);

        processedBRolls.push({
          type: "video",
          url,
          time: from,
          duration: bRollDuration,
          firstFrame: bRoll.firstFrame,
          videoPrompt: bRoll.videoPrompt,
          words: bRoll.words,
          scenePrompt: bRoll.scenePrompt,
        });

        await persistAsset(userId, projectId, schemeId, filePath, url, {
          sourceType: "ai_generated",
          assetType: "video",
          originalFilename: `bRoll_cut_${s.id}_${generateId()}${videoExt}`,
          duration: bRollDuration,
        });
      } catch (err) {
        console.error(`B-Roll processing failed for segment ${s.id}:`, err);
      }
    }
    results[s.id] = processedBRolls;
  }
  return { results, prices: [], segmentAssets };
};
