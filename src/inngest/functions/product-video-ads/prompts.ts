// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT AD PROMPTS
// ─────────────────────────────────────────────────────────────────────────────

// ─── SHARED BASE LOGIC (Shared with UGC but localized here for stability) ─────

export const UGC_VISUAL_ANALYSIS_STEP = `## STEP 1 — ANALYZE THE IMAGES

**Avatar:** Study their exact appearance — hair color and style, skin tone, clothing (colors, layers, fit), expression, overall vibe. You will describe this specific person in every shot.

**Product:** Study every physical detail — packaging shape, material finish (matte, glossy, metallic), dominant colors, label placement, reseal mechanism, size relative to a hand.`;

export const UGC_CRITICAL_REQUIREMENTS = `## CRITICAL RULES

**1. AVATAR CONTINUITY**
Every shot must describe the avatar by their specific visible features. Never say just "the avatar" — say "the young man with short dark brown hair and a navy blazer" every time.

**2. PRODUCT PACKAGING STAYS CLOSED**
Never describe opening the package, tasting, applying, or revealing internal contents. Always closed.

**3. VEO 3.1 SELF-CONTAINED PROMPTS**
videoPrompt is sent verbatim to Veo 3.1 for video generation. It must be 100% self-contained:
- Full avatar appearance description every time.
- Full product appearance description every time it is in the shot.
- No pronouns like "it", "the avatar", "the product" without a visual description.

**4. NO TEXT OR UI IN ANY VISUALS**
Never describe text overlays, captions, subtitles, title cards, or any on-screen graphics with labels. Visuals must be purely representational/cinematic without any written language.`;

// ─── PRODUCT IMAGE PROMPTS (Pacing & Context) ────────────────────────────────

export function buildProductContextBlock(
  productName?: string,
  productDescription?: string,
): string {
  return `**PRODUCT CONTEXT:**
- Product Name: ${productName || "Not provided"}
- Product Description: ${productDescription || "Not provided"}`;
}

export const PRODUCT_IMAGE_SYSTEM_ROLE = `You are a World-Class AI Video Director and Lead Prompt Engineer specializing in "Retention Editing"—creating fast-paced, hyper-stimulating visual flows that keep viewers hooked.
Your goal is to analyze a product reference image and convert a voiceover script into a sequence of precise, visual-heavy visual prompts (firstFramePrompt, videoPrompt, scenePrompt) that reflect the subtext and emotional arc of the advertisement.`;

export const PRODUCT_IMAGE_ANALYSIS_STEP = `**STEP 1: IMAGE ANALYSIS**
Analyze the provided reference image(s). Identify the core physical attributes: shape, color, material, and key brand elements.

**CRITICAL CONSTRAINT**: All visual prompts MUST describe a SINGLE unified scene. NEVER generate prompts for split-screens, collages, grids, or multi-frame compositions.`;

export const RETENTION_PACING_RULES = `**STEP 2: RETENTION-BASED PACING (MEANINGFUL SHOTS)**
In high-performance marketing, the timing of cuts prevents the brain from getting "bored", but shots MUST hold enough context to be visually coherent. 
Follow these logic triggers for visual cuts:
1. **PHRASE INTEGRITY (COHERENT BUNCHING) [CRITICAL]**: The \`words\` property MUST be a complete semantic phrase, clause, or thought. NEVER split product names, compound nouns, or grammatical units.
   - BAD: "Most people" | "have parasites" | "and have" | "no clue"
   - GOOD: "Most people have parasites" | "and have no clue."
   - BAD: "even brushing" | "your teeth abroad" | "can expose you" | "to microscopic parasites."
   - GOOD: "even brushing your teeth abroad" | "can expose you to microscopic parasites."
   - BAD: "the hydrogen" | "water bottle."
   - GOOD: "the hydrogen water bottle."
2. **THE NOUN-OBJECT MATCH (SEMANTIC SYNC)**: Trigger a cut whenever a new high-value subject or setting is introduced (e.g., cutting from "Tap water," to "hotel ice machines,").
3. **PUNCTUATION SYNC**: Use commas, periods, or natural breath pauses as natural cut points.
4. **THE TONE-SHIFT PIVOT**:
   - **PROBLEM PHASE**: Shorter, punchy phrases (~4-6 words). Use "gross" imagery and dark colors.
   - **SOLUTION PHASE**: Smoother, longer phrases (~6-9 words). Use bright lighting and clean tech visuals.
5. **NEVER OVER-CUT**: Do not cut every 1-3 words. The minimum duration is a complete spoken thought.`;

