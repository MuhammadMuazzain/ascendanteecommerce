import { deepgramToCombo } from "./deepgram-to-combo";
import { TranscriptObject } from "./types";

export class SttService {
  private apiKey: string;
  private params: string;
  private url: string;

  constructor(url: string, apiKey: string, model: string) {
    this.url = url;
    this.apiKey = apiKey;
    this.params = new URLSearchParams({
      model,
      smart_format: "true",
      filler_words: "false",
      punctuate: "true",
      detect_language: "true",
    }).toString();
  }

  async transcribe(
    audioUrl: string,
  ): Promise<{ transcript: Partial<TranscriptObject>; duration: number }> {
    try {
      const response = await fetch(`${this.url}/listen?${this.params}`, {
        method: "POST",
        headers: {
          Authorization: `Token ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: audioUrl }),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error(data);
        throw new Error(`Transcription failed - ${response.status}`);
      }

      const caption_combo = await deepgramToCombo(data);
      return { transcript: caption_combo, duration: data.metadata.duration };
    } catch (err) {
      console.error(err);
      throw new Error("An unknown error occurred.");
    }
  }

  async transcribeV2(audioUrl: string): Promise<{
    success: boolean;
    data: { transcript: Partial<TranscriptObject>; duration: number };
  }> {
    try {
      const response = await fetch(`${this.url}/listen?${this.params}`, {
        method: "POST",
        headers: {
          Authorization: `Token ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: audioUrl }),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error(data);
        return { success: false, data: { transcript: {}, duration: 0 } };
      }

      const caption_combo = await deepgramToCombo(data);
      const durationNum =
        typeof data.metadata.duration === "number"
          ? data.metadata.duration
          : parseFloat(data.metadata.duration);

      if (isNaN(durationNum)) throw new Error(`Invalid duration for ${audioUrl}`);
      return {
        success: true,
        data: { transcript: caption_combo, duration: durationNum },
      };
    } catch (err) {
      console.error(err);
      return { success: false, data: { transcript: {}, duration: 0 } };
    }
  }
}
