import { paramsVoice, VoiceResponse } from "./types";

export interface ILockManager {
  acquire(): Promise<() => Promise<void> | void>;
}

export class TtsService {
  private apiKey: string;
  private baseUrl: string;
  private model: string;
  private semaphore?: ILockManager;

  constructor(url: string, apiKey: string, model: string, semaphore?: ILockManager) {
    this.baseUrl = url;
    this.apiKey = apiKey;
    this.model = model;
    this.semaphore = semaphore;
  }

  // ==============ELEVENLABS============= //
  async synthesize(
    text: string,
    voiceId: string,
  ): Promise<{ success: boolean; buffer: ArrayBuffer }> {
    try {
      if (!voiceId || !text)
        throw new Error("Missing parameters: both voiceId and text are required.");

      // Acquire a semaphore slot specifically for ElevenLabs TTS if injected
      const release = this.semaphore ? await this.semaphore.acquire() : () => {};

      try {
        const response = await fetch(`${this.baseUrl}/v1/text-to-speech/${voiceId}`, {
          method: "POST",
          headers: {
            "xi-api-key": this.apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text,
            model_id: this.model,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("ElevenLabs API Error:", errorData);
          throw new Error("Failed to synthesize speech.");
        }

        const buffer = await response.arrayBuffer();
        return {
          success: true,
          buffer,
        };
      } finally {
        await release(); // Always release the semaphore slot
      }
    } catch (err: any) {
      console.error("ElevenLabs Synthesis Error:", err);
      if (err instanceof Error) throw err;
      throw new Error("Unable to synthesize speech. Please try again later.");
    }
  }

  async getVoices(
    params: paramsVoice,
  ): Promise<{ voices: VoiceResponse[]; hasMore: boolean; next: string }> {
    try {
      const searchParams = new URLSearchParams({
        sort_direction: "desc",
        voice_type: "non-default",
        include_total_count: "false",
      });

      Object.entries(params).forEach(([key, value]) => {
        if (value) searchParams.append(key, value);
      });

      const url = `${this.baseUrl}/v2/voices?${searchParams.toString()}`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "xi-api-key": this.apiKey,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      if (!response.ok) {
        console.error("fetch error", data);
        throw new Error("No voices found in the API response.");
      }
      //console.log(JSON.stringify(data.voices, null, 2))
      const voices = data.voices.map((v: any) => ({
        id: v.voice_id,
        name: v.name,
        accent: v.labels?.accent ?? v.verified_languages[0]?.accent ?? "",
        gender: v.labels?.gender,
        age: v.labels?.age,
        descriptive: v.labels?.descriptive ?? v.sharing?.labels?.descriptive ?? "",
        useCase: v.labels?.use_case,
        category: v.category,
        language: v.labels?.language ?? v.verified_languages[0]?.language ?? "",
        locale: v.labels?.locale ?? v.verified_languages[0]?.locale ?? v.sharing?.labels?.locale,
        description: v.description,
        previewUrl: v.preview_url,
      }));

      return { voices, hasMore: data.has_more, next: data.next_page_token };
    } catch (err: any) {
      throw new Error(err?.message || "Failed to get voices.");
    }
  }

  async deleteMyVoice(voiceId: string) {
    try {
      const response = await fetch(`${this.baseUrl}/v1/voices/${voiceId}`, {
        method: "DELETE",
        headers: {
          "xi-api-key": this.apiKey,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      if (!response.ok) {
        console.error("Error: ", data);
        // throw new Error(`Error 123: ${await response.text()}`)
        return null;
      }

      return data;
    } catch (err: any) {
      // if (err instanceof Error) throw err;
      // throw new ApiError(err?.message || "Failed to delete dubbing.");
      return null;
    }
  }

  async cloneVoice(
    name: string,
    buffer: Buffer,
    filename: string,
    description?: string,
  ): Promise<string> {
    try {
      const formData = new FormData();
      formData.append("name", name);
      if (description) {
        formData.append("description", description);
      }

      const blob = new Blob([new Uint8Array(buffer)]);
      formData.append("files", blob, filename);

      const response = await fetch(`${this.baseUrl}/v1/voices/add`, {
        method: "POST",
        headers: {
          "xi-api-key": this.apiKey,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("ElevenLabs Clone Voice Error:", errorData);
        throw new Error("Failed to clone voice.");
      }

      const data = await response.json();
      return data.voice_id;
    } catch (err: any) {
      console.error("ElevenLabs Clone Error:", err);
      throw new Error("Unable to clone voice. Please try again later.");
    }
  }

  // ==============ELEVENLABS============= //
  async synthesizeTest(
    text: string,
    voiceId: string,
  ): Promise<{ success: boolean; buffer: Buffer }> {
    const API_KEY = process.env.CAMB_API_KEY;
    if (!API_KEY) {
      throw new Error("CAMB_API_KEY is not set");
    }
    const BASE_URL = "https://client.camb.ai/apis";

    try {
      // 1️⃣ Crear task
      const createResponse = await fetch(`${BASE_URL}/tts`, {
        method: "POST",
        headers: {
          "x-api-key": API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          voice_id: 144300,
          language: 1, // English
          gender: 1,
          age: 30,
        }),
      });

      if (!createResponse.ok) {
        throw new Error(`TTS create failed: ${createResponse.status}`);
      }

      const { task_id } = await createResponse.json();

      if (!task_id) {
        throw new Error("No task_id returned from TTS API");
      }

      // 2️⃣ Polling hasta SUCCESS
      let runId: number | null = null;

      while (true) {
        const statusResponse = await fetch(`${BASE_URL}/tts/${task_id}`, {
          headers: {
            "x-api-key": API_KEY,
          },
        });

        if (!statusResponse.ok) {
          throw new Error(`TTS status failed: ${statusResponse.status}`);
        }

        const statusData = await statusResponse.json();

        if (statusData.status === "SUCCESS") {
          runId = statusData.run_id;
          break;
        }

        if (statusData.status === "FAILED" || statusData.status === "ERROR") {
          throw new Error("TTS generation failed");
        }

        if (statusData.status === "PAYMENT_REQUIRED") {
          throw new Error("Not enough credits for TTS");
        }

        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      if (!runId) {
        throw new Error("No run_id returned after SUCCESS");
      }

      const audioResponse = await fetch(`${BASE_URL}/tts-result/${runId}?output_type=raw_bytes`, {
        headers: {
          "x-api-key": API_KEY,
        },
      });

      if (!audioResponse.ok) {
        throw new Error(`TTS result failed: ${audioResponse.status}`);
      }

      const arrayBuffer = await audioResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      return {
        success: true,
        buffer,
      };
    } catch (err) {
      console.error("TTS error:", err);
      throw new Error("Unable to synthesize speech. Please try again later.");
    }
  }

  async isolateAudio(buffer: Buffer): Promise<Buffer> {
    try {
      const formData = new FormData();
      const blob = new Blob([new Uint8Array(buffer)]);
      formData.append("audio", blob, "audio.mp3");

      const response = await fetch(`${this.baseUrl}/v1/audio-isolation`, {
        method: "POST",
        headers: {
          "xi-api-key": this.apiKey,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("ElevenLabs Audio Isolation Error:", errorData);
        throw new Error("Failed to isolate audio.");
      }

      const isolatedBuffer = await response.arrayBuffer();
      return Buffer.from(isolatedBuffer);
    } catch (err: any) {
      console.error("ElevenLabs Isolation Error:", err);
      throw new Error("Unable to isolate audio. Please try again later.");
    }
  }

  async generateSfx(text: string, durationSeconds?: number): Promise<Buffer> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/sound-generation`, {
        method: "POST",
        headers: {
          "xi-api-key": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          duration_seconds: durationSeconds,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("ElevenLabs Sound Effects Error:", errorData);
        throw new Error("Failed to generate sound effect.");
      }

      const sfxBuffer = await response.arrayBuffer();
      return Buffer.from(sfxBuffer);
    } catch (err: any) {
      console.error("ElevenLabs SFX Error:", err);
      throw new Error("Unable to generate sound effect. Please try again later.");
    }
  }
}
