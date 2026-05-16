import fs from "fs";
import path from "path";
import { promisify } from "util";
import { pipeline } from "stream";
import mime from "mime/lite";

import { IPexelsVideo, IPexelsVideoFile } from "@/lib/stock/video";

import { generateId } from "@/utils/id";

const streamPipeline = promisify(pipeline);

export function splitIntoOptimalClips(totalDuration: number, clipDuration = 6) {
  if (totalDuration <= 0) return { count: 0, clips: [] };
  const count = Math.ceil(totalDuration / clipDuration);
  const base = Math.floor(totalDuration / count);
  const remainder = totalDuration % count;
  const clips = Array.from({ length: count }, (_, i) => (i < remainder ? base + 1 : base));
  return { count, clips };
}

export function splitIntoPixVerseClips(totalDuration: number) {
  // If total duration is zero or negative, return empty result
  if (totalDuration <= 0) {
    return { count: 0, clips: [], remainder: 0 };
  }

  // If duration is 5 seconds or less, create a single 5s clip
  if (totalDuration <= 5) {
    return { count: 1, clips: [5], remainder: 0 };
  }

  let clips: number[] = [];
  let remaining = totalDuration;

  // Use as many 8-second clips as possible first
  while (remaining >= 8) {
    clips.push(8);
    remaining -= 8;
  }

  // Handle leftover seconds
  if (remaining > 0) {
    // If remainder <= 5, just add one 5-second clip
    if (remaining <= 5) {
      clips.push(5);
      remaining -= 5;
    } else {
      // If remainder is 6 or 7, replace one 8s clip with two 5s to minimize number of clips
      const last8Index = clips.lastIndexOf(8);
      if (last8Index !== -1) {
        clips.splice(last8Index, 1, 5, 5);
        remaining = totalDuration - clips.reduce((a, b) => a + b, 0);
      } else {
        // If no 8s to replace, just add one 5s clip
        clips.push(5);
        remaining = totalDuration - clips.reduce((a, b) => a + b, 0);
      }
    }
  }

  // Sort clips from largest to smallest
  clips.sort((a, b) => b - a);

  // Calculate leftover seconds that couldn't be covered exactly
  const sum = clips.reduce((a, b) => a + b, 0);
  const remainder = Math.max(totalDuration - sum, 0);

  return {
    count: clips.length, // total number of clips
    clips, // array of clip durations (5s or 8s), sorted descending
    remainder, // leftover seconds not covered by clips
  };
}

export function splitIntoVideoClips(totalDuration: number, clipSizes: number[] = [5, 8]) {
  if (totalDuration <= 0) {
    return { count: 0, clips: [], remainder: 0 };
  }

  clipSizes = [...clipSizes].sort((a, b) => a - b);
  const minClip = clipSizes[0];
  const maxClip = clipSizes[clipSizes.length - 1];
  const maxAllowedRemainder = minClip - 2.5;

  if (totalDuration <= minClip) {
    return { count: 1, clips: [minClip], remainder: 0 };
  }

  let bestCombo: number[] = [];
  let bestRemainder = Infinity;

  function search(currentClips: number[], sum: number) {
    const remainder = totalDuration - sum;

    if (remainder >= 0 && remainder <= maxAllowedRemainder) {
      if (
        remainder < bestRemainder ||
        (remainder === bestRemainder && currentClips.length < bestCombo.length)
      ) {
        bestCombo = [...currentClips];
        bestRemainder = remainder;
      }
    }

    for (const clip of clipSizes) {
      if (sum + clip <= totalDuration + maxAllowedRemainder) {
        search([...currentClips, clip], sum + clip);
      }
    }
  }

  search([], 0);

  if (bestCombo.length === 0) {
    let clips: number[] = [];
    let sum = 0;

    while (sum + maxClip <= totalDuration) {
      clips.push(maxClip);
      sum += maxClip;
    }

    while (sum < totalDuration - maxAllowedRemainder) {
      clips.push(minClip); // add extra min clip if remainder too high
      sum += minClip;
    }

    clips.sort((a, b) => b - a);
    bestCombo = clips;
    bestRemainder = Math.max(totalDuration - sum, 0);
  }

  return {
    count: bestCombo.length,
    clips: bestCombo.sort((a, b) => b - a),
    remainder: bestRemainder,
  };
}

