// ─────────────────────────────────────────────────────────────────────────────
// VIDEO GENERATION PROMPTS
// ─────────────────────────────────────────────────────────────────────────────
// Product-focused prompts used by GeminiService.
//
//   1. VIDEO ANALYSIS       → VIDEO_ANALYSIS_PROMPT
//   2. AUDIO RATING         → AUDIO_RATING_PROMPT
//   3. PRODUCT IMAGE SHOTS  → buildVideoGenerationSchemaContext / buildVideoGenerationPrompt
// ─────────────────────────────────────────────────────────────────────────────

import {
  PRODUCT_IMAGE_SYSTEM_ROLE,
  PRODUCT_IMAGE_ANALYSIS_STEP,
  PRODUCT_SHOT_RULES,
  GENERIC_SHOT_RULES,
} from "../../inngest/functions/product-image-ads/prompts";

export const VIDEO_SFX_ANALYSIS_PROMPT = `You are a cinematic sound designer. You are analyzing the ORIGINAL AI-generated video, which contains native audio with sound effects baked in by the video model.

Your task is to AUDIT the existing sound effects in this video's audio track and describe them so they can be faithfully recreated.

For each sound effect you detect, provide:
- "prompt": A concise, descriptive prompt to recreate this exact sound effect (e.g., "magical sparkle burst", "product whoosh reveal", "impact energy hit"). Focus on the character and texture of the sound — not the source.
- "start": The start time in milliseconds when this effect begins.
- "end": The end time in milliseconds when this effect ends.
- "volume": A value between 0 and 1 representing the relative loudness of this effect as heard in the original video. Use 1.0 for prominent foreground effects, 0.3–0.6 for subtle or background-adjacent effects.

RULES:
1. **CLONE, DON'T INVENT**: Only describe SFX that actually exist in the audio. Do not add effects that aren't there.
2. **EXTREME SCARCITY**: Be incredibly selective. Only select the single most essential, highest-impact sound effect (e.g. the main reveal or a heavy impact).
3. **PUNCTUAL & DISCRETE ONLY**: The sound MUST be a short, discrete hit, whoosh, or impact. Do NOT return minor crackles, ambient sparkles, subtle hums, room tone, or any other continuous/ambient layer.
4. **EXCLUDE DIALOGUE & MUSIC**: Do not describe speech, vocals, narration, or background music. 
5. **ACCURATE TIMING**: Match the start/end times as precisely as possible to the actual audio event. If a sound is too subtle, ignore it entirely.

Return ONLY strictly valid JSON with:
{
  "effects": [
    {
      "prompt": "description of the sound to recreate",
      "start": <start time in ms>,
      "end": <end time in ms>,
      "volume": <0.0 to 1.0>
    }
  ]
}`;

export const VIDEO_ANALYSIS_PROMPT = `You are a Professional Direct Response Video Editor. Analyze this video's structure and style.
IMPORTANT: Provide a **concise, high-level structural overview**. Do NOT provide a second-by-second log of every single scene. Focus on the *types* of content and the editing techniques used.

Please analyze the video and provide the following fields in a JSON object:

1. **structure**: Group the video into key phases (e.g., Hook, Problem, Solution, Social Proof, CTA) with approximate time ranges. Describe the *purpose* and *type* of visuals for each phase.

2. **pacing**: A structured object containing:
   - "type": (string) e.g., "Fast", "Dynamic", "Slow", "Relaxed".
   - "secondsPerImage": (number) Average duration of a shot in seconds (e.g., 1.5, 3).
   - "description": (string) Brief description of the rhythm.

3. **animationStyle**: A structured object containing:
   - "type": (string) e.g., "Snap zooms", "Subtle scale-ins", "Kinetic Typography".
   - "details": (string) Brief description of movement patterns.
   - "typicalParams": (object) Typical animation parameters to recreate the style, e.g., { "scale": 1.1, "duration": 1000 }.

4. **transitionStyle**: A structured object containing:
   - "type": (string) e.g., "Hard Cut", "Cross Dissolve".
   - "duration": (number) Typical transition duration in ms (e.g., 0 for cuts, 500 for fades).
   - "description": (string) Brief description.

5. **visualStyle**: A structured object containing two distinct style profiles:
   - "product": {
       "aesthetic": (string) Style for product shots (e.g., "Clean Studio", "Lifestyle").
       "lighting": (string) e.g., "Soft Box", "Natural".
       "description": (string) Specific guidance for product imagery.
     }
   - "general": {
       "aesthetic": (string) Style for non-product visuals (e.g., "Cinematic", "Abstract").
       "lighting": (string) e.g., "Moody", "Ambient".
       "description": (string) Specific guidance for b-roll/conceptual imagery.
     }

6. **captionStyle**: A short, concise description of font, position, and animation.

7. **editingNotes**: Brief notes on audio/music and overall feel.

Return strictly valid JSON.`;

