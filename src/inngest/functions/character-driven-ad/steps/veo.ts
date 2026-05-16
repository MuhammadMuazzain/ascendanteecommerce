import fs from "fs";
import os from "os";
import path from "path";
import { VideoSchema } from "@/types/segment";
import { CharacterAdServices } from "../services";
import { db } from "@/lib/database";
import { fileUrlToBuffer } from "../../common/utils/common";
import { generateId } from "@/utils/id";
import { nanoid } from "nanoid";
import { getVideoDuration, getLastFrameFromVideo } from "../../../services/ffmpeg";
import { buildCharacterAdNegativePrompt } from "../prompts";

/**
 * Stage 2: Generate natively lip-synced video clips from Veo 3.1 Fast.
 * Each segment contains dialogue and a link to a character with a base image.
 * Image-to-Video is used to maintain character consistency based on the seed image.
 */
/**
 * Extracts the last frame of a video from a given URL and uploads it to R2.
 */
export const extractLastFrameFromVideoUrl = async (
  videoUrl: string,
  schemaId: string,
  segmentId: string,
  r2: any,
) => {
  console.log(`[Veo] Extracting last frame from: ${videoUrl}`);

  const response = await fetch(videoUrl);
  const buffer = Buffer.from(await response.arrayBuffer());

  const tempDir = os.tmpdir();
  const downloadedFileName = `temp-extract-${nanoid()}.mp4`;
  const downloadedPath = path.join(tempDir, downloadedFileName);
  fs.writeFileSync(downloadedPath, buffer);

  try {
    const lastFrameBuffer = await getLastFrameFromVideo(downloadedPath, tempDir);
    const lastFrameR2Name = `character-driven-ad/${schemaId}/videos/${segmentId}/last-frame-${nanoid()}.png`;
    const lastFrameUrl = await r2.uploadData(lastFrameR2Name, lastFrameBuffer, "image/png");

    return { lastFrameUrl };
  } finally {
    if (fs.existsSync(downloadedPath)) {
      fs.unlinkSync(downloadedPath);
    }
  }
};

export const generateSegmentVideo = async (
  schemeId: string,
  scheme: VideoSchema,
  services: CharacterAdServices,
  runToken: string,
) => {
  const segments = scheme.segments || [];
  const characters = scheme.characters || [];
  const globalStyle = scheme.visuals.style;

  console.log(`[Character Orchestrator] Generating ${segments.length} lip-synced clips...`);

  const results = await Promise.all(
    segments.map(async (segment) => {
      const character = characters.find((c) => c.id === segment.characterId);

      if (!character) {
        console.warn(`Missing character config for segment ${segment.id}`);
        return { id: segment.id, success: false };
      }

      console.log(`Generating Veo 3.1 clips for: ${segment.id} (Character: ${character.name})`);

      const updatedShots = [];
      let previousLastFrameUrl: string | undefined = undefined;

      // Generate shots sequentially so we can extract the last frame of shot[n-1] to use for shot[n]
      for (let shotIndex = 0; shotIndex < (segment.shots || []).length; shotIndex++) {
        const shot = segment.shots![shotIndex];
        const rawDuration = shot.duration ? shot.duration / 1000 : 8;
        // Snap to Veo 3.1 Fast supported values: [4, 6, 8]
        let requestedDuration = 8;
        if (rawDuration <= 4) requestedDuration = 4;
        else if (rawDuration <= 6) requestedDuration = 6;
        else requestedDuration = 8;

        const characterDesc = character.visualDescription?.trim() || `${character.role} character`;
        const shotPrompt =
          shot.videoPrompt ||
          `${globalStyle}, ${characterDesc}, ${segment.emotion || "natural"} expression, cinematic lighting`;

        const finalPrompt = `${shotPrompt}

DIALOGUE: "${shot.words}"
VOICE: ${character.voiceDescription || "natural, friendly"}`.trim();

        console.log(
          `Generating Veo 3.1 clip for shot ${shotIndex}: ${shot.words?.slice(0, 30)}... (${requestedDuration}s)`,
        );
        console.log("final prompt", finalPrompt);
        let generatorParams: any = {
          prompt: finalPrompt,
          negativePrompt: buildCharacterAdNegativePrompt(),
          style: globalStyle,
          aspectRatio: scheme.aspectRatio,
          durationSeconds: requestedDuration,
        };

        if (shotIndex === 0) {
          // First shot in the segment: Use the generated seed image or Product Assets.
          if (shot.type === "product") {
            const productAssetUrl = scheme.assets?.[0]?.url;
            const productAssetUrl2 = scheme.assets?.[1]?.url;
            const refs = [productAssetUrl, productAssetUrl2, shot.imageUrl].filter(
              Boolean,
            ) as string[];
            if (refs.length > 0) {
              generatorParams.referenceImageUrls = refs;
            } else {
              generatorParams.firstFrameUrl = shot.imageUrl;
            }
          } else {
            generatorParams.firstFrameUrl = shot.imageUrl;
          }
        } else {
          // Continuation shot: Strictly use the extracted last frame of the previous video.
          // This ensures perfect visual continuity aligned with the smart prompts we generated.
          generatorParams.firstFrameUrl = previousLastFrameUrl;
        }

        const generatorOutput = await services.videoGenerator.create(generatorParams);
        const finalVideoUrl =
          typeof generatorOutput === "string" ? generatorOutput : generatorOutput.url;

        // Convert output to buffer and upload to R2
        const { buffer, contentType } = await fileUrlToBuffer(finalVideoUrl);

        const tempPath = path.join(os.tmpdir(), `veo-clip-${generateId(8)}.mp4`);
        fs.writeFileSync(tempPath, buffer);
        const realDuration = await getVideoDuration(tempPath);
        const realDurationMs = Math.round(realDuration * 1000);
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

        const storagePath = `character-driven-ad/${schemeId}/videos/${segment.id}-${generateId(4)}.mp4`;
        const videoUrl = await services.r2.uploadData(storagePath, buffer, contentType);

        // Extract the last frame for the NEXT shot to use
        const { lastFrameUrl } = await extractLastFrameFromVideoUrl(
          videoUrl,
          schemeId,
          segment.id,
          services.r2,
        );
        previousLastFrameUrl = lastFrameUrl;

        updatedShots.push({
          ...shot,
          videoUrl,
          duration: realDurationMs,
          display: {
            from: shot.display?.from || 0,
            to: (shot.display?.from || 0) + realDurationMs,
          },
        });
      }

      // Calculate total segment duration from individual shots
      const totalDurationMs = updatedShots.reduce((acc, s: any) => acc + (s.duration || 0), 0);

      // Persist the generated clips to the database via segment_data JSONB
      await db
        .updateTable("segments")
        .set({
          segment_data: {
            ...segment,
            status: "ready",
            duration: totalDurationMs,
            estimatedDuration: totalDurationMs / 1000,
            shots: updatedShots,
          },
          updated_at: new Date(),
        })
        .where("id", "=", segment.id)
        .execute();

      return {
        id: segment.id,
        success: true,
        shots: updatedShots,
        duration: totalDurationMs,
        characterName: character.name,
      };
    }),
  );

  return results;
};
