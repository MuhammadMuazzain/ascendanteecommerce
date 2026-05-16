import { createClient } from "@deepgram/sdk";
import { deepgramToCombo } from "./deepgram-to-combo";
import type { TranscriptObject } from "./types";

export interface TranscribeOptions {
  /**
   * Audio URL to transcribe
   */
  url: string;

  /**
   * API key for Deepgram (optional, defaults to env variable)
   */
  apiKey?: string;

  /**
   * Target language for transcription (optional)
   * If not provided, will auto-detect
   */
  language?: string;

  /**
   * Deepgram model to use (optional, defaults to "nova-3")
   */
  model?: string;

  /**
   * Whether to enable smart formatting (optional, defaults to true)
   */
  smartFormat?: boolean;

  /**
   * Whether to include paragraphs in the result (optional, defaults to true)
   */
  paragraphs?: boolean;

  /**
   * Whether to include word-level timestamps (optional, defaults to true)
   */
  words?: boolean;
}

/**
 * Transcribe audio from a URL using Deepgram
 *
 * @param options - Transcription options
 * @returns Parsed transcription result in Combo format
 *
 * @example
 * ```typescript
 * const result = await transcribe({
 *   url: "https://example.com/audio.mp3",
 *   language: "en"
 * });
 * ```
 */
export async function transcribe(options: TranscribeOptions): Promise<Partial<TranscriptObject>> {
  const {
    url,
    apiKey = process.env.DEEPGRAM_API_KEY || process.env.DEPPGRAM_KEY,
    language,
    model = "nova-3",
    smartFormat = true,
    paragraphs = true,
    words = true,
  } = options;

  if (!url) {
    throw new Error("Audio URL is required");
  }

  if (!apiKey) {
    throw new Error("Deepgram API key is required");
  }

  // Create Deepgram client
  const deepgram = createClient(apiKey);

  // Build Deepgram options
  const deepgramOptions: any = {
    model,
    smart_format: smartFormat,
    paragraphs,
    detect_language: true,
  };

  // Add language if provided
  if (language && language !== "auto") {
    deepgramOptions.language = language;
  }

  // Transcribe audio — retry up to 3 times if Deepgram returns empty words
  // (known intermittent issue: speech is present but words array comes back empty)
  const MAX_RETRIES = 3;
  let result: any = null;
  let lastError: any = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const { result: dgResult, error } = await deepgram.listen.prerecorded.transcribeUrl(
      { url },
      deepgramOptions,
    );

    if (error) {
      lastError = error;
      console.warn(
        `[transcribe] Attempt ${attempt}/${MAX_RETRIES} failed with error: ${error.message}`,
      );
      if (attempt < MAX_RETRIES) await new Promise((r) => setTimeout(r, 1500 * attempt));
      continue;
    }

    const words = dgResult?.results?.channels?.[0]?.alternatives?.[0]?.words ?? [];
    if (words.length === 0 && attempt < MAX_RETRIES) {
      console.warn(
        `[transcribe] Attempt ${attempt}/${MAX_RETRIES} returned empty words for ${url}, retrying...`,
      );
      await new Promise((r) => setTimeout(r, 1500 * attempt));
      continue;
    }

    result = dgResult;
    break;
  }

  if (!result) {
    throw new Error(lastError?.message || "Failed to transcribe audio after retries");
  }

  // Convert Deepgram result to Combo format
  const parsed = await deepgramToCombo(result);

  return parsed;
}

// Export types
export * from "./types";
export { deepgramToCombo } from "./deepgram-to-combo";
export { detectLanguage } from "./detect-language";
