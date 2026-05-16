import { nanoid } from "nanoid";
import { db } from "@/lib/database";
import { buildUgcPrompt, buildUgcNegativePrompt } from "@/lib/prompts";
import { getLastFrameFromVideo } from "../../../services/ffmpeg";
import { UgcServices } from "../index";
import * as os from "os";
import * as fs from "fs";
import * as path from "path";
import { Segment, VideoSchema } from "@/types/segment";
import { transcribeAndTrimVeoVideo } from "@/inngest/services/veo-video-processor";

// Veo 3.1 supports 4s, 6s, 8s. Pick closest.
export const getClosestVeoDuration = (estimatedDuration: number) => {
  if (estimatedDuration <= 5) return 4;
  if (estimatedDuration <= 7) return 6;
  return 8;
};

export const getIsProductShot = (shot?: any) => {
  if (!shot) return false;
  if (shot.type === "product") return true;
  return shot.hasProductInteraction === true;
};

export type UgcVideoMode = "FIRST_FRAME_TO_VIDEO" | "REFERENCE_TO_VIDEO";

export interface VeoInput {
  prompt: string;
  negativePrompt?: string;
  durationSeconds: number;
  aspectRatio: string;
  firstFrameUrl?: string;
  lastFrameUrl?: string;
  referenceImageUrls?: string[];
}

export interface UgcVideoRequest {
  text: string;
  estimatedDuration: number;
  shot?: {
    videoPrompt?: string;
    type?: string;
    hasProductInteraction?: boolean;
  };
  mode: UgcVideoMode;
  firstFrameSource: "avatar" | "last_frame" | "none";
  avatarUrl?: string;
  product: {
    urls: string[];
    name?: string;
    description?: string;
  };
  aspectRatio: string;
  schemaId: string;
  segmentId: string;
  firstFrameUrl?: string;
}

export type WaveItem = {
  segmentId: string; // The database ID (segment.id)
  segData: any; // The segment_data object
  previousSegmentDbId?: string | null;
  mode: UgcVideoMode;
  needsPreviousFrame: boolean;
  firstFrameSource: "avatar" | "last_frame" | "none";
};

/**
 * Phase 1 — identity continuity: one uploaded avatar locks clip 0; every later clip
 * continues from the previous segment's last frame (client Flow "Frames to Video" model).
 * Revert by restoring the prior wave-based buildGenerationPlan from git history.
 */
export function buildGenerationPlan(sortedSegments: any[]) {
  const ordered = [...sortedSegments].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0),
  );

  const items: WaveItem[] = ordered.map((seg, index) => {
    const segData = seg.segment_data as any;
    const isFirst = index === 0;

    if (isFirst) {
      return {
        segmentId: seg.id,
        segData,
        previousSegmentDbId: null,
        mode: "FIRST_FRAME_TO_VIDEO" as UgcVideoMode,
        needsPreviousFrame: false,
        firstFrameSource: "avatar" as const,
      };
    }

    return {
      segmentId: seg.id,
      segData,
      previousSegmentDbId: ordered[index - 1].id,
      mode: "FIRST_FRAME_TO_VIDEO" as UgcVideoMode,
      needsPreviousFrame: true,
      firstFrameSource: "last_frame" as const,
    };
  });

  return { waves: [items] };
}

/**
 * Extracts the last frame of a video from a given URL and uploads it to R2.
 */
