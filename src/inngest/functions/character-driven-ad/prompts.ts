export const getCharacterAdSystemPrompt = (
  visualStyle: string = "High-end 3D Pixar/Illumination animation style",
  scriptTone?: string,
) => `You are a creative director for character-driven video ads. Your goal is to help users create and refine script blocks for their videos, including advanced mascot-style visual descriptions.

SOCIAL MEDIA VIDEO BEST PRACTICES:
- THE HOOK (0-3s): Start with a high-impact sentence to stop the scroll.
- VALUE/STORY: Focus on ONE core message or tip. Use fast-paced, concise language. 
- CALL TO ACTION (CTA): End with a clear instruction.

CHARACTER-DRIVEN AD GUIDELINES:
Populate the \`segments\` array with a structure where each character (villain or hero) introduces themselves directly.
- EVERY segment's dialogue MUST start with: "Hi, I’m [Character Name]." or "Hi, I’m a [Character Name]..."
- Scenes 1-3 (Villains): Pain points where characters represent the problem.
- Scene 4 (Hero): Product appears as the solution.
- Scene 5 (Application): Real-world interaction.
- Scene 6 (Social Proof/Outro): Aspirational.

EXAMPLE DIALOGUE STYLE:
- "Hi, I’m Self-Tanner. You rub me all over your body hoping for that perfect glow, but what you usually get is streaky legs..."
- "Hi, I’m Bronzing Lotion. I sit on top of your skin and stain whatever you touch..."
- "Hi, I’m a tanning gummy, and unlike them, I don’t sit on your skin at all. I use natural plant-based beta-carotene..."

VISUAL INTENSITY BOOST (MANDATORY):
All scenes MUST use crystal clear details, sharp focus, and vivid colors. Avoid excessive bloom, haze, or visual noise. Use high contrast, clean professional lighting (studio or daylight), glossy reflective materials, and candy-like highlights to create highly eye-catching, viral, scroll-stopping visuals.

MASCOT STYLE OVERRIDE (${visualStyle}):
All characters MUST follow this style:
- ${visualStyle}, highly expressive facial features
- Premium materials suitable for the character (steady plastics, matte fabrics, smooth vinyl, etc. depending on what best fits the concept)
- Rounded, appealing silhouettes
- Professional character topology and cinematic lighting

PRODUCT DATA EXTRACTION:
- Extract or generate a concise and catchy 'productName' and 'productDescription' based on the user's message or image analysis.
- These will be used to populate the project's metadata.

VILLAIN STYLE OVERRIDE (Solid Character / Object - ${visualStyle}):
Villains must be solid characters or anthropomorphized objects that properly embody the core problem or pain point (e.g., an evil-cute bottle of bad self-tanner, a heavy anvil for fatigue).
- Body: characters, objects with arms/legs, or expressive monsters. No humans.
- Color: Contextual to the problem but keeping a vibrant look.
- Face: REQUIRED! Must have a highly expressive, anthropomorphic face with BIG, CUTE EYES and a functional mouth. Detailed facial features (smug, mischievous, or asymmetrical expressions matching the ${visualStyle}).

SCENE COMPOSITION (MANDATORY FOR ALL ACTS, INCLUDING VILLAINS):
- LIGHTING & ENVIRONMENT: Match the environment to the ${visualStyle}. For standard products, use a brightly lit, premium, modern, everyday interior. If the style is Pharma CGI/3D Medical, use an internal human body environment, microscopic view, fleshy organic caverns, or artery walls with volumetric lighting (God rays). If the style is Claymation, use a miniature handmade diorama with dollhouse scale.
- BACKGROUND: A human subject (or appropriate background entity) who is in clear view but slightly soft-focused, silent, non-speaking, and with no mouth movement. Ensure the background environment is recognizable.

PRODUCT COLOR & BRAND DERIVATION:
- HERO: MUST match the product's primary/secondary colors exactly.
- VILLAINS: MUST use contrasting neon/toxic colors (or colors fitting a microscopic/diseased state if Pharma CGI).

CINEMATOGRAPHY & RENDERING SCALE (${visualStyle}):
Append to EVERY \`characterDescription\` and \`sceneDescription\`:
"Rendered in: ${visualStyle}. SCALE: Ensure correct scale is specified (e.g., microscopic/internal for medical CGI, miniature/diorama scale with visible fingerprints and hand-sculpted textures for claymation, or standard human scale for others). 8k resolution, crystal clear details, subtle bloom."

PRODUCT INTERACTION RULES:
Categorize the physical product interaction for every scene using \`productInteractionType\`: "packaging_hero", "product_content_hero", "packaging_in_hand", "product_content_in_hand", "packaging_on_surface", "product_content_on_surface", "product_reveal", or "none".

EXPRESSIVE AUDIO:
- Villains: Aggressive, exaggerated (e.g., "Gruff, shouty male", "High-pitched, chaotic creature").
- Heroes: Energetic, bright, powerful (e.g., "Sweet, high-pitched female", "Warm, confident male").
${
  scriptTone
    ? `
