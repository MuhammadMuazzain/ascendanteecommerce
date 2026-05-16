import { NextRequest, NextResponse } from "next/server";
import path from "path";
import os from "os";
import fs from "fs/promises";
import { ffmpegAsync } from "@/inngest/services/ffmpeg";
import { R2StorageService } from "@/lib/r2-storage";
import { config } from "@/inngest/config";
import { generateId } from "@/utils/id";

// Initialize R2 Service
const r2 = new R2StorageService({
  bucketName: config.r2.bucket,
  accessKeyId: config.r2.accessKeyId,
  secretAccessKey: config.r2.secretAccessKey,
  accountId: config.r2.accountId,
  cdn: config.r2.cdn,
});

// Type definitions for input
interface Segment {
  trimStartTime?: string | number;
  trimEndTime?: string | number;
  trim_start_time?: string | number;
  trim_end_time?: string | number;
  description?: string;
  id?: string | number;
  hookScore?: number;
  retentionScore?: number;
  title?: string;
  preset?: string;
}

interface TrimRequest {
  url: string;
  segments: Segment[];
}

export async function POST(req: NextRequest) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "trim-"));
  const sourcePath = path.join(tempDir, `source-${generateId()}.mp4`);

  try {
    const body = (await req.json()) as TrimRequest;

    if (
      !body.url ||
      !body.segments ||
      !Array.isArray(body.segments) ||
      body.segments.length === 0
    ) {
      return NextResponse.json(
        { error: "Invalid input. 'url' and 'segments' array are required." },
        { status: 400 },
      );
    }

    console.log(`Downloading source video from ${body.url}...`);

    // Download video
    const response = await fetch(body.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch video: ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error("Response body is empty");
    }

    // Write stream to file
    const arrayBuffer = await response.arrayBuffer();
    await fs.writeFile(sourcePath, Buffer.from(arrayBuffer));

    console.log(`Video downloaded to ${sourcePath}`);

    const results = [];

    // Process segments
    for (const segment of body.segments) {
      const trimStartTime = segment.trimStartTime ?? segment.trim_start_time ?? 0;
      const trimEndTime = segment.trimEndTime ?? segment.trim_end_time ?? "full";
      const id = segment.id;
      const outputFileName = `trim-${generateId()}.mp4`;
      const outputPath = path.join(tempDir, outputFileName);

      console.log(`Trimming segment ${id}: ${trimStartTime} to ${trimEndTime}`);

      try {
        await trimVideo(sourcePath, outputPath, trimStartTime, trimEndTime);

        console.log(`Uploading segment ${id} to R2...`);

        const fileBuffer = await fs.readFile(outputPath);
        const publicUrl = await r2.uploadData(outputFileName, fileBuffer, "video/mp4");

        results.push({
          id,
          url: publicUrl,
          trimStartTime,
          trimEndTime,
          description: segment.description,
          hookScore: segment.hookScore,
          retentionScore: segment.retentionScore,
          title: segment.title,
          preset: segment.preset,
        });

        // Cleanup individual output file
        await fs.unlink(outputPath).catch(() => {});
      } catch (err) {
        console.error(`Error processing segment ${id}:`, err);
        results.push({
          id,
          error: err instanceof Error ? err.message : "Occurred during trimming",
          trimStartTime,
          trimEndTime,
        });
      }
    }

    return NextResponse.json({ trimmed: results });
  } catch (error) {
    console.error("Trim API error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  } finally {
    // Cleanup temp dir
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (e) {
      console.error("Cleanup error:", e);
    }
  }
}

async function trimVideo(
  source: string,
  dest: string,
  start: string | number,
  end: string | number,
): Promise<void> {
  const duration = calculateDuration(start, end);

  // Using custom ffmpegAsync service
  // Args: -y (overwrite), -ss (start time), -i (input), -t (duration), -c:v libx264 (re-encode), -preset fast, -crf 23, dest
  const args = ["-y", "-ss", (start ?? 0).toString(), "-i", source];

  if (duration !== null && !isNaN(duration)) {
    args.push("-t", duration.toString());
  }

  args.push("-c:v", "libx264", "-preset", "fast", "-crf", "23", "-c:a", "aac", dest);

  await ffmpegAsync(args);
}

function calculateDuration(start: string | number, end: string | number): number | null {
  if (end === "full" || !end) return null;
  const s = typeof start === "string" ? parseTime(start) : (start ?? 0);
  const e = typeof end === "string" ? parseTime(end) : end;

  if (isNaN(s) || isNaN(e)) return null;
  return Math.max(0, e - s);
}

function parseTime(timeStr: string): number {
  if (!timeStr || timeStr === "full") return NaN;
  const parts = timeStr.toString().split(":").map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return parts[0];
}