export const extractLastFrameFromVideoUrl = async ({
  videoUrl,
  schemaId,
  segmentId,
  services,
}: {
  videoUrl: string;
  schemaId: string;
  segmentId: string;
  services: UgcServices;
}) => {
  const { r2 } = services;
  console.log(`[Veo] Extracting last frame from: ${videoUrl}`);

  const response = await fetch(videoUrl);
  const buffer = Buffer.from(await response.arrayBuffer());

  const tempDir = os.tmpdir();
  const downloadedFileName = `temp-extract-${nanoid()}.mp4`;
  const downloadedPath = path.join(tempDir, downloadedFileName);
  fs.writeFileSync(downloadedPath, buffer);

  try {
    const lastFrameBuffer = await getLastFrameFromVideo(downloadedPath, tempDir);
    const lastFrameR2Name = `ugc-videos/${schemaId}/${segmentId}/last-frame-${nanoid()}.png`;
    const lastFrameUrl = await r2.uploadData(lastFrameR2Name, lastFrameBuffer, "image/png");

    return { lastFrameUrl };
  } finally {
    if (fs.existsSync(downloadedPath)) {
      fs.unlinkSync(downloadedPath);
    }
  }
};

export async function generateVeoVideoRaw({
  input,
  services,
  schemaId,
  segmentId,
}: {
  input: VeoInput;
  services: UgcServices;
  schemaId: string;
  segmentId: string;
}) {
  const { videoGenerator, r2 } = services;

  const generatorOutput = await videoGenerator.create({
    prompt: input.prompt,
    negativePrompt: input.negativePrompt || buildUgcNegativePrompt(),
    style: "Cinematic",
    aspectRatio: input.aspectRatio,
    durationSeconds: input.durationSeconds,
    firstFrameUrl: input.firstFrameUrl,
    lastFrameUrl: input.lastFrameUrl,
    referenceImageUrls: input.referenceImageUrls,
  });

  const rawVideoUrl = typeof generatorOutput === "string" ? generatorOutput : generatorOutput.url;

  if (!rawVideoUrl) {
    throw new Error(`Veo failed to generate for segment ${segmentId}`);
  }

  // Handle base64 or URL
  let buffer: Buffer;
  let contentType = "video/mp4";

  if (rawVideoUrl.startsWith("data:")) {
    const [meta, data] = rawVideoUrl.split(",");
    if (!meta || !data) throw new Error("Invalid base64 video format");
    const contentTypeMatch = meta.match(/data:(.*?);base64/);
    contentType = contentTypeMatch ? contentTypeMatch[1] : "video/mp4";
    buffer = Buffer.from(data, "base64");
  } else {
    const response = await fetch(rawVideoUrl);
    if (!response.ok) throw new Error(`Failed to download video from ${rawVideoUrl}`);
    const arrayBuffer = await response.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
    contentType = response.headers.get("content-type") || "video/mp4";
  }

  const fileName = `ugc-videos/${schemaId}/${segmentId}/raw-${nanoid()}.mp4`;
  const rawR2Url = await r2.uploadData(fileName, buffer, contentType);

  return { rawR2Url };
}

