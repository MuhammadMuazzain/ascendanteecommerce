import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import ffmpegPath from "ffmpeg-static";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import { aspectRatioType } from "@/utils/enum";

// Configure fluent-ffmpeg with the static binary
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

/**
 * Get the duration of a video file in seconds using ffprobe
 */
export async function getVideoDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err: any, metadata: any) => {
      if (err) return reject(err);
      const duration = metadata.format.duration;
      if (duration === undefined) return reject(new Error("Could not determine video duration"));
      resolve(duration);
    });
  });
}

/**
 * Helper function to run FFmpeg asynchronously using spawn
 * Resolves when process exits with code 0, rejects otherwise
 */

export function ffmpegAsync(args: string[], stdio: "pipe" | "ignore" = "ignore"): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath!, args, { stdio });

    proc.on("error", (err) => {
      console.error("[FFMPEG] Process error:", err);
      reject(err);
    });

    proc.on("close", (code) => {
      if (code === 0) resolve();
      else {
        console.error(`[FFMPEG] Process exited with code ${code}`);
        reject(new Error(`ffmpeg exited with code ${code}`));
      }
    });
  });
}
/*
export function ffmpegAsync(
	args: string[],
): Promise<void> {
	return new Promise((resolve, reject) => {
		const proc = spawn(ffmpegPath!, args, { stdio: ["ignore", "pipe", "pipe"] });

			proc.stdout.on("data", (data) => {
				console.log(`[FFMPEG STDOUT]: ${data}`);
			});

			proc.stderr.on("data", (data) => {
				console.error(`[FFMPEG STDERR]: ${data}`);
			});

		proc.on("error", (err) => {
			console.error("[FFMPEG] Process error:", err);
			reject(err);
		});

		proc.on("close", (code) => {
			if (code === 0) resolve();
			else {
				console.error(`[FFMPEG] Process exited with code ${code}`);
				reject(new Error(`ffmpeg exited with code ${code}`));
			}
		});
	});
}
*/
/**
 * Extract a single frame from a video
 */
export async function getLastFrameFromVideo(filePath: string, tmpDir: string): Promise<Buffer> {
  const outputPath = path.join(
    tmpDir,
    `frame-last-${Date.now()}-${Math.random().toString(36).substring(7)}.png`,
  );

  // Try fast seek first (0.1s before EOF)
  try {
    await ffmpegAsync([
      "-y",
      "-accurate_seek",
      "-sseof",
      "-0.1",
      "-i",
      filePath,
      "-frames:v",
      "1",
      "-f",
      "image2",
      "-vcodec",
      "png",
      outputPath,
    ]);
  } catch (err) {
    console.warn("[LAST_FRAME] Fast seek failed, trying wider seek...", err);
  }

  // Fallback 1: If file doesn't exist, try seeking deeper (0.5s before EOF)
  if (!fs.existsSync(outputPath)) {
    try {
      await ffmpegAsync(["-y", "-sseof", "-0.5", "-i", filePath, "-frames:v", "1", outputPath]);
    } catch (err) {
      console.warn("[LAST_FRAME] Fallback seek failed.", err);
    }
  }

  // Fallback 2: Global scan for last frame (Slowest but most reliable)
  if (!fs.existsSync(outputPath)) {
    try {
      await ffmpegAsync([
        "-y",
        "-i",
        filePath,
        "-vf",
        "select=eq(n\\,last)",
        "-frames:v",
        "1",
        outputPath,
      ]);
    } catch (err) {
      console.error("[LAST_FRAME] All methods failed to generate frame.", err);
    }
  }

  if (!fs.existsSync(outputPath)) {
    throw new Error(`Failed to generate last frame for ${filePath}`);
  }

  const buffer = fs.readFileSync(outputPath);
  fs.unlinkSync(outputPath);
  return buffer;
}

/**
 * Generate a snapshot/preview from a video
 */
export async function getPreviewForVideo(filePath: string, tmpDir: string): Promise<Buffer> {
  const outputPath = path.join(tmpDir, `preview-${Date.now()}.webp`); // Añadir random para mayor unicidad
  try {
    await ffmpegAsync(
      [
        "-y", // Sobrescribir el archivo de salida si existe
        "-ss",
        "1", // Busca en el segundo 1
        "-i",
        filePath,
        "-frames:v",
        "1", // Extrae solo un frame
        "-q:v",
        "5", // Calidad de compresión (1-31, 1 es mejor)
        outputPath,
      ],
      //"ignore",
    );

    if (!fs.existsSync(outputPath)) {
      throw new Error(`Failed to generate preview image: ${outputPath} does not exist.`);
    }

    const buffer = fs.readFileSync(outputPath);
    fs.unlinkSync(outputPath); // Limpiar el archivo temporal
    return buffer;
  } catch (err: any) {
    console.error("[GET_PREVIEW] Error generating preview:", err);
    throw new Error(`Failed to generate video preview: ${err?.message}`);
  }
}

export async function validateMp4(inputPath: string): Promise<boolean> {
  try {
    await ffmpegAsync(["-i", inputPath, "-c", "copy", "-f", "null", "-"]);
    return true; // Valid video, no recoding needed
  } catch (err) {
    console.warn("Invalid or corrupted video:", inputPath, err);
    return false; // Needs recoding
  }
}

