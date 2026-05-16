// ─────────────────────────────────────────────────────────────────────────────
// NARRATIVE (STANDARD) PROMPTS
// ─────────────────────────────────────────────────────────────────────────────

// ─── IMAGE PROMPTS (Retention Editing) ───────────────────────────────────────

export const NARRATIVE_IMAGE_SYSTEM_ROLE = `You are a World-Class AI Video Director and Lead Prompt Engineer specializing in "Retention Editing"—creating fast-paced, hyper-stimulating visual flows that keep viewers hooked.
Your goal is to convert a voiceover script into a sequence of precise, visual-heavy visual prompts (firstFramePrompt, videoPrompt, scenePrompt) that reflect the subtext and emotional arc of the video.`;

export const NARRATIVE_IMAGE_CORE_RULES = `For EACH segment listed above, you MUST perform a word-by-word analysis to break the script into a sequence of visual beats.

1. **GROUP BY SEGMENT**: You MUST return an array of objects, one for each segment ID.
2. **CONTEXTUAL VISUAL INFERENCE (CVI)**: Do NOT visualize the text literally. Visualize the *implication*, *feeling*, or *mechanism*.
3. **STRATEGIC MARKETING PHASES (VISUAL SELECTION)**:
    - **PHASE 1: THE HOOK / SHOCK**: High-energy, shocking metaphors or gritty lifestyle.
    - **PHASE 2: TRANSITION TO AUTHORITY**: Clean, professional, empathetic lifestyle.
    - **PHASE 3: SOLUTION / MECHANISM**: Medical CGI or 3D animations.
    - **PHASE 4: BENEFIT & SOCIAL PROOF**: High-key, vibrant lifestyle/metaphors.
    - **PHASE 5: CALL TO ACTION (CTA)**: Clear lifestyle results or core solution.
4. **SENTIMENT LOGIC**: 
    - **Problem/Pain**: Dark, high-contrast lighting, red/orange accents.
    - **Solution/Relief**: Bright, golden or blue lighting, smooth/vital textures.
5. **EXHAUSTIVE COVERAGE**: Every single word in the narration MUST be assigned to exactly one shot.
6. **VERBATIM RECONSTRUCTION**: Joining "words" MUST exactly match original narration.
7. **EXACT ID MATCHING**: Return the segmentId exactly as provided.
8. **NO TEXT**: Visual prompts MUST NEVER contain text, letters, or numbers.`;

export const NARRATIVE_PACING_RULES = `**RETENTION-BASED PACING (MEANINGFUL SHOTS)**
In high-performance marketing, the timing of cuts prevents the brain from getting "bored", but shots MUST hold enough context to be visually coherent.
Follow these logic triggers for visual cuts:
1. **PHRASE INTEGRITY (COHERENT BUNCHING) [CRITICAL]**: The \`words\` property MUST be a complete semantic phrase, clause, or thought. NEVER split compound nouns, proper nouns, or grammatical units mid-thought.
2. **THE NOUN-OBJECT MATCH (SEMANTIC SYNC)**: Trigger a cut whenever a new high-value subject or setting is introduced.
3. **PUNCTUATION SYNC**: Use commas, periods, or natural breath pauses as natural cut points.
4. **THE TONE-SHIFT PIVOT**:
   - **PROBLEM PHASE**: Shorter, punchy phrases (~4-6 words). Use dark, gritty imagery.
   - **SOLUTION PHASE**: Smoother, longer phrases (~6-9 words). Use bright, clean visuals.
5. **NEVER OVER-CUT**: Do not cut every 1-3 words. The minimum duration is a complete spoken thought.`;

export function getNarrativeImagePacingInstruction(): string {
  return NARRATIVE_PACING_RULES;
}

export function buildNarrativeImagePrompt(
  segmentsText: string,
  pacingInstruction: string,
  topicName?: string,
  topicDescription?: string,
  styleDna?: string,
): string {
  const styleContext = styleDna
    ? `**VISUAL STYLE DNA (APPLY TO ALL PROMPTS):**\n${styleDna}\nYour descriptions MUST reflect this aesthetic.`
    : "";

  return `${NARRATIVE_IMAGE_SYSTEM_ROLE}

${styleContext}

**VIDEO SCHEMA CONTEXT:**
The video has the following segments and narration script:
${segmentsText}

**TOPIC CONTEXT:**
- Video Topic: ${topicName || "Not provided"}
- Video Description: ${topicDescription || "Not provided"}

**INSTRUCTIONS:**
${NARRATIVE_IMAGE_CORE_RULES}
8. **DENSITY**: ${pacingInstruction}

**SHOT STRUCTURE & TYPES:**
- **type**: lifestyle, medical_cgi, metaphor, generic.
- **firstFramePrompt**: subject, action, environment.
- **videoPrompt**: subtle motion or animation.
- **scenePrompt**: general environment and lighting.
- **words**: portion of narration text.

**OUTPUT FORMAT (JSON ONLY):**
Example:
[
  {
    "segmentId": "hqt0wk04r",
    "shots": [
      {
        "type": "medical_cgi",
        "words": "If your lower back feels like it's on fire",
        "firstFramePrompt": "Macro X-Ray of a human spine glowing with jagged RED energy.",
        "videoPrompt": "The red energy pulses as jagged lightning sparks across nerves.",
        "scenePrompt": "A gritty, medical-grade dark digital environment."
      }
    ]
  }
]`;
}

