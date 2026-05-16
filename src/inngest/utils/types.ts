import { PromptConfig, Segment, VideoSchema, VisualBroll, VisualShot } from "@/types/segment";

export type { PromptConfig, Segment, VideoSchema, VisualShot };

export enum ToastType {
  STEP_START = "step_start",
  STEP_END = "step_end",
  FUNCTION_COMPLETE = "function_complete",
  FUNCTION_ERROR = "function_error",
  INFO = "info",
}

//=========================TYPES=========================//
export interface GeneratedMedia {
  type: string;
  src: string;
  filePath: string;
  preview: string;
  duration: number;
  startPause?: number; // pause before this media starts (in seconds)
  srcExpand?: string; // expanded version of the image (for AI images)
}

export interface MediaMetadata {
  audioUrl: string;
  captionUrl: string;
  duration: number;
  originalDuration: number;
  startPause: number; // pause before segment starts (in seconds)
  endPause: number; // pause after segment ends (in seconds)
  assets?: SegmentAsset[];
  shots?: VisualShot[];
  textToSpeech?: any;
  speechToText?: any;
}

export interface SegmentAsset {
  id: string;
  type: "image" | "video" | "audio" | "transcript" | "lip-sync";
  url?: string;
  status: "generating" | "completed" | "failed";
  active?: boolean;
  inputUrls?: string[];
  prompt?: string;
}

export interface VideoSegment extends MediaMetadata {
  id: string;
  generatedMedia: GeneratedMedia[];
  preview?: string;
}

export interface PriceItem {
  service: string;
  type: string;
  price: number;
}

export const transcriptionSchema = {
  type: "OBJECT",
  description: "A word-by-word transcription of the audio, including timestamps.",
  properties: {
    transcript: {
      type: "ARRAY",
      description: "An array where each element is a transcribed word with its start and end time.",
      items: {
        type: "OBJECT",
        properties: {
          word: {
            type: "STRING",
            description: "The transcribed word.",
          },
          start_time: {
            type: "NUMBER",
            description: "Start time of the word in seconds.",
          },
          end_time: {
            type: "NUMBER",
            description: "End time of the word in seconds.",
          },
        },
        required: ["word", "start_time", "end_time"], // Ensure these keys are always present
      },
    },
    duration: {
      // Añadimos la duración del audio aquí
      type: "NUMBER",
      description: "Total duration of the audio in seconds.",
    },
  },
  required: ["transcript", "duration"],
};
