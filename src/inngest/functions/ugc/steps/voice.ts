import fs from "fs";
import path from "path";
import os from "os";
import { nanoid } from "nanoid";
import { db } from "@/lib/database";
import { UgcServices } from "../index";
import { ffmpegAsync } from "../../../services/ffmpeg";

export const selectVoiceCandidates = async (segments: any[], services: UgcServices) => {
  if (!segments || segments.length === 0) throw new Error("No segments found");

  const geminiService = services.gemini;
  const candidates: { index: number; segment: any; videoUrl: string }[] = [];

  for (const segment of segments) {
    const sd = segment.segment_data as any;
    const videoAsset = (sd.assets || sd.shots)?.find(
      (a: any) => a.type === "video" && a.active === true && a.status === "completed",
    );
    if (videoAsset) {
      candidates.push({
        index: candidates.length,
        segment,
        videoUrl: videoAsset.videoUrl,
      });
    }
    if (candidates.length >= 5) break;
  }

  if (candidates.length === 0) throw new Error("No segments with completed videos found");

  console.log(
    `[Voice Selection] Sending ${candidates.length} candidates to Gemini for comparative analysis...`,
  );

  const bestIndex = await geminiService.selectBestVoiceFromVideos(
    candidates.map((c) => ({ index: c.index, url: c.videoUrl })),
  );

  console.log(`[Voice Selection] Gemini selected candidate index ${bestIndex}`);

  return candidates
    .map((c) => ({
      id: c.segment.id,
      videoUrl: c.videoUrl,
      text: (c.segment.segment_data as any).text,
      isBest: c.index === bestIndex,
    }))
    .sort((a, b) => (a.isBest ? -1 : b.isBest ? 1 : 0));
};

const cleanupOldVoices = async (elevenlabs: any) => {
  try {
    const listResponse = await elevenlabs.voices.getAll();
    const clonedVoices = (listResponse.voices || []).filter(
      (v: any) => v.category === "cloned" || v.category === "generated",
    );

    console.log(`[ElevenLabs] Current cloned voices: ${clonedVoices.length}`);

    if (clonedVoices.length >= 28) {
      // Delete the 5 oldest voices to make room
      const voicesToDelete = clonedVoices.slice(0, 5);
      console.log(
        `[ElevenLabs] Limit approaching. Deleting ${voicesToDelete.length} oldest cloned voices...`,
      );
      for (const voice of voicesToDelete) {
        try {
          await elevenlabs.voices.delete(voice.voiceId);
        } catch (e) {
          console.warn(`[ElevenLabs] Failed to delete voice ${voice.voiceId}:`, e);
        }
      }
    }
  } catch (err) {
    console.error("[ElevenLabs] Failed to cleanup old voices:", err);
  }
};

export const cloneVoice = async (bestVoiceSourceUrl: string, services: UgcServices) => {
  const elevenlabs = services.elevenlabs;

  // Cleanup old voices before creating a new one to avoid limit errors
  await cleanupOldVoices(elevenlabs);

  const tmpDir = os.tmpdir();
  const videoId = nanoid();
  const videoPath = path.join(tmpDir, `input-${videoId}.mp4`);
  const audioPath = path.join(tmpDir, `audio-${videoId}.mp3`);
  const loopedAudioPath = path.join(tmpDir, `looped-${videoId}.mp3`);

  const response = await fetch(bestVoiceSourceUrl);
  const buffer = await response.arrayBuffer();
  fs.writeFileSync(videoPath, Buffer.from(buffer));

  await ffmpegAsync(["-y", "-i", videoPath, "-vn", "-acodec", "libmp3lame", audioPath]);

  await ffmpegAsync(["-y", "-stream_loop", "2", "-i", audioPath, "-c", "copy", loopedAudioPath]);

  const audioFile = new File([fs.readFileSync(loopedAudioPath)], "sample.mp3", {
    type: "audio/mpeg",
  });

  const cloneResponse = await elevenlabs.voices.ivc.create({
    name: `Cloned-${nanoid(5)}`,
    files: [audioFile],
    removeBackgroundNoise: true,
  });

  [videoPath, audioPath, loopedAudioPath].forEach((p) => {
    if (fs.existsSync(p)) fs.unlinkSync(p);
  });

  return cloneResponse.voiceId;
};

