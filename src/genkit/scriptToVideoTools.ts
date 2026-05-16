import { z } from "genkit";
import { ai } from "./chatFlow";

// Lazy tool initialization to prevent re-registration errors
let toolsCache: any[] | null = null;

export function getScriptToVideoTools() {
  if (toolsCache) return toolsCache;

  const update_video_config = ai.defineTool(
    {
      name: "update_video_config",
      description: "Update the video script and generation parameters based on user input.",
      inputSchema: z.object({
        script: z.string().optional().describe("The video script content."),
        aspectRatio: z
          .string()
          .optional()
          .describe("The aspect ratio of the video (e.g., '16:9', '9:16', '1:1')."),
        visualType: z
          .string()
          .optional()
          .describe("The type of visuals to use ('AI_VIDEOS', 'AI_IMAGES', 'STOCK_VIDEOS')."),
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
        type: z
          .string()
          .optional()
          .describe("The type of video MUST ALWAYS be specified. Usually 'character-driven-ad'."),
        captionPosition: z
          .string()
          .optional()
          .describe("The position of captions ('top', 'middle', 'bottom')."),
        captionSize: z
          .string()
          .optional()
          .describe("The size of captions ('small', 'medium', 'large')."),
        blocks: z
          .array(
            z.object({
              characterName: z.string().optional(),
              characterRole: z
                .string()
                .optional()
                .describe(
                  "Always set this to 'villain', 'hero', 'human', or 'narrator' (all lowercase)",
                ),
              characterDescription: z
                .string()
                .optional()
                .describe(
                  "FIXED visual identity (Persona): ONLY the character's physical appearance (e.g. 'A blue gummy bear with silver molecular patterns'). KEEP it clean and consistent across all blocks for this character.",
                ),
              sceneDescription: z
                .string()
                .optional()
                .describe(
                  "AMBIENT environment (Ambient): The setting and background details (e.g. 'On a snowy mountain peak at sunset').",
                ),
              videoDescription: z
                .string()
                .optional()
                .describe(
                  "MOTION logic: What the character is doing in this specific clip (e.g. 'Jumping into the air while holding the product').",
                ),
              voiceDescription: z.string().optional(),
              emotion: z.string().optional(),
              dialogue: z.string().optional(),
              productInteractionType: z
                .enum([
                  "packaging_hero",
                  "product_content_hero",
                  "packaging_in_hand",
                  "product_content_in_hand",
                  "packaging_on_surface",
                  "product_content_on_surface",
                  "product_reveal",
                  "none",
                ])
                .optional()
                .describe(
                  "Set the focus to either the outer packaging or the internal product content for this scene.",
                ),
            }),
          )
          .optional()
          .describe("Used exclusively to define scenes when type is 'character-driven-ad'."),
        productName: z.string().optional().describe("The name of the product."),
        productDescription: z.string().optional().describe("A brief description of the product."),
      }),
      outputSchema: z.object({
        message: z.string(),
      }),
    },
    async (args) => {
      // The actual logic is handled on the client side, here we just acknowledge.
      // We return the args so the model sees what it called, but mainly for the client to act on.
      return {
        message: "Video configuration updated.",
      };
    },
  );

  toolsCache = [update_video_config];

  return toolsCache;
}
