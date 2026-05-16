import type { Schema } from "@/lib/schema-generator/types";

export const SCHEMA_OUTPUT_INSTRUCTIONS = `Return a JSON array of objects with "segmentId" and "shots" (array) keys.
"shots" contains objects with "type", "words", "firstFramePrompt", "videoPrompt", and "scenePrompt".`;

const BASE_SYSTEM_INSTRUCTIONS = `You are a professional video editor and script analyst. You will be provided with a video script, containing scenes with narration text and visual descriptions.

Your task is to ENHANCE this script into a coherent video schema. 

IMPORTANT REQUIREMENTS:
1. **Script Parsing & Narrative Flow**: 
    - Parse the "Narrator" text from the script to design a **conversational visual sequence**.
    - Each segment's narration SHOULD feel like a single coherent thought or beat, ideally **6-8 seconds** (approx 18-25 words).
    - **PRIORITIZE COHESION**: Do not split mid-sentence or mid-phrase if it breaks the speaker's emotional momentum. It is better to have one 9-second segment that stays in a natural scene than two awkward 4.5-second segments that force a visual jump cut.
    - **SCENE CONTINUITY**: Think of the video as a single performance. Use \`isContinuation: true\` liberally to keep the avatar in the same setting/pose unless the topic shift is significant enough to warrant a visual "reset".
    - **AVOID CHOPPINESS**: If several short sentences follow each other, group them into a single segment to allow for a more relaxed, authentic UGC feel.
    - **REDUCE JUMP CUTS**: Each new segment *without* \`isContinuation: true\` creates a visual jump. Minimize these unless you are intentionally moving between "Problem", "Solution", or "CTA" phases.
    - **COST BALANCE**: While maximizing segment duration reduces costs, do not sacrifice narrative clarity or visual rhythm for minor savings.

2. **Metadata Generation**: For every segment generated (including split segments), provide:
   - "id": a unique identifier (use "seg-1", "seg-2" etc.)
   - "title": concise, evocative summary of this specific segment
   - "text": the narrator text for this segment
   - "description": enriched narrative based on the original block's visual description, tailored to this specific segment's text
   - "prompt_preview": a richly detailed visual prompt designed to generate a thumbnail-style image representing this segment. Describe subject, setting, mood, composition, and lighting.
    - "tags": array of 3-5 keywords describing the main subject, action, and mood
    - "mergeWithNext": boolean indicating if this segment should merge with the next one (true if both are short and semantically related, false for topic changes)
    - "isContinuation": boolean indicating if this segment is a continuation of the previous one (true if it should stay in the same scene/background, false if it's a topic change that needs a new scene)

3. **Segment Merging & Scene Continuation Strategy**:
   - Set \"mergeWithNext\": true when ALL of the following conditions are met:
     a) The current segment is SHORT (< 15 words / ~5 seconds)
     b) The next segment is also SHORT and semantically related (similar topic/theme)
     c) Combined length would be ≤ 24 words (~8 seconds)
   - Set \"isContinuation\": true when the segment continues the same visual theme, environment, or product demonstration as the previous one.
   - Set \"isContinuation\": false when there is a significant shift in topic, tone, or when moving between problem, solution, and CTA. Topic changes MUST start a new visual scene.
   - You MUST maximize segment duration towards the 7-8 second limit by using \"mergeWithNext\" and \"isContinuation\" appropriately.

General guidance:
- Visual prompts MUST NEVER CONTAIN OR CREATE text, letters, numbers, or any kind of typography.
- Ensure the "prompt_preview" has a deep, direct relationship with the narrating "text" to reinforce the message.

Return a JSON object with this structure:
{
  "title": "Overall video title",
  "description": "Overall video description",
  "tags": ["Main Topic", "Visual Style", "Core Subject"],
  "prompt_preview": "A detailed thumbnail-style prompt representing the entire video",
  "segments": [
    {
      "id": "segment-id",
      "title": "Segment title",
      "text": "Narrator text for this segment (target ~15-24 words)",
      "description": "Short internal summary",
      "tags": ["keyword1", "keyword2"],
      "prompt_preview": "Detailed visual description for this segment",
      "mergeWithNext": false,
      "isContinuation": false
    }
  ]
}`;

export function buildGenericSystemPrompt(input: Schema): string {
  return `${BASE_SYSTEM_INSTRUCTIONS}

SPECIFIC MODE: AI NARRATIVE VIDEO (Generic/Storytelling/Educational)
- Focus on smooth narrative flow and creative, evocative imagery.
- Visual style: "${input.visuals.style}".
- Pacing: "${input.pacing || "dynamic"}".
- The prompts should capture the soul and atmosphere of the script.`;
}

export function buildProductSystemPrompt(input: Schema): string {
  return `${BASE_SYSTEM_INSTRUCTIONS}

SPECIFIC MODE: PRODUCT VIDEO ADS
- Focus on high-converting advertising visuals that highlight product features and benefits.
- Visual style: "${input.visuals.style}".
- Pacing: "${input.pacing || "fast"}".
- Prompts MUST emphasize the product, using clean studio lighting or premium lifestyle settings as appropriate.
- Maintain consistent visual representation of the product throughout segments.`;
}