export async function resolveVeoGenerationStrategy(
  request: UgcVideoRequest,
  services: UgcServices,
): Promise<VeoInput> {
  const { gemini } = services;
  let durationSeconds = getClosestVeoDuration(request.estimatedDuration);
  const initialDurationSeconds = durationSeconds;

  let finalPrompt = buildUgcPrompt(request.shot?.videoPrompt ?? "");

  let useFirstFrame = request.mode === "FIRST_FRAME_TO_VIDEO";
  let useReferences = request.mode === "REFERENCE_TO_VIDEO";

  let firstFrameUrlToUse: string | undefined = undefined;
  let referenceImageUrlsToUse: string[] | undefined = undefined;
  let lastFrameUrlToUse: string | undefined = undefined;
  const productRefUrls = (request.product.urls ?? []).filter(Boolean).slice(0, 2);
  const isProductShot = getIsProductShot(request.shot);

  if (useFirstFrame) {
    if (request.firstFrameSource === "avatar") {
      firstFrameUrlToUse = request.avatarUrl;
    } else if (request.firstFrameSource === "last_frame") {
      const preExtractedLastFrameUrl = request.firstFrameUrl;

      if (preExtractedLastFrameUrl) {
        firstFrameUrlToUse = preExtractedLastFrameUrl;
        lastFrameUrlToUse = request.avatarUrl;
        durationSeconds = 8;

        if (getIsProductShot(request.shot)) {
          const visibility = await gemini.checkProductVisibility(firstFrameUrlToUse, {
            name: request.product.name,
            description: request.product.description,
            referenceImageUrls: request.product.urls,
          });

          if (!visibility.isVisible || visibility.confidence < 0.7) {
            // Keep last-frame continuity (same person); drop end-frame interpolation only.
            console.warn(
              `[Veo] Segment ${request.segmentId}: low product visibility on continuation frame; keeping last frame for identity`,
            );
            lastFrameUrlToUse = undefined;
            durationSeconds = initialDurationSeconds;
            if (productRefUrls.length > 0) {
              referenceImageUrlsToUse = productRefUrls;
            }
          }
        }
      } else {
        firstFrameUrlToUse = request.avatarUrl;
        durationSeconds = initialDurationSeconds;
      }
    } else {
      firstFrameUrlToUse = request.avatarUrl;
    }

  }

  if (useReferences) {
    // Product pixels first so Veo prioritizes real packaging over avatar identity.
    referenceImageUrlsToUse = [
      ...productRefUrls,
      ...(request.avatarUrl ? [request.avatarUrl] : []),
    ].slice(0, 3);
    durationSeconds = 8;
  } else if (isProductShot && productRefUrls.length > 0 && !lastFrameUrlToUse) {
    // Product refs are only compatible with first-frame OR reference mode — not with
    // first+last frame interpolation (continuation clips that bookend with the avatar).
    referenceImageUrlsToUse = productRefUrls;
    console.log(
      `[Veo] Segment ${request.segmentId}: attaching ${productRefUrls.length} product reference(s) alongside first-frame mode`,
    );
  } else if (isProductShot && productRefUrls.length > 0 && lastFrameUrlToUse) {
    console.log(
      `[Veo] Segment ${request.segmentId}: using first+last frame interpolation; skipping product reference images (Veo API limitation)`,
    );
  }

  if (productRefUrls.length === 0 && isProductShot) {
    console.warn(
      `[Veo] Segment ${request.segmentId}: product shot but no product image URLs — Veo will rely on prompt text only`,
    );
  }

  console.log(`[Veo] Segment ${request.segmentId}`, {
    mode: request.mode,
    isProductShot,
    productRefCount: productRefUrls.length,
    referenceCount: referenceImageUrlsToUse?.length ?? 0,
    firstFrameSource: request.firstFrameSource,
  });

  return {
    prompt: finalPrompt,
    durationSeconds,
    aspectRatio: request.aspectRatio,
    firstFrameUrl: firstFrameUrlToUse,
    lastFrameUrl: lastFrameUrlToUse,
    referenceImageUrls: referenceImageUrlsToUse,
  };
}

