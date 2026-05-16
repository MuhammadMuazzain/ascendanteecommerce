import { NonRetriableError } from "inngest";
import { writeFile, readFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import { v4 as uuidv4 } from "uuid";

// ffmpeg-static ships the compiled binary; its default export is the path string.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ffmpegPath: string = require("ffmpeg-static");

import { R2StorageService } from "@/lib/r2-storage";
import { config as appConfig } from "@/app/api/uploads/socials/config";
import type { Hook } from "./extract-hooks";
import type { RemovalSegment } from "./detect-removals";

const execFileAsync = promisify(execFile);

// ─── Public types ─────────────────────────────────────────────────────────────

export interface ViralEditShot {
  id: string;
  /** R2 CDN URL for this extracted clip */
  url: string;
  /** Start position in the original source video (seconds) */
  originalStart: number;
  /** End position in the original source video (seconds) */
  originalEnd: number;
  /** Duration of the clip in seconds */
  duration: number;
}

export interface ViralEditSegment {
  id: string;
  /** "hook" = the persuasive opening, "content" = the rest of the video */
  type: "hook" | "content";
  shots: ViralEditShot[];
}

export interface ViralEditSchema {
  id: string;
  videoId: string;
  /** The hook that anchors this schema */
  hook: Hook;
  /** Always [hookSegment, contentSegment] */
  segments: [ViralEditSegment, ViralEditSegment];
}

export interface BuildSchemasOptions {
  /** R2 CDN URL of the full source video */
  r2Url: string;
  videoId: string;
  hooks: Hook[];
  removals: RemovalSegment[];
  /** Total video duration in seconds (from Deepgram metadata) */
  duration: number;
}

export interface BuildSchemasResult {
  schemas: ViralEditSchema[];
}

// ─── Internal types ───────────────────────────────────────────────────────────

interface TimeInterval {
  start: number;
  end: number;
}

// ─── Timestamp helpers ────────────────────────────────────────────────────────

/**
 * Parse Gemini hook timestamp "MM:SS.ss" → seconds.
 * e.g. "01:07.68" → 67.68
 */
function parseHookTimestamp(ts: string): number {
  const [mins, secs] = ts.split(":");
  return parseInt(mins, 10) * 60 + parseFloat(secs);
}

// ─── Interval helpers ─────────────────────────────────────────────────────────

/** Sort and merge overlapping intervals. */
function mergeIntervals(intervals: TimeInterval[]): TimeInterval[] {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged: TimeInterval[] = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    if (sorted[i].start <= last.end) {
      last.end = Math.max(last.end, sorted[i].end);
    } else {
      merged.push({ ...sorted[i] });
    }
  }
  return merged;
}

/**
 * Return the timeline gaps NOT covered by `excluded`.
 * Ignores intervals shorter than `minDuration` seconds.
 */
function computeKeepIntervals(
  duration: number,
  excluded: TimeInterval[],
  minDuration = 0.3,
): TimeInterval[] {
  const merged = mergeIntervals(excluded);
  const keep: TimeInterval[] = [];
  let cursor = 0;

  for (const ex of merged) {
    const exStart = Math.max(0, ex.start);
    const exEnd = Math.min(duration, ex.end);
    if (exStart - cursor >= minDuration) {
      keep.push({ start: cursor, end: exStart });
    }
    cursor = Math.max(cursor, exEnd);
  }
  if (duration - cursor >= minDuration) {
    keep.push({ start: cursor, end: duration });
  }
  return keep;
}

// ─── FFmpeg helpers ───────────────────────────────────────────────────────────

/**
 * Extract a single time range from `inputPath` into `outputPath`.
 * Uses input-seeking (-ss before -i) for fast seeking + re-encode for accuracy.
 */
async function extractClip(
  inputPath: string,
  start: number,
  end: number,
  outputPath: string,
): Promise<void> {
  const duration = end - start;
  await execFileAsync(ffmpegPath, [
    "-y",
    "-ss",
    String(start),
    "-i",
    inputPath,
    "-t",
    String(duration),
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    "23",
    "-c:a",
    "aac",
    "-movflags",
    "+faststart",
    outputPath,
  ]);
}

// ─── R2 upload helper ─────────────────────────────────────────────────────────