export function buildUgcSystemPrompt(input: Schema): string {
  return `${BASE_SYSTEM_INSTRUCTIONS}

SPECIFIC MODE: UGC VIDEO ADS
- Focus on authentic, user-generated style visuals with AI avatars.
- Visual style: "${input.visuals.style}".
- Pacing: "${input.pacing || "dynamic"}".
- Prompts should describe relatable settings (home, office, outdoors) where a person is speaking to the camera or demonstrating a product.
- Ensure the avatar's presence is described in the prompts.`;
}

export function buildVideoSchemaSystemPrompt(input: Schema): string {
  switch (input.type) {
    case "product-video-ad":
      return buildProductSystemPrompt(input);
    case "ugc-video-ad":
      return buildUgcSystemPrompt(input);
    case "narrative-video":
    default:
      return buildGenericSystemPrompt(input);
  }
}

function buildAssetsText(assets?: Schema["assets"]): string {
  if (!assets || assets.length === 0) return "";
  return (
    `AVAILABLE PRODUCT/SUBJECT ASSETS:\n` +
    assets
      .map((asset) => `- [Asset ID: ${asset.id}] Name: ${asset.name}, Type: ${asset.type}`)
      .join("\n")
  );
}

export function buildGenericUserPrompt(input: Schema): string {
  return `Transform this narrative script into a video schema.

${input.topic?.name ? `TOPIC: ${input.topic.name}` : ""}
${input.topic?.description ? `DESCRIPTION: ${input.topic.description}` : ""}

VIDEO SCRIPT:
${input.script}

Visual Style: ${input.visuals.style}
Pacing: ${input.pacing || "dynamic"}

Requirement: Return ONLY the JSON object.`;
}

export function buildProductUserPrompt(input: Schema): string {
  const assetsText = buildAssetsText(input.assets);
  return `Transform this product ad script into a video schema.

PRODUCT NAME: ${input.product?.name || input.topic?.name || "Unknown Product"}
PRODUCT DESCRIPTION: ${input.product?.description || input.topic?.description || "No description provided"}

${assetsText ? assetsText + "\n\n" : ""}VIDEO SCRIPT:
${input.script}

Visual Style: ${input.visuals.style}
Pacing: ${input.pacing || "fast"}

Requirement: Ensure segments highlight the product value proposition. Return ONLY the JSON object.`;
}

export function buildUgcUserPrompt(input: Schema): string {
  const assetsText = buildAssetsText(input.assets);
  return `Transform this UGC ad script into a video schema.

AVATAR: ${input.avatar?.name || "AI Spokesperson"}
${input.topic?.name ? `SUBJECT: ${input.topic.name}` : ""}

${assetsText ? assetsText + "\n\n" : ""}VIDEO SCRIPT:
${input.script}

Visual Style: ${input.visuals.style}
Pacing: ${input.pacing || "dynamic"}

Requirement: Prompts should reflect a natural, human-captured feel. Return ONLY the JSON object.`;
}

export function buildVideoSchemaUserPrompt(input: Schema): string {
  switch (input.type) {
    case "product-video-ad":
      return buildProductUserPrompt(input);
    case "ugc-video-ad":
      return buildUgcUserPrompt(input);
    case "narrative-video":
    default:
      return buildGenericUserPrompt(input);
  }
}

export function buildVideoSchemaContext(
  segmentsText: string,
  pacingInstruction: string,
  topicName?: string,
  topicDescription?: string,
): string {
  return `**VIDEO SCHEMA CONTEXT:**
The subject will be featured in a video with the following segments and narration script:
${segmentsText}

**TOPIC CONTEXT:**
- Video Topic: ${topicName || "Not provided"}
- Video Description: ${topicDescription || "Not provided"}

**CRITICAL TAILORED INSTRUCTION (SEGMENT ANALYSIS):**
For EACH segment listed above, you MUST perform a word-by-word analysis. 
Your goal is to provide a nested sequence of visual shots that cover the ENTIRE narration text.

1. **GROUP BY SEGMENT**: You MUST return an array of objects, one for each segment ID.
2. **EXHAUSTIVE COVERAGE**: Within each segment, every single word MUST be assigned to exactly one shot. 
3. **VERBATIM RECONSTRUCTION**: If you join the "words" of all shots in a segment, it MUST exactly match the original narration.
4. **EXACT ID MATCHING**: You MUST return the \`segmentId\` for each segment EXACTLY as provided.
5. **NO TEXT OR LABELS**: Visual prompts MUST NEVER contain or mention text, letters, numbers, or typography.
6. **DENSITY**: ${pacingInstruction}

**SHOT STRUCTURE:**
Each shot must contain:
- **type**: logical category (lifestyle, generic, etc.)
- **firstFramePrompt**: detailed description of the starting frame.
- **videoPrompt**: description of action or movement.
- **scenePrompt**: general environment and aesthetic.
- **words**: portion of the narration text.`;
}

export function buildVideoPrompt(
  contextBlock: string,
  schemaContext: string,
  outputInstructions: string,
  styleDna?: string,
): string {
  const styleContext = styleDna
    ? `**VISUAL STYLE DNA (APPLY TO ALL PROMPTS):**\n${styleDna}\nYour descriptions MUST reflect this aesthetic.`
    : "";

  return `You are a Professional Video Director. Use the following context and rules:

${styleContext}

${contextBlock}

${schemaContext}

${outputInstructions}`;
}
