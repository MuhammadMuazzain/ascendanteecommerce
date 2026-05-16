import type { Schema, Segment } from "../schema-generator";
import { TranscriptObject } from "../transcribe";

export interface AudioData {
  url: string;
  blob: Blob;
}

export interface MediaAsset {
  url: string;
  thumbnail?: string;
  duration?: number;
  photographer?: string;
  alt?: string;
  type: "image" | "video";
}

export interface ResolvedSegment extends Segment {
  // All properties inherited from Segment
  // audioUrl, audioDuration, audioBlob, media, transcription are optional in base Segment
}

export interface ResolvedSchema extends Omit<Schema, "segments"> {
  segments: ResolvedSegment[];
}

export interface ResolverOptions {
  voiceId?: string;
  onProgress?: (progress: { current: number; total: number; message: string }) => void;
  onError?: (error: Error, segment?: Segment) => void;
  skipTranscription?: boolean;
  maxMediaPerSegment?: number;
}
