import { z } from "genkit";
import { ai } from "./chatFlow";

// Lazy tool initialization to prevent re-registration errors
let toolsCache: any[] | null = null;

export function getUGCVideoTools() {
  if (toolsCache) return toolsCache;

  const update_ugc_config = ai.defineTool(
    {
      name: "update_ugc_config",
      description: "Update the UGC video schema and segments based on user input.",
      inputSchema: z.object({
        title: z.string().optional().describe("The title of the video."),
        description: z.string().optional().describe("A brief description of the video topic."),
        script: z.string().describe("The video script content."),
        aspectRatio: z
          .string()
          .optional()
          .describe("The aspect ratio of the video (e.g., '9:16' for UGC/TikTok)."),
        visualType: z
          .string()
          .optional()
          .describe("The type of visuals ('AI_VIDEOS', 'AI_IMAGES', 'STOCK_VIDEOS')."),
        visualStyle: z
          .string()
          .optional()
          .describe("The visual style (e.g., Cinematic, Anime, Realism)."),
        voiceId: z.string().optional().describe("The ID of the voice to use."),
        duration: z
          .string()
          .optional()
          .describe("The duration of the video in seconds ('30', '45', '60')."),
        quality: z.string().optional().describe("The video quality ('regular', 'high')."),
        captionPosition: z
          .string()
          .optional()
          .describe("The position of captions ('top', 'middle', 'bottom')."),
        captionSize: z
          .string()
          .optional()
          .describe("The size of captions ('small', 'medium', 'large')."),
      }),
      outputSchema: z.object({
        message: z.string(),
      }),
    },
    async (args) => {
      // The actual logic is handled on the client side, here we just acknowledge.
      return {
        message: "UGC video configuration updated.",
      };
    },
  );

  toolsCache = [update_ugc_config];

  return toolsCache;
}