// ─────────────────────────────────────────────────────────────────────────────
// 2. AUDIO RATING
// ─────────────────────────────────────────────────────────────────────────────

export const AUDIO_RATING_PROMPT = `You are an expert in audio analysis. Analyze the audio quality of this video, with a focus on voice cloning suitability.
Rate the naturalness and clarity of the voice on a scale of 0 to 100, where 100 is perfectly natural, clear human speech ideal for voice cloning, and 0 is unusable.
Consider these factors:

*   **Naturalness (Weight: 50%):**  Assess how human-like the voice sounds. Look for natural prosody, intonation, and cadence.  Avoid voices that sound robotic, monotone, or artificial.

*   **Clarity (Weight: 30%):** Evaluate how clear and easy to understand the speech is.  The pronunciation should be distinct, and there should be minimal background noise or distortion.

*   **Absence of Artifacts (Weight: 20%):**  Identify any unwanted sounds or distortions such as robotic "metallic" sounds, hissing, popping, or excessive noise.

Return ONLY a JSON object with a single field "score" (number). The score must be an integer between 0 and 100.`;

// ─────────────────────────────────────────────────────────────────────────────
// 3. PRODUCT IMAGE SHOTS
// ─────────────────────────────────────────────────────────────────────────────
// Used by `generateProductImagePrompts`.
// Shot format: firstFramePrompt, videoPrompt, scenePrompt, words.

// ─── Segment Analysis Rules (static core, pacing injected as rule 8 by builder) ─

export const PRODUCT_IMAGE_SEGMENT_RULES = `**CRITICAL TAILORED INSTRUCTION (SEGMENT ANALYSIS):**
For EACH segment listed above, you MUST perform a word-by-word analysis. 
Your goal is to provide a nested sequence of visual shots that cover the ENTIRE narration text.

1. **GROUP BY SEGMENT**: You MUST return an array of objects, one for each segment ID.
2. **PHRASE PRESERVATION**: Do NOT split product names or logical blocks. "Natural Energy Supplement" stays TOGETHER.
3. **EXHAUSTIVE COVERAGE**: Within each segment, every single word MUST be assigned to exactly one shot. 
4. **VERBATIM RECONSTRUCTION**: If you join the "words" of all shots in a segment, it MUST exactly match the original narration.
5. **EXACT ID MATCHING (CRITICAL)**: You MUST return the \`segmentId\` for each segment EXACTLY as provided in the context above. Do NOT truncate, alter, or misspell the IDs.
6. **NO TEXT OR LABELS (HIGHEST PRIORITY)**: Visual prompts MUST NEVER contain or mention text, letters, numbers, labels, call-to-action buttons, or any kind of typography. Focus entirely on the visual composition, lighting, and mood.
7. **PRODUCT INTERACTION**: Whenever possible, describe how a person is interacting with the product (e.g., holding it, using it, gesturing towards it).`;

// ─── Shot Types ────────────────────────────────────────────────────────────────

export const PRODUCT_IMAGE_SHOT_TYPES = `**SHOT TYPES:**
1. **product**: Use this for shots that MUST feature the product from the reference image.
2. **generic**: Use this for thematic B-Roll shots relating to the narration or Video Topic.`;

