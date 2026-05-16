import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import { CharacterAdServices } from "../services";
import { db } from "@/lib/database";

// Set ffmpeg path
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

interface Clip {
  id: string; // The physical shot string ID
  url: string;
  segmentId: string;
  shotIndex: number;
  refined?: boolean;
  effects?: { prompt: string; start: number; end: number }[];
  soundEffects?: { start: number; url: string; duration?: number }[];
}

/**
 * Refines the generated video clips by isolating and cleaning the audio,
 * and then adding AI-generated sound effects based on visual analysis.
 */
export async function refineCharacterClips(
  schemeId: string,
  clips: Clip[],
  services: CharacterAdServices,
  runToken: string,
): Promise<Clip[]> {
  const refinedClips: Clip[] = [];

  for (const clip of clips) {
    const tempDir = path.join(os.tmpdir(), `refine-${schemeId}-${runToken}`);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const inputVideoPath = path.join(tempDir, `input-${clip.id}.mp4`);
    const inputAudioPath = path.join(tempDir, `input-${clip.id}.mp3`);
    const paddedAudioPath = path.join(tempDir, `padded-${clip.id}.mp3`);
    const cleanAudioPath = path.join(tempDir, `clean-${clip.id}.mp3`);
    const outputVideoPath = path.join(tempDir, `output-${clip.id}.mp4`);

    try {
      // 1. Download original video
      const response = await fetch(clip.url);
      const buffer = await response.arrayBuffer();
      fs.writeFileSync(inputVideoPath, Buffer.from(buffer));

      // 2. Extract audio using ffmpeg
      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputVideoPath)
          .toFormat("mp3")
          .on("error", (err) => reject(new Error(`Failed to extract audio: ${err.message}`)))
          .on("end", () => resolve())
          .save(inputAudioPath);
      });

      // 3. Check duration and pad if less than 5 seconds because isolateAudio requires >= 5s
      let durationMs = 10000;
      try {
        durationMs = await new Promise<number>((resolve, reject) => {
          ffmpeg.ffprobe(inputAudioPath, (err, metadata) => {
            if (err) reject(err);
            else resolve((metadata.format?.duration || 0) * 1000);
          });
        });
      } catch (e) {
        console.warn(
          "[Refinement] ffprobe failed to get duration, proceeding without padding check",
        );
      }

      let audioToIsolatePath = inputAudioPath;

      if (durationMs > 0 && durationMs < 5000) {
        await new Promise<void>((resolve, reject) => {
          ffmpeg(inputAudioPath)
            .addOutputOption("-af", "apad,atrim=0:5") // Pad with silence up to 5s exactly
            .toFormat("mp3")
            .on("end", () => resolve())
            .on("error", (err) => reject(new Error(`Failed to pad audio: ${err.message}`)))
            .save(paddedAudioPath);
        });
        audioToIsolatePath = paddedAudioPath;
      }

      // 4. Isolate audio using ElevenLabs
      console.log(`[Refinement] Isolating audio for clip ${clip.id}...`);
      const audioBuffer = fs.readFileSync(audioToIsolatePath);
      const cleanAudioBuffer = await services.tts.isolateAudio(audioBuffer);

      if (!cleanAudioBuffer || cleanAudioBuffer.length < 100) {
        throw new Error("Isolated audio buffer is empty or too small");
      }

      fs.writeFileSync(cleanAudioPath, cleanAudioBuffer);
      console.log(
        `[Refinement] Audio isolated for ${clip.id}. Size: ${cleanAudioBuffer.length} bytes`,
      );

      // 5. Merge clean audio to synced visuals
      await new Promise<void>((resolve, reject) => {
        ffmpeg()
          .input(inputVideoPath)
          .input(cleanAudioPath)
          .outputOptions(["-map 0:v:0", "-map 1:a:0", "-c:v copy", "-c:a aac", "-shortest"])
          .on("error", (err) => reject(new Error(`Failed to merge clean audio: ${err.message}`)))
          .on("end", () => resolve())
          .save(outputVideoPath);
      });

      // 6. Upload finalized video to R2 (no SFX included here)
      const finalVideoBuffer = fs.readFileSync(outputVideoPath);
      const fileName = `character-ads/${schemeId}/final-${clip.id}-${runToken}.mp4`;
      const finalUrl = await services.r2.uploadData(fileName, finalVideoBuffer, "video/mp4");

      console.log(`[Refinement] Successfully refined clip ${clip.id}. Final URL: ${finalUrl}`);

      // 7. Update segments table immediately so UI can show progress
      const segmentRecord = await db
        .selectFrom("segments")
        .select("segment_data")
        .where("id", "=", clip.segmentId)
        .executeTakeFirst();

      if (segmentRecord) {
        const segData = segmentRecord.segment_data as any;
        const updatedShots = [...(segData.shots || [])];

        if (updatedShots[clip.shotIndex]) {
          updatedShots[clip.shotIndex] = {
            ...updatedShots[clip.shotIndex],
            videoUrl: finalUrl,
          };
        }

        const updatedSegData = {
          ...segData,
          shots: updatedShots,
        };

        await db
          .updateTable("segments")
          .set({
            segment_data: updatedSegData,
            updated_at: new Date(),
          })
          .where("id", "=", clip.segmentId)
          .execute();
      }

      refinedClips.push({
        ...clip,
        url: finalUrl,
        refined: true,
      });
    } catch (error) {
      console.error(`[Refinement/SFX Error] Clip ${clip.id}:`, error);
      // Fallback to original clip if anything fails
      refinedClips.push(clip);
    } finally {
      // Cleanup temp files
      try {
        [inputVideoPath, inputAudioPath, paddedAudioPath, cleanAudioPath, outputVideoPath].forEach(
          (p) => {
            if (fs.existsSync(p)) fs.unlinkSync(p);
          },
        );
      } catch (cleanupErr) {
        console.warn("[Refinement Cleanup Warning]:", cleanupErr);
      }
    }
  }

  return refinedClips;
}