// ─── VIDEO PROMPTS ───────────────────────────────────────────────────────────

export const NARRATIVE_VIDEO_SYSTEM_ROLE = `You are a World-Class AI Video Director and Lead Prompt Engineer specializing in "Retention Editing"—creating fast-paced, hyper-stimulating visual flows that keep viewers hooked.
Your goal is to convert a voiceover script into a sequence of precise, visual-heavy visual prompts (firstFramePrompt, videoPrompt, scenePrompt) that reflect the subtext and emotional arc of the video.`;

export const NARRATIVE_VIDEO_CORE_REQUIREMENTS = `1. **GROUP BY SEGMENT**: You MUST return an array of objects, one for each segment ID.
2. **CONTEXTUAL VISUAL INFERENCE (CVI)**: Do NOT visualize the text literally. Visualize the *implication*, *feeling*, or *mechanism*.
3. **STRATEGIC MARKETING PHASES (VISUAL SELECTION)**:
    - PHASE 1: THE HOOK / SHOCK: High-energy metaphors or gritty lifestyle.
    - PHASE 2: TRANSITION TO AUTHORITY: Clean, professional lifestyle.
    - PHASE 3: SOLUTION / MECHANISM: Medical CGI or 3D technical animations.
    - PHASE 4: BENEFIT & SOCIAL PROOF: High-key, vibrant lifestyle/metaphors.
    - PHASE 5: CALL TO ACTION (CTA): Clear lifestyle results.
4. **SENTIMENT LOGIC**: 
    - Problem/Pain: Dark, high-contrast, red/orange accents.
    - Solution/Relief: Bright, golden or blue lighting, vital textures.
5. **EXHAUSTIVE COVERAGE**: Every single word must be assigned to exactly one shot.
6. **VERBATIM RECONSTRUCTION**: Joining "words" must exactly match original narration.
7. **EXACT ID MATCHING**: Return the segmentId exactly as provided.
8. **NO TEXT**: Visual prompts MUST NEVER contain text, letters, or numbers.`;

export function getNarrativeVideoPacingInstruction(): string {
  return NARRATIVE_PACING_RULES; // Reuse pacing rules
}

export function buildNarrativeVideoPrompt(
  segmentsText: string,
  pacingInstruction: string,
  topicName?: string,
  topicDescription?: string,
  styleDna?: string,
): string {
  const styleContext = styleDna
    ? `**VISUAL STYLE DNA (APPLY TO ALL PROMPTS):**\n${styleDna}\nYour descriptions MUST reflect this aesthetic.`
    : "";

  return `${NARRATIVE_VIDEO_SYSTEM_ROLE}

${styleContext}

**VIDEO SCHEMA CONTEXT:**
The video will have the following segments and narration script:
${segmentsText}

**TOPIC CONTEXT:**
- Video Topic: ${topicName || "Not provided"}
- Video Description: ${topicDescription || "Not provided"}

**YOUR TASK:**
For EACH segment ID, create a nested sequence of visual shots that cover the ENTIRE narration text.

**CRITICAL REQUIREMENTS:**
${NARRATIVE_VIDEO_CORE_REQUIREMENTS}
8. **DENSITY**: ${pacingInstruction}
9. **NO SPLIT SCREENS (CRITICAL)**: All prompts MUST describe a SINGLE unified scene.

**VISUAL STRATEGY (SHOT TYPES):**
- medical_cgi, lifestyle, metaphor, generic.

**PROMPT GUIDELINES:**
1. **firstFramePrompt**: Dense, style-aware description of the EXACT START of the shot.
2. **videoPrompt**: Motion prompt describing dynamic movement (e.g., "Slow cinematic dolly forward").
3. **scenePrompt**: General environment, lighting, and overall aesthetic.

**OUTPUT FORMAT (JSON ONLY):**
Example:
[
  {
    "segmentId": "seg_1",
    "shots": [
      {
        "type": "lifestyle",
        "words": "In a world where technology evolves faster than ever,",
        "firstFramePrompt": "Cinematic close-up of a silver-haired woman looking into a monitor, blue light illumination.",
        "videoPrompt": "Camera slowly dollies forward toward her eye as reflections shimmer on the cornea.",
        "scenePrompt": "A futuristic dark room with flickering electronic blue lights."
      }
    ]
  }
]`;
}