/**
 * Download a video from a URL and save to outputDir
 */
export async function downloadVideo(url: string, outputDir: string): Promise<string> {
  // Handle Data URIs (base64)
  if (url.startsWith("data:")) {
    try {
      const parts = url.split(",");
      const match = parts[0].match(/^data:([^;]+);/);
      const contentType = match ? match[1] : "video/mp4";
      const buffer = Buffer.from(parts[1] || "", "base64");

      const extension = mime.getExtension(contentType) || "mp4";
      const filename = `${generateId()}.${extension}`;
      const outputPath = path.join(/*turbopackIgnore: true*/ outputDir, filename);

      fs.mkdirSync(/*turbopackIgnore: true*/ outputDir, { recursive: true });
      fs.writeFileSync(/*turbopackIgnore: true*/ outputPath, buffer);

      console.log(`[DOWNLOAD_VIDEO] Processed Data URI. Saved to: ${outputPath}`);
      return outputPath;
    } catch (err: any) {
      console.error("[DOWNLOAD_VIDEO] Failed to process Data URI:", err);
      throw new Error(`Failed to process base64 video data`);
    }
  }

  // Handle standard URLs
  try {
    const filename = path.basename(new URL(url).pathname);
    const outputPath = path.join(/*turbopackIgnore: true*/ outputDir, filename);

    fs.mkdirSync(/*turbopackIgnore: true*/ outputDir, { recursive: true });
    const response: any = await fetch(url);
    if (!response.ok || !response.body) {
      throw new Error(`Failed to download video: ${response.status} ${response.statusText}`);
    }

    const contentLength = parseInt(response.headers.get("content-length") || "0", 10);
    await streamPipeline(response.body, fs.createWriteStream(/*turbopackIgnore: true*/ outputPath));

    if (!fs.existsSync(/*turbopackIgnore: true*/ outputPath)) {
      throw new Error(`File not found after download: ${outputPath}`);
    }

    const stats = fs.statSync(/*turbopackIgnore: true*/ outputPath);
    if (contentLength && stats.size !== contentLength) {
      throw new Error("Downloaded video is incomplete");
    }

    console.log(`[DOWNLOAD_VIDEO] Downloaded URL. Saved to: ${outputPath}`);
    return outputPath;
  } catch (err: any) {
    console.error("[DOWNLOAD_VIDEO] Failed to download video:", err);
    throw new Error(`Failed to download video`);
  }
}