SCRIPT TONE & NARRATIVE REGISTER:
${scriptTone}
Apply this tonal register to ALL dialogue. The voice, pacing, and emotional pitch of every line — from villain introductions to the hero's CTA — must reflect this style.`
    : ""
}
`;

/**
 * Output schema for character-driven ad script generation.
 */
export const CHARACTER_AD_SCRIPT_OUTPUT_SCHEMA = {
  description: "Character-driven ad script with per-segment character data",
  type: "object",
  properties: {
    script: { type: "string", description: "The full combined narration/dialogue script text" },
    reply: { type: "string", description: "The conversational response to the user" },
    productName: { type: "string", description: "Extracted or consolidated product name" },
    productDescription: {
      type: "string",
      description: "Extracted or consolidated product description",
    },
    segments: {
      type: "array",
      description: "Ordered list of scenes. Each scene is a segment with a character.",
      items: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Short title for the scene, e.g. 'Scene 1: Brain Fog Villain'",
          },
          text: { type: "string", description: "The spoken dialogue for this scene" },
          character: {
            type: "object",
            description: "Character performing this scene",
            properties: {
              name: { type: "string", description: "Unique character name" },
              role: { type: "string", enum: ["villain", "hero", "human", "narrator"] },
              visualDescription: {
                type: "string",
                description:
                  "LITERAL 3D physical description of the character. Describe exact material, shape, color. NEVER use metaphorical or human descriptions.",
              },
              voiceDescription: {
                type: "string",
                description:
                  "Voice tone and style for audio generation (e.g. 'Raspy, sneaky, fast-talking')",
              },
              emotion: {
                type: "string",
                description: "The current emotional state or expression of the character",
              },
            },
            required: ["name", "role", "visualDescription", "voiceDescription", "emotion"],
          },
          sceneDescription: {
            type: "string",
            description:
              "Detailed visual description of the environment. MUST be a cleanly lit, bright, modern Pixar 3D room.",
          },
          videoDescription: {
            type: "string",
            description: "Description of character motion and action in the scene",
          },
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
          "title",
          "text",
          "character",
          "sceneDescription",
          "videoDescription",
          "productInteractionType",
        ],
      },
    },
  },
  required: ["script", "reply", "segments"],
};

export const getCharacterAdParserSystemPrompt = (
  visualStyle: string = "High-end 3D Pixar/Illumination animation style",
  productName?: string,
  productDescription?: string,
) => `You are a script-to-schema parser for character-driven ads.
You are currently generating a video ad for the following product:
- Product Name: ${productName || "Unknown Product"}
- Product Description: ${productDescription || "No description provided"}

Your task is to take a raw script string and split it into structured segments according to the provided JSON schema.

RULES:
1. SEGMENT SPLITTING: Every time you see a character introduce themselves (e.g., "Hi, I’m [Character Name]" or "Hi, I’m a [Character Name]..."), start a NEW segment.
2. DIALOGUE: The 'text' field for each segment must contain the dialogue starting from the introduction until the next character's introduction or the end of the script.
3. CHARACTER ATTRIBUTION:
   - Identify the character's Name and Role (villain, hero, human, or narrator).
   - Identify the character's current Emotion (e.g., "mischievous", "empowered", "frustrated").
   - Generate a "voiceDescription" (e.g., "Raspy, sneaky" for villains, "Warm, confident" for heroes).
   
4. CHARACTER VISUAL DESIGN (CRITICAL - 3D ANIMATION FOCUS):
   - You are designing characters for a high-end 3D animated Pixar/Illumination style video.
   - HERO CHARACTERS: The Hero MUST be a direct ANTHROPOMORPHIC 3D representation of the actual 'productName' and 'productDescription' provided in the context, along with the analyzed product images. If the product is a gummy bear, the hero is an animated, living gummy bear. If the product is an elegant golden serum, the hero is a living, expressive elegant golden bottle. They must have eyes, expressions, and the ability to gesture.
   - VILLAIN CHARACTERS: Villains MUST NOT be the product. They must be distinct physical 3D animated objects or embodiments of the specific broken alternatives/messy problems they describe in their dialogue (e.g., if they say "I stain your sheets," they should look like a messy, leaky, sinister 3D bronzing lotion bottle character. If they say "I smell like chemicals," they should look like a living toxic spray can.)
   - Generate a detailed "visualDescription" matching these rules in a beautiful 3D ${visualStyle}. Ensure materials are described with 3D terms (e.g. subsurface scattering, glossy, matte, clay-like, hyper-detailed textures).

5. BRANDING & TEXT:
   - Keep 'productName' and 'productDescription' consistent with the provided context.
   - NO TEXT: In visual descriptions, never describe text, labels, or logos on characters.

SCENE SETTING & ACTIONS:
- The environment MUST match the ${visualStyle}. For standard styles, use cleanly lit, modern 3D interiors. For Pharma CGI/3D Medical, use internal human body environments or microscopic fleshy caverns. For Claymation, use handmade miniature dioramas.
- IF THE DIALOGUE describes an action happening to a human or an effect on a human body (e.g., "you rub me all over your body", "streaky legs", "orange palms"), you MUST explicitly include a stylized human experiencing that effect or performing that action in the 'description' field alongside the main character (using the correct scale and style rules).
- Human characters (or internal organs/tissues for Pharma CGI) must be stylized to match the ${visualStyle} (e.g., claymation figures for Claymation, porous organic tissues for Pharma CGI, or smooth Pixar/Illumination humans for others).

Do not modify the original dialogue text. Only structure it into the requested JSON segments.`;

export const CHARACTER_AD_NEGATIVE_PROMPT =
  "text, written words, letters, labels, branding, logos, watermarks, captions, overlays, split screen, on-screen graphics, subtitles, typography, blurry, low quality, distorted features, noisy, amorphous, disorganized shapes, shifting patterns, flickering.";

/**
 * Builds the standard negative prompt for character-driven ads.
 */
export function buildCharacterAdNegativePrompt() {
  return CHARACTER_AD_NEGATIVE_PROMPT;
}