export async function fixAndValidateMp4(inputPath: string): Promise<string> {
  // First, validate the video
  const isValid = await validateMp4(inputPath);
  if (isValid) {
    console.log("Video is valid, no need to re-encode:", inputPath);
    return inputPath; // already a valid H.264/MP4
  }

  // Re-encode to H.264 only if necessary
  const outputPath = inputPath.replace(/\.mp4$/, "-fixed.mp4");
  await ffmpegAsync([
    "-y",
    "-i",
    inputPath,
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    "23",
    "-movflags",
    "faststart",
    outputPath,
  ]);

  // Validate the integrity of the re-encoded video
  try {
    await ffmpegAsync([
      "-v",
      "error", // show only errors
      "-i",
      outputPath,
      "-f",
      "null",
      "-", // decode all frames but discard output
    ]);
  } catch (err) {
    console.error("[FIX_MP4] Video is corrupt after re-encoding:", outputPath);
    throw new Error(`Video corrupt or unreadable: ${outputPath}`);
  }

  // Video re-encoded and validated
  return outputPath;
}

export async function adjustVideoToCanvasBuffer(
  inputPath: string,
  tmpDir: string,
  aspectRatio: aspectRatioType,
): Promise<Buffer> {
  const aspectSizes: Record<aspectRatioType, { width: number; height: number }> = {
    [aspectRatioType.SIXTEEN_NINE]: { width: 1280, height: 720 },
    [aspectRatioType.NINE_SIXTEEN]: { width: 720, height: 1280 },
    [aspectRatioType.ONE]: { width: 720, height: 720 },
  };
  const canvasSize = aspectSizes[aspectRatio];

  const outputPath = path.join(tmpDir, `adjusted-${Date.now()}-${path.basename(inputPath)}`);

  try {
    // ffmpeg filter: scale with aspect ratio inside the canvas
    // mantiene proporción, no se sale del lienzo
    const scaleFilter = `scale='min(${canvasSize.width},iw*${canvasSize.height}/ih)':'min(${canvasSize.height},ih*${canvasSize.width}/iw)':force_original_aspect_ratio=decrease`;

    await ffmpegAsync([
      "-y",
      "-i",
      inputPath,
      "-vf",
      scaleFilter,
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "23",
      "-movflags",
      "faststart",
      "-c:a",
      "aac",
      outputPath,
    ]);

    if (!fs.existsSync(outputPath)) {
      throw new Error("Video was not generated.");
    }

    const buffer = fs.readFileSync(outputPath);
    fs.unlinkSync(outputPath); // limpiar temporal
    return buffer;
  } catch (err) {
    console.error("[ADJUST_VIDEO] Error:", err);
    throw err;
  }
}

export async function cutMedia(
  fileUrl: string,
  duration: string, //seconds
  outputFolder: string,
  startTime?: string, // optional
): Promise<{ buffer: Buffer; ext: string }> {
  try {
    if (!fs.existsSync(fileUrl)) throw new Error(`Input file does not exist: ${fileUrl}`);
    if (!fs.existsSync(outputFolder)) fs.mkdirSync(outputFolder, { recursive: true });

    const ext = path.extname(fileUrl);
    const baseName = path.basename(fileUrl, ext);

    const outputPath = path.join(
      outputFolder,
      `${baseName}-cut-${Date.now()}-${Math.floor(Math.random() * 1000)}${ext}`,
    );

    const args = [
      "-y",
      ...(startTime ? ["-ss", startTime] : []),
      "-i",
      fileUrl,
      "-t",
      duration,
      "-c",
      "copy",
      "-map",
      "0",
      "-avoid_negative_ts",
      "make_zero",
      outputPath,
    ];

    await ffmpegAsync(args);

    if (!fs.existsSync(outputPath)) {
      throw new Error("Cut file was not generated.");
    }

    const buffer = fs.readFileSync(outputPath);
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); // cleanup local file after reading to buffer

    return { buffer, ext };
  } catch (err: any) {
    console.error("[CUT_MEDIA] Error:", err);
    throw new Error(`Failed to cut media: ${err?.message}`);
  }
}

export async function duplicateVideo(
  videoPath: string,
  times: number,
  outputFolder: string,
): Promise<{ buffer: Buffer; ext: string }> {
  try {
    if (!fs.existsSync(videoPath)) {
      throw new Error(`Input video does not exist: ${videoPath}`);
    }

    if (times < 2) {
      throw new Error(`times must be greater than or equal to 2`);
    }

    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder, { recursive: true });
    }

    const ext = path.extname(videoPath);
    const baseName = path.basename(videoPath, ext);

    const outputPath = path.join(
      outputFolder,
      `${baseName}-duplicated-${times}x-${Date.now()}-${Math.floor(Math.random() * 1000)}${ext}`,
    );

    // Create temporary concat file
    const concatFilePath = path.join(
      outputFolder,
      `concat-${Date.now()}-${Math.floor(Math.random() * 1000)}.txt`,
    );

    // Each line must be: file 'path'
    const concatContent = Array(times)
      .fill(`file '${videoPath.replace(/'/g, "'\\''")}'`)
      .join("\n");

    fs.writeFileSync(concatFilePath, concatContent);

    await ffmpegAsync([
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      concatFilePath,
      "-c",
      "copy",
      "-map",
      "0",
      outputPath,
    ]);

    if (fs.existsSync(concatFilePath)) fs.unlinkSync(concatFilePath); // clean temp file

    if (!fs.existsSync(outputPath)) {
      throw new Error("Duplicated video was not generated.");
    }

    const buffer = fs.readFileSync(outputPath);
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); // clean up

    return { buffer, ext };
  } catch (err: any) {
    console.error("[DUPLICATE_VIDEO] Error:", err);
    throw new Error(`Failed to duplicate video: ${err?.message}`);
  }
}
