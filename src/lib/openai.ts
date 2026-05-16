import fs from "fs";

import OpenAI from "openai";
import type { OpenAITranscription } from "./transcribe";

interface TimestampedWord {
  word?: string;
  start?: number;
  end?: number;
  start_time?: number;
  end_time?: number;
}

export class OpenAIService {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string) {
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is required for transcription.");
    }
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async transcribeAudioWithTimestamps(filePath: string): Promise<OpenAITranscription> {
    try {
      const response = await this.client.audio.transcriptions.create({
        file: fs.createReadStream(filePath),
        model: this.model,
        response_format: "verbose_json",
        temperature: 0,
        timestamp_granularities: ["word"],
      });

      const words = (response.words as TimestampedWord[] | undefined) ?? [];
      const transcript = words
        .filter((word) => typeof word.word === "string")
        .map((word) => ({
          word: word.word as string,
          start_time:
            typeof word.start === "number"
              ? word.start
              : typeof word.start_time === "number"
                ? word.start_time
                : 0,
          end_time:
            typeof word.end === "number"
              ? word.end
              : typeof word.end_time === "number"
                ? word.end_time
                : typeof word.start === "number"
                  ? word.start
                  : 0,
        }));

      const reportedDuration =
        typeof response.duration === "number" ? response.duration : Number(response.duration) || 0;
      const inferredDuration =
        transcript.length > 0 ? transcript[transcript.length - 1].end_time : 0;

      return {
        transcript,
        duration: Math.max(reportedDuration, inferredDuration),
      };
    } catch (error) {
      console.error("OpenAI transcription failed:", error);
      throw new Error(
        "The model could not process the input audio. Please ensure the audio is clear and try again.",
      );
    }
  }
}
