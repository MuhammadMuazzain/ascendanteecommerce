import fs from "fs";
import path from "path";
import os from "os";
import { nanoid } from "nanoid";
import { randomUUID } from "node:crypto";
import { execSync, spawn } from "child_process";
import ffmpegPath from "ffmpeg-static";
import { ffmpegAsync } from "../../../services/ffmpeg";
import { PhonosAPI } from "../../../../lib/speech-enhancer/phonos-api";
import { config } from "../../../config";
import { UgcServices } from "../index";

/**
 * Enhanced a video's audio using Phonos API.
 */
export async function enhanceUgcSegment(
  videoUrl: string,
  options: {
    schemaId: string;
    projectId: string;
    segmentId: string;
    runToken: string;
    phase: "pre-sts" | "post-sts";
  },
  services: UgcServices,
) {
  const { projectId, segmentId, runToken, phase } = options;
  console.log("[AudioEnhancer] Enhancing audio for segment", segmentId, "phase", phase);
  console.log("[AudioEnhancer] Options:", options);
  const phonosToken = config.phonos.token;

  if (!phonosToken) {
    console.warn("[AudioEnhancer] PHONOS_TOKEN not set, skipping enhancement.");
    return { improvedUrl: videoUrl, comparison: { original: videoUrl, updated: videoUrl } };
  }

  const tmpDir = os.tmpdir();
  const inputVideoPath = path.join(tmpDir, `input-${segmentId}-${runToken}.mp4`);
  const inputAudioPath = path.join(tmpDir, `audio-${segmentId}-${runToken}.mp3`);
  const enhancedAudioPath = path.join(tmpDir, `enhanced-${segmentId}-${runToken}.wav`);
  const outputVideoPath = path.join(tmpDir, `output-${segmentId}-${runToken}.mp4`);

  try {
    // 1. Download segment video
    const response = await fetch(videoUrl);
    fs.writeFileSync(inputVideoPath, Buffer.from(await response.arrayBuffer()));

    // 2. Extract Audio for enhancement
    await ffmpegAsync([
      "-y",
      "-i",
      inputVideoPath,
      "-vn",
      "-acodec",
      "libmp3lame",
      "-b:a",
      "128k",
      inputAudioPath,
    ]);

    // 3. Enhance with Phonos API
    const phonos = new PhonosAPI(phonosToken);
    await phonos.uploadFile(inputAudioPath);
    const serverTrackId = await phonos.createEnhanceSpeechTrack(randomUUID());

    let downloadUrl = "";
    for (let i = 0; i < 60; i++) {
      // Max 5 mins, checks every 5s
      const { status, data } = await phonos.checkEnhancementResult(serverTrackId);
      if (status === 200 && data?.url) {
        downloadUrl = data.url;
        break;
      }
      await new Promise((r) => setTimeout(r, 5000));
    }

    if (!downloadUrl) throw new Error("Phonos enhancement timed out");
    await phonos.downloadEnhancedAudio(downloadUrl, enhancedAudioPath);

    // 4. Remux enhanced audio back into original video container
    const ffmpegArgs = [
      "-y",
      "-i",
      inputVideoPath,
      "-i",
      enhancedAudioPath,
      "-c:v",
      "copy",
      "-map",
      "0:v:0",
      "-map",
      "1:a:0",
      outputVideoPath,
    ];

    await ffmpegAsync(ffmpegArgs);

    // 5. Upload back to R2
    const key = `projects/${projectId}/videos/${segmentId}-${phase === "pre-sts" ? "improved" : "polished"}-${runToken}.mp4`;
    const improvedUrl = await services.r2.uploadData(
      key,
      fs.readFileSync(outputVideoPath),
      "video/mp4",
    );

    return {
      improvedUrl,
      comparison: {
        original: videoUrl,
        updated: improvedUrl,
      },
    };
  } catch (err) {
    console.error(`[AudioEnhancer] Failed for segment ${segmentId} phase ${phase}:`, err);
    throw err;
  } finally {
    [inputVideoPath, inputAudioPath, enhancedAudioPath, outputVideoPath].forEach((p) => {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    });
  }
}
