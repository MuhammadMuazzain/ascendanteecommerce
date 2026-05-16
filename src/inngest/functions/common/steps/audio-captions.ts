import { db } from "@/lib/database";
import { generateId } from "@/utils/id";
import { VOICEOVER_PAUSE, VOICEOVER_INIT_PAUSE } from "@/inngest/utils/constant";
import { ServicePricing } from "@/inngest/utils/pricing";
import { buildMiniTranscribe, convertSecondsToMs, safeUpstashCall } from "@/inngest/utils/common";
import {
  Segment,
  MediaMetadata,
  PriceItem,
  VideoSegment,
  SegmentAsset,
} from "@/inngest/utils/types";
import {
  calcProgress,
  downloadVideo,
  fileUrlToBuffer,
} from "@/inngest/functions/common/utils/common";
import { StepContext } from "./types";
import { persistAsset } from "@/inngest/functions/common/steps/utils";
import os from "os";

export const processAudioAndCaptions = async (
  context: StepContext,
  userId: string | null,
  projectId: string | null,
): Promise<{
  mediaMetadata: Record<string, MediaMetadata>;
  outputData: VideoSegment[];
  prices: PriceItem[];
  assets: SegmentAsset[];
  segmentAssets: Record<
    string,
    {
      assets: SegmentAsset[];
      textToSpeech?: { refId: string; src: string; duration: number };
      speechToText?: { refId: string; src: string };
    }
  >;
}> => {
  const { services, schemeId, scheme } = context;
  const tmpDir = os.tmpdir();
  const mediaMetadata: Record<string, MediaMetadata> = {};

  let assets = new Array<SegmentAsset>();
  const segmentAssets: Record<
    string,
    {
      assets: SegmentAsset[];
      textToSpeech?: { refId: string; src: string; duration: number };
      speechToText?: { refId: string; src: string };
    }
  > = {};

  let currentVoiceId = scheme.voice.id;
  if (!currentVoiceId && scheme.voice.url) {
    console.log(`[TTS] Cloning custom voice from URL: ${scheme.voice.url}`);
    try {
      const { buffer: voiceBuffer, extension } = await fileUrlToBuffer(scheme.voice.url);
      currentVoiceId = await services.tts.cloneVoice(
        scheme.voice.name || "Custom Voice",
        voiceBuffer,
        `clone-audio.${extension}`,
        `Cloned for project ${schemeId}`,
      );
      console.log(`[TTS] Successfully cloned voice. New ID: ${currentVoiceId}`);
    } catch (err) {
      console.error("[TTS] Failed to clone voice:", err);
      throw new Error("Failed to clone custom voice");
    }
  }

  if (!currentVoiceId) {
    throw new Error("No voice ID available for TTS");
  }

  const processTTS = async (seg: Segment): Promise<string> => {
    return await safeUpstashCall(async () => {
      let asset: SegmentAsset = {
        id: generateId(),
        type: "audio",
        status: "generating",
      };
      const { success, buffer } = await services.tts.synthesize(seg.text || "", currentVoiceId);

      if (!success) throw new Error("TTS failed");

      const filePath = `VIDEOS/${schemeId}/${seg.id}/AUDIO/${generateId()}.mp3`;
      const url = await services.storage.uploadData(filePath, Buffer.from(buffer));
      console.log("audio url", { url });
      asset = { ...asset, url, status: "completed" };
      await persistAsset(userId, projectId, schemeId, filePath, url, {
        sourceType: "ai_generated",
        assetType: "audio",
        audioSubtype: "voiceover",
        originalFilename: `voice_${seg.id}.mp3`,
      });

      if (!segmentAssets[seg.id]) segmentAssets[seg.id] = { assets: [] };
      segmentAssets[seg.id].assets.push(asset);
      assets.push(asset);

      return url;
    });
  };

  const processSTT = async (
    seg: Segment,
    audioUrl: string,
  ): Promise<{ captionUrl: string; duration: number }> => {
    let asset: SegmentAsset = {
      id: generateId(),
      type: "transcript",
      status: "generating",
    };
    console.log(`[STT] Transcribing audio for segment ${seg.id}`);
    console.log(`[STT] Audio URL: ${audioUrl}`);
    const { success, data } = await services.stt.transcribeV2(audioUrl);
    if (success && data?.duration) {
      const captionUrl = await services.storage.uploadJson(
        `VIDEOS/${schemeId}/${seg.id}/CAPTION/${generateId()}.json`,
        data.transcript,
      );

      asset = { ...asset, url: captionUrl, status: "completed" };
      if (!segmentAssets[seg.id]) segmentAssets[seg.id] = { assets: [] };
      segmentAssets[seg.id].assets.push(asset);
      assets.push(asset);

      return { captionUrl, duration: data.duration };
    }
    const filePath = await downloadVideo(audioUrl, tmpDir);
    const speechData = await services.openaiTranscriber.transcribeAudioWithTimestamps(filePath);
    const transcript = buildMiniTranscribe(speechData, speechData.duration);
    const captionUrl = await services.storage.uploadJson(
      `VIDEOS/${schemeId}/${seg.id}/CAPTION/${generateId()}.json`,
      transcript,
    );

    asset = { ...asset, url: captionUrl, status: "completed" };
    if (!segmentAssets[seg.id]) segmentAssets[seg.id] = { assets: [] };
    segmentAssets[seg.id].assets.push(asset);
    assets.push(asset);

    return { captionUrl, duration: speechData.duration };
  };

  const segments = scheme.segments;
  console.log({ segments });
  const promises = segments.map(async (seg, index) => {
    try {
      const audioUrl = await processTTS(seg);
      const { captionUrl, duration } = await processSTT(seg, audioUrl);

      const isFirstSegment = index === 0;
      const startPause = isFirstSegment ? VOICEOVER_INIT_PAUSE : VOICEOVER_PAUSE / 2;
      const endPause = VOICEOVER_PAUSE / 2;

      mediaMetadata[seg.id] = {
        audioUrl,
        captionUrl,
        duration: convertSecondsToMs(duration + startPause + endPause),
        originalDuration: convertSecondsToMs(duration),
        startPause: convertSecondsToMs(startPause),
        endPause: convertSecondsToMs(endPause),
        assets: segmentAssets[seg.id].assets || [],
      };

      // Populate textToSpeech and speechToText for the schema
      segmentAssets[seg.id].textToSpeech = {
        refId: generateId(),
        src: audioUrl,
        duration: convertSecondsToMs(duration),
      };
      segmentAssets[seg.id].speechToText = {
        refId: generateId(),
        src: captionUrl,
      };

      console.log(`[PREPROCESS] Successfully preprocessed segment ${seg.id}`);
    } catch (err) {
      console.error(`[PREPROCESS] Failed preprocessing segment ${seg.id}:`, err);
      throw err;
    }
  });

  await Promise.all(promises);

  const totalLength = segments.reduce((acc, obj) => acc + (obj.text?.length || 0), 0);
  const costTTS = totalLength * ServicePricing.TEXT_TO_SPEECH;

  const totalDuration = Object.values(mediaMetadata).reduce(
    (acc, segData) => acc + segData.duration,
    0,
  );
  const costSTT = totalDuration * ServicePricing.SPEECH_TO_TEXT;

  const prices: PriceItem[] = [
    { service: "Elevenlabs", type: "text_to_speech", price: costTTS },
    { service: "Deepgram", type: "speech_to_text", price: costSTT },
  ];

  const outputUpdate: VideoSegment[] = [];
  for (const seg of segments) {
    const sd = mediaMetadata[seg.id];
    if (!sd) {
      console.warn(`[PIPELINE] Skipping segment ${seg.id} in DB update due to missing metadata`);
      continue;
    }
    outputUpdate.push({
      id: seg.id,
      generatedMedia: [],
      captionUrl: sd.captionUrl,
      audioUrl: sd.audioUrl,
      preview: "",
      duration: sd.duration, // milliseconds
      originalDuration: sd.originalDuration, // milliseconds
      startPause: sd.startPause, // milliseconds
      endPause: sd.endPause, // milliseconds
      assets: segmentAssets[seg.id]?.assets || [],
    });
  }
  console.log({ outputUpdate });

  const progress = calcProgress(1, segments.length);
  await db
    .updateTable("generations")
    .set({ output: JSON.stringify(outputUpdate), progress })
    .where("id", "=", schemeId)
    .execute();

  return {
    mediaMetadata,
    outputData: outputUpdate,
    prices,
    assets,
    segmentAssets,
  };
};