export const updateVeoSegmentInDb = async ({
  segmentDbId,
  segData,
  finalR2Url,
  tsUrl,
  actualDuration,
  mode,
  firstFrameSource,
}: {
  segmentDbId: string;
  segData: Segment;
  finalR2Url: string;
  tsUrl?: string;
  actualDuration: number;
  mode?: string;
  firstFrameSource?: string;
}) => {
  const prompt =
    (segData.shots?.length ?? 0) > 0
      ? buildUgcPrompt(segData.shots![0].videoPrompt)
      : buildUgcPrompt("");
  const assetId = nanoid();

  const existingAssets = (segData.assets ?? []).map((a: any) => ({
    ...a,
    active: a.type === "video" ? false : a.active,
  }));
  const updatedAssets = [
    ...existingAssets,
    {
      id: assetId,
      type: "video",
      videoUrl: finalR2Url,
      status: "completed",
      active: true,
      prompt,
    },
  ];

  const freshSeg = await db
    .selectFrom("segments")
    .select("segment_data")
    .where("id", "=", segmentDbId)
    .executeTakeFirst();

  const currentSegData = freshSeg ? (freshSeg.segment_data as any) : segData;

  const updatePayload: any = {
    ...currentSegData,
    assets: updatedAssets,
    estimatedDuration: actualDuration,
  };

  if (updatePayload.shots && updatePayload.shots.length > 0) {
    const originalShot = updatePayload.shots[0];
    const durationMs = actualDuration * 1000;
    updatePayload.shots[0] = {
      ...originalShot,
      videoUrl: finalR2Url,
      duration: durationMs,
      display: { from: 0, to: durationMs },
      prompt: originalShot.prompt || originalShot.videoPrompt || originalShot.scenePrompt || "",
      category: originalShot.category || "Avatar",
      words: originalShot.words || segData.text || "",
      mode: mode || originalShot.mode,
      firstFrameSource: firstFrameSource || originalShot.firstFrameSource,
    };
  }

  if (tsUrl) {
    updatePayload.speechToText = { src: tsUrl, type: "json" };
  }

  await db
    .updateTable("segments")
    .set({
      segment_data: updatePayload,
      updated_at: new Date(),
    })
    .where("id", "=", segmentDbId)
    .execute();
};

export const updateUgcShotMetadata = async ({
  segmentDbId,
  mode,
  firstFrameSource,
}: {
  segmentDbId: string;
  mode?: string;
  firstFrameSource?: string;
}) => {
  const freshSeg = await db
    .selectFrom("segments")
    .select("segment_data")
    .where("id", "=", segmentDbId)
    .executeTakeFirst();

  if (!freshSeg) return;

  const currentSegData = freshSeg.segment_data as any;
  if (currentSegData.shots && currentSegData.shots.length > 0) {
    currentSegData.shots[0] = {
      ...currentSegData.shots[0],
      mode: mode || currentSegData.shots[0].mode,
      firstFrameSource: firstFrameSource || currentSegData.shots[0].firstFrameSource,
    };
    console.log(JSON.stringify(currentSegData));
    await db
      .updateTable("segments")
      .set({
        segment_data: currentSegData,
        updated_at: new Date(),
      })
      .where("id", "=", segmentDbId)
      .execute();
  }
};

/**
 * Unified function for generating 1 video:
 * 1. Resolves generation strategy (prompts, frames, durations)
 * 2. Calls video generator and uploads raw result to R2
 * 3. Isolates voice, trims, and re-transcribes the result
 */
export async function generateUgcVideo({
  request,
  services,
}: {
  request: UgcVideoRequest;
  services: UgcServices;
}) {
  // Use script dialogue only — do not append filler phrases to pad short segments toward ~8s.
  const localRequest = { ...request };

  // 1. Resolve Strategy
  const veoInput = await resolveVeoGenerationStrategy(localRequest, services);

  // 2. Generate the video
  const { rawR2Url } = await generateVeoVideoRaw({
    input: veoInput,
    services,
    schemaId: request.schemaId,
    segmentId: request.segmentId,
  });

  // 3. Isolate voice, trim, extract last frame, and re-transcribe
  const processedVideo = await transcribeAndTrimVeoVideo({
    rawR2Url,
    schemaId: request.schemaId,
    segmentId: request.segmentId,
    // Align captions to script dialogue (not Veo paraphrase / filler)
    expectedText: (localRequest as { originalText?: string }).originalText || localRequest.text,
    tts: services.tts,
  });

  const { finalR2Url, actualDuration, tsUrl, lastFrameUrl, isolatedVideoUrl } = processedVideo;

  // 4. Return everything needed
  return {
    rawR2Url, // The original video without isolation
    isolatedVideoUrl, // The raw untrimmed video with the isolated voice
    lastFrameUrl,
    finalTrimmedUrl: finalR2Url, // This applies the isolated audio video BUT correctly trimmed!
    actualDuration,
    tsUrl,
    originalText: localRequest.text,
  };
}