export function getProductImagePacingInstruction(): string {
  return RETENTION_PACING_RULES;
}

export const PRODUCT_SHOT_RULES = `**Rules for Product Reference (type: "product"):**
- **Implicit Product Placement**: If the script implies "relief", "solution", or "taking it", you MUST show the product even if it's not named.
- Refer to the main subject as "the product from the provided reference image".
- Ensure the product's color, logo, and form are identical to the reference.
- **NO TEXT**: Absolutely NO labels or UI elements in the prompt.`;

export const GENERIC_SHOT_RULES = `**Rules for Contextual Shots:**
- **type: "medical_cgi"**: Internal views (nerves, cells, inflammation). Use red for pain, blue for relief.
- **type: "lifestyle"**: High-end cinematic shots of people matching the audience profile.
- **type: "metaphor"**: Abstract surreal representations of concepts like time, energy, or restoration.
- **STRATEGIC MARKETING PHASES (VISUAL SELECTION)**:
    - **PHASE 1: THE HOOK / SHOCK**: Use high-energy, "shocking" metaphors or gritty lifestyle shots to grab attention. Relevant to the Product Context.
    - **PHASE 2: TRANSITION TO AUTHORITY**: Use clean, professional, and empathetic lifestyle shots (the "Expert's Domain").
    - **PHASE 3: SOLUTION / MECHANISM**: Prioritize \`medical_cgi\` or technical 3D animations explaining the product's function.
    - **PHASE 4: BENEFIT & SOCIAL PROOF**: Use high-key, vibrant, and vital lifestyle shots or metaphors reflecting "Relief".
    - **PHASE 5: CALL TO ACTION (CTA)**: Focus strictly on Product Heroes, Packaging Close-ups, or clear lifestyle results.
- **SENTIMENT LOGIC**: 
    - **Problem/Pain**: Gritty, high-contrast, dark lighting, rusty/jagged accents.
    - **Solution/Relief**: Bright, golden/blue lighting, smooth, vital textures.`;

export const SCHEMA_OUTPUT_INSTRUCTIONS = `Return a JSON array of objects with "segmentId" and "shots" (array) keys.
"shots" contains objects with "type", "words", "firstFramePrompt", "videoPrompt", and "scenePrompt".`;

export function buildProductImagePrompt(
  contextBlock: string,
  schemaContext: string,
  outputInstructions: string,
  styleDna?: string,
): string {
  const styleContext = styleDna
    ? `**VISUAL STYLE DNA (APPLY TO ALL PROMPTS):**\n${styleDna}\nYour descriptions MUST reflect this aesthetic.`
    : "";

  return `${PRODUCT_IMAGE_SYSTEM_ROLE}

${contextBlock}

${styleContext}

${PRODUCT_IMAGE_ANALYSIS_STEP}

${schemaContext}

${PRODUCT_SHOT_RULES}

${GENERIC_SHOT_RULES}

${outputInstructions}`;
}

// ─── PRODUCT VIDEO PROMPTS (Pacing & Context) ────────────────────────────────

