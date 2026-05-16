import { VideoType } from "@/utils/enum";
import { estimateAudioDuration } from "@/utils/tts";
import { ScriptBlock } from "@/types/video-generation";

export const CREDIT_COSTS: Record<VideoType, number> = {
  [VideoType.STOCK_VIDEOS]: 15,
  [VideoType.AI_IMAGES]: 40,
  [VideoType.AI_VIDEOS]: 280,
  [VideoType.STOCK_IMAGES]: 15, // Default for STOCK_IMAGES
};

/**
 * Calculates the credit cost for a video generation job.
 * Cost is calculated per 30-second block.
 *
 * @param script The script text or scene blocks to estimate duration
 * @param visualType The type of visuals being used
 * @returns The estimated cost in credits
 */
export function calculateVideoCreditCost(
  script: string | ScriptBlock[],
  visualType: VideoType,
): number {
  let text = "";
  if (Array.isArray(script)) {
    text = script.map((s) => s.narrator).join("\n");
  } else {
    text = script;
  }

  const duration = Math.max(0, estimateAudioDuration(text));
  const baseCost = CREDIT_COSTS[visualType] || 15;

  // Cost = (Duration / 30) * Rate
  return Math.ceil((duration / 30) * baseCost);
}
