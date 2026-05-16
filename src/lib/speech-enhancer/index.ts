import { PhonosAPI } from "./phonos-api.js";
import { POLLING_INTERVAL_MS, MAX_POLLING_ATTEMPTS } from "./constants.js";
import { randomUUID } from "node:crypto";
import process from "node:process";

function getPhonosToken(): string {
  const raw = process.env.PHONOS_TOKEN?.trim();
  if (!raw) {
    throw new Error("PHONOS_TOKEN is not set. Add it to your .env file.");
  }
  return raw.startsWith("Bearer ") ? raw : `Bearer ${raw}`;
}

/**
 * Orchestrates the full speech enhancement pipeline:
 * Upload -> Create Track -> Poll until complete -> Download
 */
async function processAudioEnhancement(filePath: string, token: string) {
  const api = new PhonosAPI(token);
  const trackId = randomUUID();

  try {
    // Step 1: Upload
    console.log("🚀 Step 1/3: Uploading audio file...");
    await api.uploadFile(filePath);

    // Step 2: Track Creation
    console.log("\n🚀 Step 2/3: Creating enhancement track...");
    const serverTrackId = await api.createEnhanceSpeechTrack(trackId);
    console.log(`✅ Track created successfully. (ID: ${serverTrackId})`);

    // Step 3: Polling and Download
    console.log("\n🚀 Step 3/3: Waiting for enhancement to complete...");

    for (let attempt = 1; attempt <= MAX_POLLING_ATTEMPTS; attempt++) {
      const { status, data } = await api.checkEnhancementResult(serverTrackId);

      if (status === 200 && data?.url) {
        console.log("\n✨ Enhancement complete! Processing download...");
        await api.downloadEnhancedAudio(data.url);
        return true;
      }

      if (status === 204) {
        process.stdout.write(
          `\r⏳ Progress: Attempting status check ${attempt}/${MAX_POLLING_ATTEMPTS}...`,
        );
      } else {
        throw new Error(`Unexpected status code while polling: ${status}`);
      }

      await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL_MS));
    }

    throw new Error("Enhancement timed out after maximum attempts.");
  } catch (error: any) {
    console.error(`\n❌ Error during enhancement pipeline: ${error.message}`);
    return false;
  }
}

// CLI Execution Entry Point
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("index.ts")) {
  const filePath = process.argv[2] || "./output.mp3";

  processAudioEnhancement(filePath, getPhonosToken())
    .then((success) => process.exit(success ? 0 : 1))
    .catch(() => process.exit(1));
}

export { processAudioEnhancement };
