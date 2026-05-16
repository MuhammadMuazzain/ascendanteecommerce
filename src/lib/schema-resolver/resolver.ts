import { getAudioInfo } from "@/utils/get-audio-info";
import type { Schema } from "../schema-generator";
import type {
  ResolvedSchema,
  ResolvedSegment,
  ResolverOptions,
  AudioData,
  MediaAsset,
} from "./types";

// ============================================================================
// AUDIO GENERATION
// ============================================================================

/**
 * Generates audio for a segment using text-to-speech
 */
async function generateAudio(text: string, voiceId: string): Promise<AudioData> {
  const response = await fetch("/api/text-to-speech", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: text.trim(),
      voiceId,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to generate audio: ${response.status}`);
  }

  const audioBlob = await response.blob();

  if (audioBlob.size === 0) {
    throw new Error("Received empty audio file");
  }

  const audioUrl = URL.createObjectURL(audioBlob);

  return {
    url: audioUrl,
    blob: audioBlob,
  };
}

/**
 * Uploads audio blob to server and returns public URL
 */
async function uploadAudio(audioBlob: Blob): Promise<string> {
  if (!audioBlob || audioBlob.size === 0) {
    throw new Error("Invalid audio blob provided");
  }

  const audioFile = new File([audioBlob], `audio_${Date.now()}.mp3`, {
    type: "audio/mpeg",
  });

  // Step 1: Get presigned URL
  const presignResponse = await fetch("/api/uploads/presign", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId: "PJ1nkaufw0hZPyhN7bWCP",
      fileNames: [audioFile.name],
    }),
  });

  if (!presignResponse.ok) {
    const errorData = await presignResponse.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to get presigned URL: ${presignResponse.status}`);
  }

  const { uploads } = await presignResponse.json();
  if (!uploads || uploads.length === 0) {
    throw new Error("No presigned URL returned");
  }

  const uploadInfo = uploads[0];

  // Step 2: Upload file to presigned URL
  const uploadResponse = await fetch(uploadInfo.presignedUrl, {
    method: "PUT",
    headers: {
      "Content-Type": uploadInfo.contentType,
    },
    body: audioFile,
  });

  if (!uploadResponse.ok) {
    throw new Error(`Failed to upload audio: ${uploadResponse.status}`);
  }

  // Step 3: Return the public URL
  if (!uploadInfo.url) {
    throw new Error("No URL returned from upload");
  }

  return uploadInfo.url;
}

/**
 * Transcribes audio from a public URL
 */
async function transcribeAudio(audioUrl: string, language?: string): Promise<any> {
  if (!audioUrl) {
    throw new Error("Audio URL is required for transcription");
  }

  const response = await fetch("/api/transcribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: audioUrl,
      targetLanguage: language || "en",
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || errorData.message || `Failed to transcribe audio: ${response.status}`,
    );
  }

  const data = await response.json();
  return data;
}

// ============================================================================
// MEDIA FETCHING
// ============================================================================

/**
 * Fetches media assets (images/videos) for a segment
 */