// ─── Shot Structure ────────────────────────────────────────────────────────────

export const PRODUCT_IMAGE_SHOT_STRUCTURE = `**SHOT STRUCTURE (CRITICAL):**
Each shot must contain:
- **firstFramePrompt**: A detailed description of the very first frame.
- **videoPrompt**: A description of the action or movement.
- **scenePrompt**: A general description of the environment and aesthetic.
- **words**: The portion of the narration text.`;

// ─── Shot Type Selection & Visual Guidance ────────────────────────────────────

export const PRODUCT_IMAGE_SHOT_GUIDANCE = `**SHOT TYPE SELECTION & VISUAL GUIDANCE:**
- **Product Type Identification**: FIRST, identify the type of product (e.g., skincare, beverage, supplement, tech). Use this to set a contextually appropriate, realistic scene.
- **Contextual Hook**: For "generic" or "lifestyle" shots used as hooks, prioritize settings that relate to the product's purpose. If the product is about hydration, show a kitchen or a gym, not a random park.
- **Clean Daytime Aesthetic**: For all "product" type shots, use a "Clean, Realistic, Daytime" aesthetic. Avoid dramatic effects like heavy spotlights, dark shadows, or artificial neon.
- **Product introductions**: When the narration explicitly mentions the product name → Use "product" type.
- **Offers & Promotions**: Segments about deals, discounts, "Buy X Get Y" → "product" type is RECOMMENDED.
- **Call-to-Action (CTA)**: "Click here", "Visit now", "Order today" → You MUST use "product" type. Showcase the product ALONE on a clean surface or held by a PERSON in a bright, natural setting. NO dramatic spotlights.

**CRITICAL**: Avoid generic "filler" visuals. If the script says "Most people", show people in a setting relevant to the product's problem (e.g., a person looking at a glass of tap water for a water filter), not a generic city street.

**IMPORTANT**: This is guidance, not strict rules. Use your judgment to create the most engaging visual narrative. Balance product visibility with thematic variety.`;

// ─── Output Format ────────────────────────────────────────────────────────────

export const PRODUCT_IMAGE_OUTPUT_FORMAT = `**OUTPUT FORMAT:**
You MUST return a JSON array of Segment Objects.`;

// ─── Schema Context Builder ────────────────────────────────────────────────────

export function buildVideoGenerationSchemaContext(
  segmentsText: string,
  pacingInstruction: string,
  topicName?: string,
  topicDescription?: string,
): string {
  return `**VIDEO SCHEMA CONTEXT:**
The product will be featured in a video with the following segments and narration script:
${segmentsText}

**TOPIC CONTEXT:**
- Video Topic: ${topicName || "Not provided"}
- Video Description: ${topicDescription || "Not provided"}

${PRODUCT_IMAGE_SEGMENT_RULES}
8. **DENSITY**: ${pacingInstruction}

${PRODUCT_IMAGE_SHOT_TYPES}

${PRODUCT_IMAGE_SHOT_STRUCTURE}

${PRODUCT_IMAGE_SHOT_GUIDANCE}`;
}

// ─── Final Prompt Wrapper ──────────────────────────────────────────────────────
// Shared structure with buildProductImagePrompt — reuses the same imported pieces.

export function buildVideoGenerationPrompt(
  contextBlock: string,
  schemaContext: string,
  outputInstructions: string,
  styleDna?: string,
): string {
  const styleContext = styleDna
    ? `**VISUAL STYLE DNA (APPLY TO ALL PROMPTS):**\n${styleDna}\nYour descriptions MUST reflect this aesthetic.`
    : "";

  return `${PRODUCT_IMAGE_SYSTEM_ROLE}

${styleContext}

${contextBlock}

${PRODUCT_IMAGE_ANALYSIS_STEP}

${schemaContext}

${PRODUCT_SHOT_RULES}

${GENERIC_SHOT_RULES}

${outputInstructions}`;
}