export const processStsSegment = async (
  segment: any,
  clonedVoiceId: string,
  projectId: string,
  services: UgcServices,
) => {
  const elevenlabs = services.elevenlabs;
  const r2 = services.r2;

  const segmentData = segment.segment_data as any;
  const videoAsset =
    (segmentData.assets || segmentData.shots)?.find(
      (a: any) =>
        a.type === "video" && a.active === true && a.status === "completed" && !a.isAligned,
    ) ||
    (segmentData.assets || segmentData.shots)?.find(
      (a: any) => a.type === "video" && a.status === "completed" && !a.isAligned,
    );

  if (!videoAsset || !videoAsset.videoUrl) return segment;

  const tmpDir = os.tmpdir();
  const inputVideoPath = path.join(tmpDir, `input-seg-${segment.id}.mp4`);
  const mergedVideoPath = path.join(tmpDir, `merged-seg-${segment.id}.mp4`);
  const originalAudioPath = path.join(tmpDir, `audio-seg-${segment.id}.mp3`);
  const newAudioPath = path.join(tmpDir, `new-audio-seg-${segment.id}.mp3`);

  const videoResponse = await fetch(videoAsset.videoUrl);
  fs.writeFileSync(inputVideoPath, Buffer.from(await videoResponse.arrayBuffer()));

  await ffmpegAsync([
    "-y",
    "-i",
    inputVideoPath,
    "-vn",
    "-acodec",
    "libmp3lame",
    originalAudioPath,
  ]);

  let stsResponse;
  try {
    stsResponse = await elevenlabs.speechToSpeech.convert(clonedVoiceId, {
      audio: fs.createReadStream(originalAudioPath) as any,
      modelId: "eleven_multilingual_sts_v2",
      outputFormat: "mp3_44100_128",
      removeBackgroundNoise: true,
    });

    const chunks = [];
    // @ts-ignore
    for await (const chunk of stsResponse as any) {
      chunks.push(chunk);
    }
    fs.writeFileSync(newAudioPath, Buffer.concat(chunks));
  } catch (err: any) {
    console.error(`[ElevenLabs STS] Failed for segment ${segment.id}:`, err);

    // Handle 403/Authorization Error specifically by falling back to original audio
    if (err.statusCode === 403 || err.body?.detail?.type === "authorization_error") {
      console.warn(`[ElevenLabs STS] Voice denied for segment ${segment.id}.`);

      [inputVideoPath, originalAudioPath].forEach((p) => {
        if (fs.existsSync(p)) fs.unlinkSync(p);
      });

      // Throw a specific error that the orchestrator can catch and use to trigger a retry with a different voice
      throw new Error("VOICE_ACCESS_DENIED");
    }
    throw err; // Re-throw other errors
  }

  await ffmpegAsync([
    "-y",
    "-i",
    inputVideoPath,
    "-i",
    newAudioPath,
    "-c:v",
    "copy",
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-shortest",
    mergedVideoPath,
  ]);

  const mergedUrl = await r2.uploadData(
    `projects/${projectId}/videos/${segment.id}-aligned.mp4`,
    fs.readFileSync(mergedVideoPath),
    "video/mp4",
  );

  let captionUrl = "";
  let duration = 0;
  try {
    const newAudioUrl = await r2.uploadData(
      `projects/${projectId}/audio/${segment.id}-sts.mp3`,
      fs.readFileSync(newAudioPath),
      "audio/mp3",
    );
    const { success, data } = await services.stt.transcribeV2(newAudioUrl);
    if (success && data?.duration) {
      duration = data.duration;
      captionUrl = await r2.uploadJson(
        `projects/${projectId}/captions/${segment.id}-sts.json`,
        data.transcript,
      );
    }
  } catch (err) {
    console.error("Failed to transcribe STS audio for B-roll timing:", err);
  }

  const newVideoAsset = {
    id: nanoid(),
    type: "video",
    videoUrl: mergedUrl,
    status: "completed",
    active: true,
    isAligned: true,
  };

  const updatedAssets = [
    ...(segmentData.assets || [])
      .filter((a: any) => !a.isAligned)
      .map((a: any) => ({
        ...a,
        active: a.type === "video" || a.type === "audio" ? false : a.active,
      })),
    newVideoAsset,
  ];

  const updatedShots = updatedAssets
    .filter((a: any) => a.active)
    .map((a: any) => {
      // Find the original shot from generated prompts to preserve metadata
      const originalShot =
        (segmentData.shots || []).find((s: any) => s.id === a.id) || segmentData.shots?.[0] || {};

      const shotDuration = Math.round(duration * 1000);

      return {
        ...originalShot,
        ...a,
        id: a.id || originalShot.id || nanoid(),
        category: originalShot.category || "Avatar",
        display: { from: 0, to: shotDuration },
        duration: shotDuration,
        imageUrl: a.imageUrl || originalShot.imageUrl || null,
        videoUrl: a.videoUrl || originalShot.videoUrl || null,
        prompt: originalShot.prompt || originalShot.videoPrompt || originalShot.scenePrompt || "",
        type: originalShot.type || "product",
        words: originalShot.words || segmentData.text || "",
      };
    });

  const { bRolls: _oldBRolls, ...segmentDataWithoutBrolls } = segmentData;

  const updatedData = {
    ...segmentDataWithoutBrolls,
    duration: Math.round(duration * 1000),
    assets: updatedAssets,
    shots: updatedShots,
    bRolls: _oldBRolls || [],
    voiceId: clonedVoiceId,
  };

  await db
    .updateTable("segments")
    .set({ segment_data: updatedData })
    .where("id", "=", segment.id)
    .execute();

  [inputVideoPath, mergedVideoPath, originalAudioPath, newAudioPath].forEach((p) => {
    if (fs.existsSync(p)) fs.unlinkSync(p);
  });

  return {
    ...segment,
    segment_data: updatedData,
    captionUrl,
    duration: Math.round(duration * 1000),
    comparison: {
      original: videoAsset.url,
      updated: mergedUrl,
    },
  };
};
