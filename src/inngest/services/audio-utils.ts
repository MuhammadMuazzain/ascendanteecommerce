import { execSync } from "child_process";
import { ffprobeStatic } from "@/utils/ffmpeg-config";

export interface AudioSample {
  time: number;
  rms: number;
}

/**
 * Extracts RMS audio levels from a media file using ffprobe.
 */
export async function getAudioRMSLevels(filePath: string): Promise<AudioSample[]> {
  try {
    const durationOut = execSync(
      `"${ffprobeStatic}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
    ).toString();
    const totalDuration = parseFloat(durationOut);

    const cmd = `"${ffprobeStatic}" -v error -f lavfi -i "amovie=${filePath},astats=metadata=1" -show_entries frame_tags=lavfi.astats.Overall.RMS_level -of csv`;
    const output = execSync(cmd).toString();

    const lines = output.split("\n").filter((l) => l.trim().length > 0);
    if (lines.length === 0) return [];

    const frameDuration = totalDuration / lines.length;
    return lines.map((line, i) => {
      const parts = line.split(",");
      const val = parts[1];
      const rms = val === "-inf" ? -100 : parseFloat(val);
      return { time: i * frameDuration, rms };
    });
  } catch (e) {
    console.error("[AudioUtils] Failed to extract RMS levels:", e);
    return [];
  }
}

/**
 * Analyzes audio levels after lastWordEnd to find the first silent moment.
 * Adds a 0.3s buffer within the silence if possible.
 */
export async function detectTrailingSilence(
  filePath: string,
  lastWordEnd: number,
  options: {
    minGap?: number;
    buffer?: number;
    aggressiveFallback?: number;
  } = {},
): Promise<number | null> {
  const { minGap = 0.1, buffer = 0.3, aggressiveFallback = 0.1 } = options;

  try {
    const samples = await getAudioRMSLevels(filePath);
    if (samples.length === 0) return lastWordEnd + aggressiveFallback;

    const totalDuration = samples[samples.length - 1].time;

    // 1. Learn baseline from the start of the video (first 500ms)
    const frameDuration = samples.length > 1 ? samples[1].time - samples[0].time : 0.021;
    const baselineLimit = Math.floor(0.5 / frameDuration);
    const baselineSamples = samples
      .slice(0, baselineLimit)
      .filter((s) => s.rms < -50 || s.rms === -100);
    const baseline =
      baselineSamples.length > 0
        ? baselineSamples.reduce((sum, s) => sum + s.rms, 0) / baselineSamples.length
        : -60;

    // Adaptive threshold: +15dB above noise floor, capped at -45dB
    const threshold = Math.min(baseline + 15, -45);

    // 2. Find first stable silence gap after lastWordEnd
    let silenceStart: number | null = null;
    let silenceEnd: number | null = null;

    for (const sample of samples) {
      if (sample.time < lastWordEnd) continue;

      if (sample.rms < threshold) {
        if (silenceStart === null) {
          silenceStart = sample.time;
        }
      } else {
        if (silenceStart !== null) {
          if (sample.time - silenceStart >= minGap) {
            silenceEnd = sample.time;
            break;
          } else {
            silenceStart = null;
          }
        }
      }
    }

    if (silenceStart !== null) {
      if (silenceEnd === null) silenceEnd = totalDuration;
      // Return silenceStart + buffer, but capped by the end of this silence gap
      return Math.min(silenceStart + buffer, silenceEnd);
    }

    // fallback if no silence found
    return lastWordEnd + aggressiveFallback;
  } catch (e) {
    console.error("[AudioUtils] Error detecting trailing silence:", e);
    return lastWordEnd + aggressiveFallback;
  }
}

/**
 * Analyzes frame-level RMS energy to find the first leading spike.
 * Targeted at muting "noise waves" at the start of recordings.
 */
export async function detectLeadingSpike(videoPath: string): Promise<{
  muteRange: { start: number; end: number } | null;
  isSustainedSpeech: boolean;
}> {
  const result = { muteRange: null, isSustainedSpeech: false };
  try {
    const samples = await getAudioRMSLevels(videoPath);
    if (samples.length === 0) return result;

    // Learn baseline (first 5 frames or frames < -80dB)
    const baselineSamples = samples.slice(0, 5).filter((s) => s.rms < -80 || s.rms === -100);
    const baseline =
      baselineSamples.length > 0
        ? baselineSamples.reduce((sum, s) => sum + s.rms, 0) / baselineSamples.length
        : -80; // Fallback baseline

    // Adaptive threshold: +20dB above noise floor
    const threshold = baseline + 20;
    let start: number | null = null;
    let end: number | null = null;
    let peakRms = -100;

    // Scan only the first 400ms (approx 20 frames) to avoid muting actual speech
    // We assume frameDuration is ~21ms if not calculated precisely
    const maxScanFrames = Math.min(samples.length, 20);
    for (let i = 0; i < maxScanFrames; i++) {
      if (samples[i].rms > threshold) {
        if (start === null) start = samples[i].time;
        peakRms = Math.max(peakRms, samples[i].rms);

        // Find where the spike ends
        let j = i;
        while (j < samples.length && samples[j].rms > threshold) {
          peakRms = Math.max(peakRms, samples[j].rms);
          end = samples[j].time;
          j++;
        }

        // --- VOCAL ONSET PROTECTION (Safety Gates) ---
        if (start === null || end === null) break;
        const duration = end - start;

        // 1. If it lasts > 351ms, it's sustained vocal energy (Not a transient!)
        if (duration > 0.351) {
          console.log(
            `[AudioUtils] Spike ignored for ${videoPath}: Sustained energy (${duration.toFixed(3)}s) likely speech.`,
          );
          return { muteRange: null, isSustainedSpeech: true };
        }

        // 2. If it's too quiet overall (< -45dB), it's not a "loud spike artifact"
        if (peakRms < -45) {
          console.log(
            `[AudioUtils] Spike ignored for ${videoPath}: Energy too low (${peakRms.toFixed(1)}dB).`,
          );
          return { muteRange: null, isSustainedSpeech: false };
        }

        break;
      }
    }

    if (start !== null && end !== null) {
      return {
        muteRange: {
          start: 0, // Always mute from absolute start to kill frame-zero clicks
          end: end + 0.03,
        },
        isSustainedSpeech: false,
      };
    }
  } catch (e) {
    console.error("[AudioUtils] Spike detection failed:", e);
  }
  return result;
}
/**
 * Calls the external VAD service to detect the start of speech in a video.
 * Returns the silence duration (in seconds) or null if the service fails.
 */
export async function getVADSilenceUntil(url: string): Promise<number | null> {
  const VAD_SERVICE_URL = "http://localhost:8000/process";

  try {
    console.log(`[AudioUtils] Calling VAD service for URL: ${url}`);
    const response = await fetch(VAD_SERVICE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      console.warn(
        `[AudioUtils] VAD service returned status ${response.status}: ${await response.text()}`,
      );
      return null;
    }

    const data = await response.json();
    if (typeof data.silence_until === "number") {
      console.log(`[AudioUtils] VAD service returned silence_until: ${data.silence_until}s`);
      return data.silence_until;
    }

    console.warn("[AudioUtils] VAD service response missing silence_until:", data);
    return null;
  } catch (error) {
    console.error("[AudioUtils] VAD service call failed:", error);
    return null;
  }
}