async function fetchMediaAssets(searchQuery: string, maxAssets = 5): Promise<MediaAsset[]> {
  const response = await fetch("/api/get-media-assets", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ script: searchQuery }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch media: ${response.status}`);
  }

  const data = await response.json();

  if (!data || !Array.isArray(data.segments)) {
    throw new Error("Invalid media response format");
  }

  const segmentData = data.segments[0] || { images: [], videos: [] };

  const media = [];

  // Add videos
  if (Array.isArray(segmentData.videos)) {
    media.push(
      ...segmentData.videos.slice(0, maxAssets).map(
        (video: any): MediaAsset => ({
          url: video.url,
          thumbnail: video.thumbnail,
          duration: video.duration,
          photographer: video.photographer,
          type: "video",
        }),
      ),
    );
  }

  // Add images if we need more assets
  if (media.length < maxAssets && Array.isArray(segmentData.images)) {
    const remainingSlots = maxAssets - media.length;
    media.push(
      ...segmentData.images.slice(0, remainingSlots).map(
        (image: any): MediaAsset => ({
          url: image.url,
          photographer: image.photographer,
          alt: image.alt,
          type: "image",
        }),
      ),
    );
  }

  return media;
}

// ============================================================================
// SEGMENT RESOLUTION
// ============================================================================

/**
 * Resolves a single segment by generating audio and fetching media
 */
async function resolveSegment(
  segment: any,
  voiceId: string,
  options: ResolverOptions = {},
): Promise<ResolvedSegment> {
  const { skipTranscription = false, maxMediaPerSegment = 5, onProgress } = options;

  // Generate audio
  onProgress?.({
    current: 0,
    total: 3,
    message: `Generating audio for: "${segment.text.substring(0, 50)}..."`,
  });

  const audioData = await generateAudio(segment.text, voiceId);

  // Get audio duration
  let audioDuration: number;
  try {
    const audioInfo = await getAudioInfo(audioData.url);
    audioDuration = audioInfo.duration;
  } catch (error) {
    console.warn("Failed to get audio duration, using text-based estimate");
    // Fallback: estimate based on text length (rough approximation)
    audioDuration = Math.max(segment.text.length * 100, 2000);
  }

  // Fetch media assets
  onProgress?.({
    current: 1,
    total: 3,
    message: `Fetching media for: "${segment.searchQuery}"`,
  });

  const media = await fetchMediaAssets(segment.searchQuery || segment.text, maxMediaPerSegment);

  // Upload and transcribe audio if needed
  let publicAudioUrl: string | undefined;
  let transcription: any | undefined;

  if (!skipTranscription) {
    onProgress?.({
      current: 2,
      total: 3,
      message: "Uploading and transcribing audio...",
    });

    try {
      // Upload audio to get public URL
      publicAudioUrl = await uploadAudio(audioData.blob);

      // Transcribe using the public URL
      transcription = await transcribeAudio(publicAudioUrl);

      // Update duration from transcription if available (more accurate)
      if (transcription?.duration) {
        audioDuration = transcription.duration * 1000; // Convert to milliseconds
      }
    } catch (error) {
      console.warn("Upload/transcription failed, continuing without it:", error);
    }
  }

  return {
    ...segment,
    audioUrl: publicAudioUrl || audioData.url,
    audioDuration,
    audioBlob: audioData.blob,
    media,
    transcription,
  };
}

// ============================================================================
// SCHEMA RESOLUTION
// ============================================================================

/**
 * Resolves a schema by processing all segments
 */
async function resolveSchema(
  schema: Schema,
  options: ResolverOptions = {},
): Promise<ResolvedSchema> {
  const { onProgress, onError } = options;

  const voiceId = schema.voice?.id;

  if (!voiceId) {
    throw new Error("Voice ID is required to resolve schema");
  }

  const resolvedSegments: ResolvedSegment[] = [];
  const segments = schema.segments || [];
  const totalSegments = segments.length;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];

    try {
      onProgress?.({
        current: i,
        total: totalSegments,
        message: `Processing segment ${i + 1} of ${totalSegments}`,
      });

      const resolvedSegment = await resolveSegment(segment, voiceId, options);
      resolvedSegments.push(resolvedSegment);
    } catch (error) {
      console.error(`Error resolving segment ${i}:`, error);

      if (onError) {
        onError(error as Error, segment);
      } else {
        // Re-throw if no error handler provided
        throw error;
      }
    }
  }

  onProgress?.({
    current: totalSegments,
    total: totalSegments,
    message: "Schema resolution complete",
  });

  return {
    ...schema,
    segments: resolvedSegments,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default resolveSchema;
export { generateAudio, uploadAudio, transcribeAudio, fetchMediaAssets, resolveSegment };