export const VIDEO_RETENTION_PACING_RULES = `**RETENTION-BASED PACING (MEANINGFUL SHOTS)**
In high-performance marketing, the timing of cuts prevents the brain from getting "bored", but shots MUST hold enough context to be visually coherent. 
Follow these logic triggers for visual cuts:
1. **PHRASE INTEGRITY (COHERENT BUNCHING) [CRITICAL]**: The \`words\` property MUST be a complete semantic phrase, clause, or thought. NEVER split product names, compound nouns, or grammatical units.
   - BAD: "Most people" | "have parasites" | "and have" | "no clue"
   - GOOD: "Most people have parasites" | "and have no clue."
   - BAD: "even brushing" | "your teeth abroad" | "can expose you" | "to microscopic parasites."
   - GOOD: "even brushing your teeth abroad" | "can expose you to microscopic parasites."
   - BAD: "the hydrogen" | "water bottle."
   - GOOD: "the hydrogen water bottle."
2. **THE NOUN-OBJECT MATCH (SEMANTIC SYNC)**: Trigger a cut whenever a new high-value subject or setting is introduced (e.g., cutting from "Tap water," to "hotel ice machines,").
3. **PUNCTUATION SYNC**: Use commas, periods, or natural breath pauses as natural cut points.
4. **THE TONE-SHIFT PIVOT**:
   - **PROBLEM PHASE**: Shorter, punchy phrases (~4-6 words). Use "gross" imagery and dark colors.
   - **SOLUTION PHASE**: Smoother, longer phrases (~6-9 words). Use bright lighting and clean tech visuals.
5. **NEVER OVER-CUT**: Do not cut every 1-3 words. The minimum duration is a complete spoken thought.`;

export function getProductVideoPacingInstruction(): string {
  return VIDEO_RETENTION_PACING_RULES;
}

export function buildProductVideoSchemaContext(
  segmentsText: string,
  pacingInstruction: string,
  productName?: string,
  productDescription?: string,
  styleDna?: string,
): string {
  const styleContext = styleDna
    ? `**VISUAL STYLE DNA (APPLY TO ALL PROMPTS):**\n${styleDna}\nYour descriptions MUST reflect this aesthetic.`
    : "";

  return `${styleContext}

**VIDEO SCHEMA CONTEXT:**
The product will be featured in a video with the following segments and narration script:
${segmentsText}

**TOPIC CONTEXT:**
- Video Topic: ${productName || "Not provided"}
- Video Description: ${productDescription || "Not provided"}

**CRITICAL TAILORED INSTRUCTION (SEGMENT ANALYSIS):**
For EACH segment listed above, you MUST perform a word-by-word analysis.

1. **GROUP BY SEGMENT**: You MUST return an array of objects, one for each segment ID.
2. **STRATEGIC MARKETING PHASES (VISUAL SELECTION)**:
    - **PHASE 1: THE HOOK / SHOCK**: High-energy, shocking metaphors or gritty lifestyle.
    - **PHASE 2: TRANSITION TO AUTHORITY**: Clean, professional, empathetic lifestyle.
    - **PHASE 3: SOLUTION / MECHANISM**: Medical CGI or 3D animations.
    - **PHASE 4: BENEFIT & SOCIAL PROOF**: High-key, vibrant lifestyle/metaphors.
    - **PHASE 5: CALL TO ACTION (CTA)**: Product Heroes or lifestyle results.
3. **EXHAUSTIVE COVERAGE**: Every single word MUST be assigned to exactly one shot.
4. **VERBATIM RECONSTRUCTION**: "words" join MUST exactly match the original narration.
5. **NO TEXT**: Visual prompts MUST NEVER contain text, letters, numbers, or labels.
6. **DENSITY**: ${pacingInstruction}

**OUTPUT FORMAT (JSON ONLY):**
Example:
[
  {
    "segmentId": "hqt0wk04r",
    "shots": [
      {
        "type": "product",
        "words": "Experience the premium quality",
        "firstFramePrompt": "Cinematic close-up of the product packaging on a clean surface.",
        "videoPrompt": "The camera performs a slow, smooth orbit around the product.",
        "scenePrompt": "A high-end, bright commercial studio setting."
      }
    ]
  }
]`;
}

// ─── PRODUCT AD B-ROLL PROMPTS ────────────────────────────────────────────────

export const PRODUCT_AD_BROLL_TYPES = `**SHOT TYPE:**
- Use key "type" with value:
    1. **video**: The avatar is talking to the camera in a UGC style. This is the only allowed type for B-rolls.`;

