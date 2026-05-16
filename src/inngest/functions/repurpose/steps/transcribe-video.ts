import { transcribe } from "@/lib/transcribe";
import type { Paragraph, Word } from "@/lib/transcribe/types";

export interface TranscribeVideoOptions {
  /** Public URL of the video to transcribe (can be the R2 URL) */
  url: string;
}

export interface TranscribeVideoResult {
  paragraphs: Paragraph[];
  words: Word[];
  fullText: string;
  duration: number;
}

/**
 * Transcribes the video audio using Deepgram and returns time-aligned paragraphs.
 */
export async function transcribeVideo({
  url,
}: TranscribeVideoOptions): Promise<TranscribeVideoResult> {
  const result = await transcribe({
    url,
    model: "nova-3",
    paragraphs: true,
    words: true,
    smartFormat: true,
  });

  const paragraphs = result.results?.main?.paragraphs ?? [];
  const words = result.results?.main?.words ?? [];
  const fullText = result.results?.main?.text ?? "";
  const duration = result.duration ?? 0;

  return { paragraphs, words, fullText, duration };
}