async function uploadClipToR2(filePath: string, r2Key: string): Promise<string> {
  const buffer = await readFile(filePath);
  const r2Service = new R2StorageService({
    ...appConfig.r2,
    bucketName: appConfig.r2.bucket,
  });
  return r2Service.uploadData(r2Key, buffer, "video/mp4");
}

// ─── Step ─────────────────────────────────────────────────────────────────────

/**
 * For each detected hook, uses ffmpeg to:
 *   1. Extract the hook clip  → Segment 1 (placed at the start)
 *   2. Extract the content clip (everything except the hook + removals) → Segment 2
 *
 * Both clips are uploaded to R2. Returns one ViralEditSchema per hook,
 * each with exactly 2 segments, each segment containing its shots.
 */
export async function buildSchemasFromHooks({
  r2Url,
  videoId,
  hooks,
  removals,
  duration,
}: BuildSchemasOptions): Promise<BuildSchemasResult> {
  if (hooks.length === 0) return { schemas: [] };

  // ── Download the source video once to a shared temp file ──────────────────
  const sourceFilePath = join(tmpdir(), `${videoId}_src_${uuidv4().substring(0, 6)}.mp4`);

  const dlResponse = await fetch(r2Url);
  if (!dlResponse.ok) {
    throw new NonRetriableError(
      `Failed to download source video from R2: ${dlResponse.statusText}`,
    );
  }
  await writeFile(sourceFilePath, Buffer.from(await dlResponse.arrayBuffer()));

  // Pre-compute removal intervals (constant across all hooks)
  const removalIntervals: TimeInterval[] = removals.map((r) => ({
    start: r.start,
    end: r.end,
  }));

  const schemas: ViralEditSchema[] = [];

  for (let i = 0; i < hooks.length; i++) {
    const hook = hooks[i];
    const hookStart = parseHookTimestamp(hook.start_time);
    const hookEnd = parseHookTimestamp(hook.end_time);
    const hookDuration = hookEnd - hookStart;

    const schemaId = `schema_${videoId}_h${i}`;
    const hookClipPath = join(tmpdir(), `${videoId}_hook${i}_${uuidv4().substring(0, 6)}.mp4`);

    try {
      // ── 1. Extract hook clip ──────────────────────────────────────────────
      await extractClip(sourceFilePath, hookStart, hookEnd, hookClipPath);

      const hookR2Key = `viral_schemas/${schemaId}_hook.mp4`;
      const hookClipUrl = await uploadClipToR2(hookClipPath, hookR2Key);

      const hookShot: ViralEditShot = {
        id: `shot_${schemaId}_hook`,
        url: hookClipUrl,
        originalStart: hookStart,
        originalEnd: hookEnd,
        duration: hookDuration,
      };

      // ── 2. Build content shots (video minus hook + all removals) ──────────
      const excludedIntervals: TimeInterval[] = [
        { start: hookStart, end: hookEnd },
        ...removalIntervals,
      ];
      const contentIntervals = computeKeepIntervals(duration, excludedIntervals);

      const contentShots: ViralEditShot[] = [];

      for (let j = 0; j < contentIntervals.length; j++) {
        const iv = contentIntervals[j];
        const shotClipPath = join(tmpdir(), `${schemaId}_c${j}_${uuidv4().substring(0, 6)}.mp4`);

        try {
          await extractClip(sourceFilePath, iv.start, iv.end, shotClipPath);
          const shotR2Key = `viral_schemas/${schemaId}_c${j}.mp4`;
          const shotClipUrl = await uploadClipToR2(shotClipPath, shotR2Key);

          contentShots.push({
            id: `shot_${schemaId}_c${j}`,
            url: shotClipUrl,
            originalStart: iv.start,
            originalEnd: iv.end,
            duration: iv.end - iv.start,
          });
        } finally {
          await unlink(shotClipPath).catch(() => {});
        }
      }

      schemas.push({
        id: schemaId,
        videoId,
        hook,
        segments: [
          {
            id: `seg_${schemaId}_hook`,
            type: "hook",
            shots: [hookShot],
          },
          {
            id: `seg_${schemaId}_content`,
            type: "content",
            shots: contentShots,
          },
        ],
      });
    } finally {
      await unlink(hookClipPath).catch(() => {});
    }
  }

  await unlink(sourceFilePath).catch(() => {});

  return { schemas };
}