export const PRODUCT_AD_BROLL_INTERACTION_DIRECTION = `**STEP 2: PRODUCT AD B-ROLL DIRECTION**
1. **STRATEGIC PLACEMENT CRITERIA**:
   - **PHASE 1: THE HOOK / SHOCK (HIDE AVATAR)**: Build the problem. Keep the avatar hidden.
   - **PHASE 2: TRANSITION TO AUTHORITY (SHOW AVATAR)**: Build trust. Generate avatar B-roll.
   - **PHASE 3: SOLUTION / MECHANISM (HIDE AVATAR)**: Visual explanation. Do NOT generate avatar B-roll.
   - **PHASE 4: BENEFIT & SOCIAL PROOF (SHOW AVATAR)**: Expert presence. Generate avatar B-roll.
   - **PHASE 5: CALL TO ACTION (CTA) (AVATAR OR GRAPHIC)**: Personal tip or offer.
2. **SHOT TYPE YIELD (CRITICAL)**:
   - Avatar MUST yield (hide) for \`medical_cgi\` shots.
   - Avatar should be shown for conversational lines like "Hopefully I'm not scaring you," "This is your sign."
3. **MANDATORY BACKGROUND CONSISTENCY**: Select ONE realistic environment for EVERY B-roll.
4. **MOOD & LIGHTING**: Align lighting with the product's use-case.`;

export const PRODUCT_AD_BROLL_INTERACTION_SHOT_STRUCTURE = `**SHOT STRUCTURE:**
- **firstFramePrompt**: neutral, attentive pose looking at the lens. Background must be sharp.
- **videoPrompt**: Verbal performance. Vary framing (Medium Shot vs Medium Close-up).
- **scenePrompt**: 100% sharp focus focus, no bokeh.
- **words**: EXACT VERBATIM substring from the segment text.`;

export const PRODUCT_AD_BROLL_PERSON_INTERACTION_ONLY_INSTRUCTIONS = `**STRICT VISIBILITY & ANONYMITY RULES:**
1. **ABSOLUTELY NO VISUAL SPECIFICITY**: Use ONLY "the person".
2. **ABSOLUTELY NO PRODUCT OR ITEM MENTIONS**: The person must NOT be described as holding or interacting with anything.
3. **SHARP ENVIRONMENT (MANDATORY)**: The environment MUST be 100% sharp and clear.
4. **UGC PERFORMANCE**: person talks directly to the lens.`;

export const PRODUCT_AD_BROLL_OUTPUT_FORMAT = `**OUTPUT FORMAT:**
Return a JSON array where each item has "segmentId" and "bRolls" (ARRAY of objects).
Example:
[
  {
    "segmentId": "id-1",
    "bRolls": [
      {
        "type": "video",
        "firstFramePrompt": "Medium shot of the person looking at the camera...",
        "videoPrompt": "The person starts naturally, then speaks to the lens...",
        "scenePrompt": "Interior setting with bright morning sunlight, 100% sharp focus.",
        "words": "believe it or not" 
      }
    ]
  }
]`;

export function buildProductAdBrollInteractionPrompt(
  segmentsText: string,
  topicName?: string,
  topicDescription?: string,
  productName?: string,
  productDescription?: string,
  styleDna?: string,
): string {
  const productContext = `**PRODUCT CONTEXT (FOR BACKGROUND INFO ONLY):**
- Product Name: ${productName || "Not provided"}
- Product Description: ${productDescription || "Not provided"}`;

  const styleContext = styleDna
    ? `**VISUAL STYLE DNA (APPLY TO OVERALL AESTHETIC):**\n${styleDna}`
    : "";

  return `You are an Expert AI Creative Director. Create generic B-roll prompts for a video ad focusing EXCLUSIVELY on the person (avatar) talking in a UGC style. 

**CRITICAL RULE: NEVER MENTION THE PRODUCT IN THE B-ROLL PROMPTS.**

${styleContext}

**VIDEO CONTEXT (SEGMENTS TEXT):**
${segmentsText}

**TOPIC CONTEXT:**
- Video Topic: ${topicName || "Not provided"}
- Video Description: ${topicDescription || "Not provided"}

${productContext}

${UGC_VISUAL_ANALYSIS_STEP}

${PRODUCT_AD_BROLL_INTERACTION_DIRECTION}

${PRODUCT_AD_BROLL_PERSON_INTERACTION_ONLY_INSTRUCTIONS}

${UGC_CRITICAL_REQUIREMENTS}

${PRODUCT_AD_BROLL_TYPES}

${PRODUCT_AD_BROLL_INTERACTION_SHOT_STRUCTURE}

${PRODUCT_AD_BROLL_OUTPUT_FORMAT}`;
}
