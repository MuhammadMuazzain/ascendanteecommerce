import { NonRetriableError } from "inngest";
import { v4 as uuidv4 } from "uuid";

import { getInngestApp } from "../../index";
import * as repurposeSteps from "./steps/index";

const inngest = getInngestApp();

// ============================================================================
// REPURPOSE VIDEO ORCHESTRATOR
// ============================================================================
// Workflow:
//   1. Upload original video to R2
//   2. Transcribe video audio via Deepgram → extract time-aligned paragraphs
//   3. Detect persuasive hooks from paragraphs via Gemini
//   4. Detect segments to remove (brands, platform UI, pricing/sales) via Gemini
// ============================================================================

export const repurposeVideoOrchestrator = inngest.createFunction(
  {
    id: "repurpose-video-orchestrator",
    triggers: { event: "video/repurpose" },
  },

  async ({ event, step }) => {
    const { url, name, productName } = event.data as {
      /** Source video URL */
      url: string;
      /** Internal file name / label */
      name?: string;
      /** Advertiser's product name — used to whitelist it from brand-removal detection */
      productName?: string;
    };

    if (!url) {
      throw new NonRetriableError("Event data must include a `url` field.");
    }

    const videoId = `viral_${uuidv4().substring(0, 8)}`;

    // ========================================================================
    // STAGE 1: UPLOAD TO R2
    // ========================================================================
    const { r2Url } = await step.run("upload-to-r2", () =>
      repurposeSteps.uploadOriginalVideoToR2({ url, videoId }),
    );

    // ========================================================================
    // STAGE 2: TRANSCRIBE VIDEO (Deepgram → paragraphs + words)
    // ========================================================================
    const { paragraphs, words, fullText, duration } = await step.run("transcribe-video", () =>
      repurposeSteps.transcribeVideo({ url: r2Url }),
    );

    // ========================================================================
    // STAGE 3: EXTRACT HOOKS (Gemini)
    // ========================================================================
    const { hooks } = await step.run("extract-hooks", () =>
      repurposeSteps.extractHooksWithGemini({ paragraphs }),
    );

    // ========================================================================
    // STAGE 4: DETECT REMOVALS (Gemini)
    // Flags segments that mention brands, platform UI, or pricing/sales info
    // that should be cut or covered before re-publishing the video.
    // ========================================================================
    const { removals } = await step.run("detect-removals", () =>
      repurposeSteps.detectRemovalsWithGemini({ paragraphs, words, productName }),
    );

    // ========================================================================
    // STAGE 5: BUILD SCHEMAS (FFmpeg)
    // For each hook, cuts the hook + content clips based on timestamps and removals.
    // ========================================================================
    const { schemas } = await step.run("build-schemas", () =>
      repurposeSteps.buildSchemasFromHooks({
        r2Url,
        videoId,
        hooks,
        removals,
        duration,
      }),
    );

    // ========================================================================
    // RESULT
    // ========================================================================
    return {
      success: true,
      videoId,
      name: name ?? "video.mp4",
      productName,
      r2Url,
      transcript: {
        duration,
        fullText,
        paragraphs,
      },
      hooks,
      removals,
      schemas,
    };
  },
);
