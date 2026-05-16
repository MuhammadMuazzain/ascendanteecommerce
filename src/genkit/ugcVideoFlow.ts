import { z } from "genkit";
import { ai } from "./chatFlow";
import { getUGCVideoTools } from "./ugcVideoTools";

const SYSTEM_PROMPT = `You are a UGC (User Generated Content) video creative assistant. Your goal is to help users create viral, authentic, and engaging scripts for TikToks, Reels, and Shorts.

When a user provides a topic or product, brainstorm a creative concept and script.

UGC VIDEO BEST PRACTICES:
- **AUTHENTICITY**: functionality over high production value.
- **THE HOOK (0-3s)**: Stop the scroll immediately. Use curiosity gaps, controversy, or strong visual/audio hooks.
- **PACING**: Fast, dynamic, and keeping retention high.
- **CTA**: Clear call to action at the end.

FORMATTING GUIDELINES for Script:
- The script MUST be text-only, containing ONLY the spoken dialogue or text overlay.
- Do NOT include labels (e.g., "Narrator:", "Visuals:"), segment markers, or visual descriptions.
- Use double newlines to separate logical paragraphs or sections.

CORE GUIDELINES:
- **ALWAYS** call the \`update_ugc_config\` tool when you generate or update the script.
- Provide the script in the chat as well for readability (text-only format).
- Default aspect ratio should be '9:16'.
- Maintain a high-energy, helpful persona.

Parameters Mapping for update_ugc_config:
- script: The FULL text-only narration script (no markdown symbols).
- title: A catchy title for the video.
- description: A summary of the video concept.
`;

export const ugcVideoFlow = ai.defineFlow(
  {
    name: "ugcVideoFlow",
    inputSchema: z.object({
      message: z.string(),
    }),
    outputSchema: z.object({
      reply: z.string(),
    }),
    streamSchema: z.string(),
  },
  async ({ message }, { sendChunk }) => {
    const prompt = `[USER]: ${message}`;

    const { stream, response } = ai.generateStream({
      system: SYSTEM_PROMPT,
      config: {
        thinkingConfig: {
          thinkingBudget: 2000,
          includeThoughts: true,
        },
      },
      prompt,
      tools: getUGCVideoTools(),
    });

    const toolsQueue: Array<{ name: string; arg: any; response?: any }> = [];

    for await (const chunk of stream) {
      if (chunk.role === "model" && chunk.content?.[0]?.reasoning) {
        sendChunk(
          JSON.stringify({
            event: "reasoning",
            text: chunk.content[0].reasoning,
          }),
        );
      }

      if (chunk.role === "model" && chunk.content?.[0]?.toolRequest) {
        for (let idx = 0; idx < chunk.content.length; idx++) {
          const toolContent = chunk.content[idx];
          if (toolContent.toolRequest) {
            const name = toolContent.toolRequest.name;
            const arg = toolContent.toolRequest.input;
            toolsQueue.push({ name, arg });
          }
        }
      }

      if (chunk.role === "tool" && chunk.content?.[0]?.toolResponse) {
        for (let idx = 0; idx < chunk.content.length; idx++) {
          const toolContent = chunk.content[idx];
          if (toolContent.toolResponse) {
            const name = toolContent.toolResponse.name;
            const responseOutput = toolContent.toolResponse.output;
            const tool = toolsQueue.find((t) => t.name === name && t.response === undefined);
            if (tool) tool.response = responseOutput;
          }
        }
      }
    }

    for (const tool of toolsQueue) {
      sendChunk(
        JSON.stringify({
          event: "tool",
          name: tool.name,
          arg: tool.arg,
          response: tool.response,
        }),
      );
    }

    const { text } = await response;
    return { reply: text };
  },
);