export async function fileUrlToBuffer(
  fileUrl: string,
  defaultType = "png",
): Promise<{
  buffer: Buffer;
  contentType: string;
  extension: string;
  numBytes: number;
}> {
  try {
    if (fileUrl.startsWith("data:")) {
      const parts = fileUrl.split(",");
      const match = parts[0].match(/^data:([^;]+);/);
      const contentType = match ? match[1] : "image/jpeg";
      const buffer = Buffer.from(parts[1] || "", "base64");
      const extension = mime.getExtension(contentType) || defaultType;
      return { buffer, contentType, extension, numBytes: buffer.length };
    } else if (!fileUrl.startsWith("http://") && !fileUrl.startsWith("https://")) {
      // Check if it's a local file path before assuming base64
      if (fileUrl.startsWith("/") && fs.existsSync(/*turbopackIgnore: true*/ fileUrl)) {
        console.log(`[COMMON] Reading local file: ${fileUrl}`);
        const buffer = fs.readFileSync(/*turbopackIgnore: true*/ fileUrl);
        const contentType =
          mime.getType(fileUrl) || (defaultType === "png" ? "image/png" : "image/jpeg");
        const extension = mime.getExtension(contentType) || defaultType;
        return { buffer, contentType, extension, numBytes: buffer.length };
      }

      // Fallback to base64 if not a file
      const buffer = Buffer.from(fileUrl, "base64");
      const contentType = defaultType === "png" ? "image/png" : "image/jpeg";
      const extension = defaultType;
      return { buffer, contentType, extension, numBytes: buffer.length };
    }

    const urlObj = new URL(fileUrl);

    // Fetch the file as an array buffer
    const response = await fetch(fileUrl);
    if (!response.ok) throw new Error(`Error: ${response.status}`);

    // Extract MIME type from the response headers
    let contentType = response.headers.get("content-type") || "application/octet-stream";

    // Fallback to URL extension if MIME is generic or bin
    const urlPath = urlObj.pathname.toLowerCase();
    const urlExt = urlPath.split(".").pop()?.split(/[?#]/)[0];

    const isGeneric = contentType === "application/octet-stream" || !contentType;

    if (isGeneric && urlExt) {
      const inferredMime = mime.getType(urlExt);
      if (inferredMime) contentType = inferredMime;
    }

    // Convert the array buffer to a Node.js buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      throw new Error("Downloaded buffer is empty");
    }

    // Get the size in bytes
    const numBytes = buffer.length;
    const extension = mime.getExtension(contentType) || urlExt || defaultType;

    // Return the buffer, MIME type, and size
    return { buffer, contentType, extension, numBytes };
  } catch (error) {
    console.error("Error converting URL to buffer:", fileUrl, error);
    throw error;
  }
}

export const calcProgress = (num: number, totalSegments: number) => {
  return Number(((num / (4 + totalSegments)) * 100).toFixed(2));
};

export function selectVideoFromPexelsByDuration(
  videos: IPexelsVideo[],
  targetDuration: number,
  excludeIds: number[],
): IPexelsVideo | null {
  // return null if no videos
  if (!videos.length) return null;

  // Filter out already used videos
  let availableVideos = videos.filter((v) => !excludeIds.includes(v.id));

  // If all videos in the current search are already used, fallback to the full list
  if (availableVideos.length === 0) {
    availableVideos = videos;
  }

  // store best video below target
  let bestBelow: IPexelsVideo | null = null;

  for (const video of availableVideos) {
    // return immediately if equal or above target
    if (video.duration >= targetDuration) return video;

    // update best below if closer
    if (!bestBelow || video.duration > bestBelow.duration) bestBelow = video;
  }

  return bestBelow; // return best below if no exact or greater video found
}

export function selectVideoFromPexelsByDurationOld(
  videos: IPexelsVideo[],
  targetDuration: number,
): IPexelsVideo | null {
  if (!videos.length) return null;

  // Try to find a video with EXACT duration
  const exactMatch = videos.find((v) => v.duration === targetDuration);
  if (exactMatch) return exactMatch;

  // Filter videos that are LONGER than the target duration
  const longerVideos = videos.filter((v) => v.duration > targetDuration);

  if (longerVideos.length > 0) {
    // From the longer videos, pick the one that is closest to the target duration
    return longerVideos.reduce((prev, curr) => {
      const diffPrev = prev.duration - targetDuration;
      const diffCurr = curr.duration - targetDuration;
      return diffCurr < diffPrev ? curr : prev;
    });
  }

  // If there are NO longer videos, pick the closest duration overall
  return videos.reduce((prev, curr) => {
    const diffPrev = Math.abs(prev.duration - targetDuration);
    const diffCurr = Math.abs(curr.duration - targetDuration);
    return diffCurr < diffPrev ? curr : prev;
  });
}

/**
 * Returns the video file that is closest to any of the target resolutions.
 * Uses Euclidean distance between (width, height).
 */
export function getClosestResolutionMatch(
  videoFiles: IPexelsVideoFile[],
  target: { width: number; height: number },
): IPexelsVideoFile {
  let bestMatch = videoFiles[0];
  let bestDistance = Infinity;

  for (const file of videoFiles) {
    // Calculate Euclidean distance between file resolution and target
    const dx = file.width - target.width;
    const dy = file.height - target.height;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = file;
    }
  }

  return bestMatch;
}
