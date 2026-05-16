// Assistant Script Generation Prompt
// Refocused on pure dialogue and scriptwriting, but with specialized character-driven ad expansions.

export const ASSISTANT_SCRIPT_SYSTEM_PROMPT = `You are a professional video scriptwriter specializing in high-converting social media ads. Your goal is to write engaging dialogues for character-driven ads.

CORE WRITING GUIDELINES:
- THE HOOK (0-3s): Start with a high-impact sentence to stop the scroll (e.g., "The secret to...", "Stop doing this...").
- VALUE/STORY: Keep the content focused on ONE core message. Use fast-paced, concise language. 
- CALL TO ACTION (CTA): End with a clear instruction (e.g., "Follow for more", "Check the link in bio").
- TONE: Maintain a helpful and professional tone in your reply, but be creative and punchy in the script.

CHARACTER-DRIVEN AD NARRATIVE (4-ACT STRUCTURE):
1. Scenes 1-3 (Villains): Dramatic "Pain Points" or problems the product solves. The villains represent the negative emotion or obstacle.
2. Scene 4 (Hero): The product/hero mascot appears as the powerful solution with a radiant entrance.
3. Scene 5 (Application): Real-world product interaction or usage.
4. Scene 6 (Social Proof): Premium lifestyle, vibrant, aspirational outro.

STRICT OUTPUT FORMAT:
You MUST return a JSON object that strictly follows the schema provided. 
- 'script': The FULL text-only narration script (no labels, no markdown).
- 'reply': A helpful conversational message for the user.
- 'blocks': Array of scene objects for the script structure.
`;

export const ASSISTANT_SCRIPT_OUTPUT_SCHEMA = {
  description: "Enriched video script and character block response",
  type: "object",
  properties: {
    script: { type: "string", description: "The full narration script text" },
    reply: { type: "string", description: "The conversational response to the user" },
    productName: { type: "string", description: "Consolitated or extracted product name" },
    productDescription: {
      type: "string",
      description: "Consolitated or extracted product description",
    },
    blocks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          characterName: { type: "string" },
          characterRole: { type: "string", enum: ["villain", "hero", "human", "narrator"] },
          characterDescription: {
            type: "string",
            description:
              "LITERAL visual description of the mascot/character. NEVER describe a human or metaphorical personification.",
          },
          sceneDescription: {
            type: "string",
            description:
              "Detailed visual description of the environment. MUST be a cleanly lit, bright, modern Pixar room (no dark/chaotic spaces).",
          },
          videoDescription: {
            type: "string",
            description: "Description of the movement and motion behavior",
          },
          voiceDescription: {
            type: "string",
            description: "Description of the voice tone and style for audio generation",
          },
          emotion: { type: "string" },
          dialogue: { type: "string" },
          productInteractionType: {
            type: "string",
            enum: [
              "packaging_hero",
              "product_content_hero",
              "packaging_in_hand",
              "product_content_in_hand",
              "packaging_on_surface",
              "product_content_on_surface",
              "product_reveal",
              "none",
            ],
          },
        },
        required: [
          "characterName",
          "characterRole",
          "dialogue",
          "characterDescription",
          "sceneDescription",
          "videoDescription",
          "voiceDescription",
          "productInteractionType",
        ],
      },
    },
  },
  required: ["script", "reply", "blocks"],
};
