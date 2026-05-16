export interface VisualPrompt {
  segmentId: string;
  shots: {
    type: "product" | "generic" | "lifestyle" | "medical_cgi" | "metaphor" | "b-roll";
    category?: string;
    words: string;
    firstFramePrompt?: string;
    videoPrompt?: string;
    scenePrompt?: string;
  }[];
}

export type GeminiModel =
  | "gemini-3-pro-preview"
  | "gemini-2.5-flash-image"
  | "gemini-3.1-flash-image-preview"
  | "gemini-2.5-pro"
  | "gemini-2.5-flash"
  | "gemini-2.5-flash-lite";

export interface BatchTimingResponse {
  segments: {
    segmentId: string;
    shots: {
      start: number;
      end: number;
    }[];
    bRolls: {
      originalIndex: number;
      start: number;
      end: number;
    }[];
  }[];
}
