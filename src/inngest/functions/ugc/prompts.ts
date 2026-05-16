// ─────────────────────────────────────────────────────────────────────────────
// UGC VIDEO PROMPTS
// ─────────────────────────────────────────────────────────────────────────────

export const MOUTH_CONTROL =
  "Perfect audio-visual alignment, highly expressive and dynamic lip-sync that exactly matches the spoken words. Mouth rests naturally closed only when audio ceases.";

export const AUDIO_CONTROL = "Clear studio voiceover, clean audio track, pure isolated speech.";

export const DELIVERY_CONTROL =
  "Confident, fluent delivery with smooth, continuous speech and natural professional cadence. NO hesitation, NO stumbled words, NO filler words, NO vocal clutter. STICKLY FORBIDDEN: 'um', 'uh', 'er', 'ah', 'meh', 'hmm', or any other non-script sounds. Subject must deliver the SCRIPT exactly as written with perfect professional articulation.";

export const UGC_NEGATIVE_PROMPT =
  "text, captions, overlays, on-screen graphics, subtitles, typography, letters, words, watermark, logos, branding, zoom, camera transitions, visual effects, blurred, low quality, distorted features, static image.";

export function buildUgcNegativePrompt() {
  return UGC_NEGATIVE_PROMPT;
}

export function buildUgcPrompt(videoPrompt?: string) {
  return `
${videoPrompt || ""}
DELIVERY: ${DELIVERY_CONTROL}
${MOUTH_CONTROL}
STRICTLY NO ON-SCREEN TEXT, NO CAPTIONS, NO OVERLAYS. THE FRAME MUST BE CLEAN OF ALL TYPOGRAPHY.
`.trim();
}

// ─── System Role ──────────────────────────────────────────────────────────────

export const UGC_SYSTEM_ROLE = `You are an Expert AI Creative Director and Direct-Response Ad Specialist specializing in AUTHENTIC UGC product ads for social media (TikTok/Reels/Shorts).
Your goal is to design a visual sequence that is both natural and high-converting. You understand that the first 3 seconds (The Hook) are critical, and the Call to Action (CTA) must be visually clear.
Your primary duty is to the **visual flow and rhythm** of the final video, ensuring it feels like a real person's genuine recommendation while keeping the product centered at key persuasion beats.`;

// ─── Step 1: Visual Analysis ──────────────────────────────────────────────────

export const UGC_VISUAL_ANALYSIS_STEP = `## STEP 1 — ANALYZE THE IMAGES

**Avatar:** Study their exact appearance — hair color and style, skin tone, clothing (colors, layers, fit), expression, overall vibe. You will describe this specific person in every shot.

**Product:** Study every physical detail — packaging shape, material finish (matte, glossy, metallic), dominant colors, label placement, reseal mechanism, size relative to a hand. Internalize these five product view modes:

| View | When to use |
|---|---|
| **package_hero** | Full packaging upright, label fully facing camera. Use for "this is the product" moments — first reveal or a strong endorsement. |
| **package_closeup** | Camera tight on one detail — logo, texture, key ingredient text. Use for "here's what makes it special" or feature callouts. |
| **product_in_hand** | Avatar holds the closed package naturally while speaking. Best for genuine mid-explanation UGC feel. |
| **product_on_surface** | Package rests on a counter/table in frame while avatar speaks beside it. Best for a relaxed intro or lifestyle shot. |
| **product_reveal** | Avatar reaches for and picks up the product, bringing it into frame. Use for the very first time the product appears. |

**Product Scale & Sizing:** Determine the physical size of the product relative to a human hand or a standard surface. **Look at all provided product images (including hero shots and closeups) to accurately estimate this scale.** Define it as a concise phrase (e.g., "palm-sized small bottle", "large cereal-style box", "thin credit-card sized device"). Use this understanding to maintain perfect scale consistency in your descriptions.`;

// ─── Step 2: Script Intelligence ─────────────────────────────────────────────

export const UGC_SCRIPT_INTELLIGENCE = `## STEP 2 — NARRATIVE ARC ANALYSIS (INTERNAL REASONING — DO NOT OUTPUT THIS STEP)

Read the full script and assign each segment a **PHASE** from this 5-phase UGC ad arc:

| Phase | What it is | Product on screen? |
|---|---|---|
| **HOOK** | Opening statement that grabs attention | **YES** if the topic/product is mentioned immediately. Otherwise, NO. |
| **PROBLEM / MYTH** | Describing a pain point, myth, or misconception | **YES** if the product/topic is mentioned. Otherwise, NO. |
| **BRIDGE / EDUCATION** | Explaining concepts without naming the product | NO product. |
| **PRODUCT REVEAL** | First transition from problem to solution | **YES** — \`product_reveal\`. |
| **PROOF / ENDORSEMENT** | Quality claims, active product explanation | **YES** — \`product_in_hand\` or \`package_closeup\`. |
| **CTA** | Final call to action | **YES** — \`package_hero\`. |

**ASSIGNMENT RULES (SENTIMENT-AWARE):**
1. **The "Problem" Phase (HOOK/PROBLEM):** If the segment describes a problem, symptom, or negative state (e.g., "if your gut looks like this"), use \`type: "generic"\`. **DO NOT show the product yet UNLESS the product name, core topic, or main ingredient (e.g., "methylene blue" for "Methylene Blue Gummies") is explicitly mentioned.** The focus is on the speaker's concern, but mentioning the product name/topic ALWAYS overrides this restriction.
2. **The "Solution" Phase (BENEFIT/ACTION):** Once the script introduces the solution or specific product benefits, use \`type: "product"\` and show the product prominently.
3. **KEYWORD OVERRIDE (CRITICAL):** Show the product if the words explicitly mention its name, core ingredient, or purpose. Demonstrative pronouns ("this", "like this") referring to a symptom or problem do NOT trigger a product shot, but "this" referring to the product DOES.
4. **Continuity:** Once the product is revealed, keep it visible in subsequent related segments.`;

// ─── B-Roll Instructions ──────────────────────────────────────────────────────

export const UGC_BROLL_INSTRUCTIONS = `## UNIVERSAL B-ROLL LOGIC PATTERN
This framework aligns visual changes with human psychology and retention.

### 1. The "Action-Verb" Trigger (Demonstration)
**Logic:** Whenever the script describes a physical interaction with the product.
*   **Keywords to Scan for:** *Apply, eat, drink, open, spray, mix, wear, click, unbox.*
*   **B-Roll Type:** **The "Hands-on" Shot.** Close-ups of hands interacting with the product.
*   **Goal:** To prove the product is real and show the viewer exactly how they would use it.

### 2. The "Sentiment & Benefit" Trigger (Lifestyle)
**Logic:** Whenever the script mentions a result, a feeling, or the "pain point" being solved.
*   **Keywords to Scan for:** *Energy, sleep, glowing, confidence, stress, outdoor, workout, morning routine.*
*   **B-Roll Type:** **The "Context" Shot.** A medium shot of the creator in their natural environment (kitchen, gym, park, office) looking happy, relieved, or active.
*   **Goal:** To help the viewer "self-identify" with the lifestyle the product provides.
*   **Product Presence:** The product DOES NOT need to be in this shot. A pure lifestyle shot provides a better visual break.

### 3. The "Texture & Quality" Trigger (Trust)
**Logic:** Whenever the script mentions ingredients, specifications, or quality claims.
*   **Keywords to Scan for:** *Natural, organic, high-quality, ingredients, texture, smell, details, specifically.*
*   **B-Roll Type:** **The "Macro" Shot.** Extreme close-ups of the product's texture (the cream, the powder, the fabric) or the packaging labels.
*   **Goal:** To provide "Visual Proof" of quality and build consumer trust.

### 4. The "Demonstrative & Educational" Trigger (Helper)
**Logic:** Whenever the script uses demonstrative pronouns like "this," "that," "here," or phrases like "for example," "specifically," or explains a concept that needs visual proof.
*   **Keywords to Scan for:** *this, that, here, for example, looks like, symptoms, diagram, shows.*
*   **B-Roll Type:** **The "Educational" Shot.** A visual aid (diagram, chart, or representative image) that confirms the speaker's statement.
*   **Trigger Rule (MULTIPLE TRIGGERS):** If a single segment contains multiple demonstratives (e.g., "looks like **this** (1) or like **this** (2)"), you **MUST** generate a separate B-roll/Overlay for **each** occurrence.
*   **Goal:** To provide immediate visual clarity for conceptual or clinical points.
*   **Literal Visualization (CRITICAL):** If "this" or "like this" refers to a physical body part or condition (e.g., "my belly looks like this", "my skin looked like this"), the B-roll **MUST** show a realistic, cinematic example of that physical part/condition. DO NOT jump to microscopic bacteria or internal diagrams unless the script explicitly says "let's look inside" or "this is the bacteria."
*   **Display Style (MANDATORY):** For demonstrative phrases like "this," "like this," or "looks like this," **ALWAYS use \`displayMode: "overlay"\`**. These are pointers that should appear beside the speaker. Use \`displayMode: "cutaway"\` ONLY for major scenery changes or transitions where the speaker is not the focus.

**STRICT A-ROLL VS. B-ROLL CONSTRAINTS**
*   **A-Roll Priority:** The Avatar A-Roll is ALWAYS the base layer. B-rolls should ONLY happen *organically* when one of the 4 strict triggers above is met. 
*   **No Forced Interrupts:** Do not randomly insert B-rolls just to fill time. 
*   **No Talking Heads in B-Roll:** The creator can be in the B-roll (acting, reacting, smiling, looking thoughtful), but must NEVER be speaking to the camera.
*   **Overlay Placement:** Overlays must stay in the "negative space" of the frame (corners or sides) to avoid covering the avatar's face or mouth.
*   **Prompt Quality (CRITICAL):**
    *   **firstFramePrompt (CRITICAL):** Must be a **cinematic, realistic, or professional graphic prompt**. 
    *   **NO TEXT RULE:** Never generate images with letters, numbers, labels, or UI text. Describe clear, wordless visual metaphors instead.
    *   **STYLE:** Prioritize realistic, photorealistic, or cinematic aesthetics. Avoid "flat illustrations" or "labeled diagrams."
    *   **videoPrompt**: Describe the **motion** and **evolution** of the visual. If it's a graphic, describe how it "animates" or "pulses." If it's a cutaway, describe any subtle subject actions. **STRICTLY FORBIDDEN: Do not describe camera movement like zooming or panning.**

**THE PING-PONG EFFECT (CRITICAL)**
*   When a B-roll IS organically triggered, it must follow the "Ping-Pong" pacing between the Creator (A-Roll) and the Visuals (B-Roll).
*   **MAXIMUM 4 SECONDS:** A B-roll must NEVER cover an entire script segment. It must be a short 2-4 second cutaway before returning to the A-Roll.
*   **COHERENT PHRASES ONLY:** The \`words\` property must be the **specific word or short phrase** that triggers the visual (e.g., "looks like this"). If there are multiple triggers, each B-roll should only cover its specific trigger words.`;

// ─── Critical Requirements ────────────────────────────────────────────────────

export const UGC_CRITICAL_REQUIREMENTS = `## CRITICAL RULES

**1. AVATAR CONTINUITY**
Every shot must describe the avatar by their specific visible features. Never say just "the avatar" — say "the young man with short dark brown hair and a navy blazer" every time.

**2. PRODUCT PACKAGING STAYS CLOSED**
Never describe opening the package, tasting, applying, or revealing internal contents. Always closed.
Allowed actions: hold it, tap the closed packaging, point to the label, rotate to show the back, bring it toward the camera, place it on a surface.

**3. PRODUCT IN SHOT — MANDATORY RULES**
- **firstFramePrompt:** Describe the product's position using the chosen view label in brackets — e.g. [product_on_surface].
- **videoPrompt:** If the avatar does not yet have the product → they must reach for it and pick it up. Describe this motion explicitly.
  If they already have it → describe what they do with it (show it, tap it, hold it toward camera).
- Re-describe the product's full physical appearance in every videoPrompt where it is present (Veo 3.1 is stateless — it doesn't remember previous shots).

**4. VEO 3.1 VIDEO EXTENSION LOGIC (CRITICAL FOR CONTINUATIONS)**
The system uses Veo 3.1's "Video to Video" extension feature for segments marked \`isContinuation: true\`.
- If a segment is a CONTINUATION of the prior segment, the \`videoPrompt\` MUST seamlessly continue the physical action of the prior segment. 
- DO NOT start a new action or jump cut. If segment 1 ended with them holding the product up, segment 2's \`firstFramePrompt\` must show them holding it up, and segment 2's \`videoPrompt\` should describe them continuing that action (e.g., "The avatar continues holding the [Product] up, gesturing with the other hand while speaking.")

**5. VEO 3.1 SELF-CONTAINED PROMPTS**
videoPrompt is sent verbatim to Veo 3.1 for video generation. It must be 100% self-contained:
- Full avatar appearance description every time.
- Full product appearance description every time it is in the shot.
- No pronouns like "it", "the avatar", "the product" without a visual description.

**6. NO TEXT OR UI IN ANY VISUALS (A-ROLL OR B-ROLL)**
Never describe text overlays, captions, subtitles, title cards, or any on-screen graphics with labels. Visuals must be purely representational/cinematic without any written language.

**7. AUTHENTIC UGC AESTHETIC (CRITICAL)**
- **Handheld Imperfection:** Describe natural handheld camera movement, subtle lens breathing, and micro-shakes. Aim for a "shot-on-iPhone" or "TikTok vertical video" feel.
- **Natural Lighting:** Prioritize natural window light, slight overexposure in bright areas, or warm indoor lamp lighting. Avoid "studio" or "perfectly flat" lighting.
- **Depth of Field:** Use a shallow depth of field (blurred background) to make the subject pop, but keep it feeling like a wide-aperture phone lens.
- **Micro-Movements:** The avatar should feel alive. They should occasionally glance at their own hand/product, adjust their posture, or have a subtle natural "verbal pause" in their movement.
- **Lived-in Environments:** Settings should feel real (e.g., a kitchen with a cloth on the counter, a living room with a slightly rumpled pillow).
- **Portrait Focus:** Every description should reinforce the **vertical 9:1 vertical aspect ratio** with the subject centered.

**8. NO ZOOM OR TRANSITIONS (FORBIDDEN)**
- **Fixed Camera:** The camera must remain at a fixed distance from the subject throughout the clip.
- **No Zooming:** Do not describe any zooming (in or out) or focal length changes.
- **No Transitions:** Do not describe any internal transitions, fades, or cuts within a single shot description. Each clip must be a single, continuous take from a fixed position.
`;

// ─── Shot Structure ────────────────────────────────────────────────────────────

export const UGC_SHOT_STRUCTURE = `## SHOT STRUCTURE

**type** — \`"product"\` if the product appears. \`"generic"\` if no product.

**CONSISTENCY RULE — firstFramePrompt and videoPrompt must tell the same story.** The view you chose in Step 2 locks both fields. Use this table:

| Chosen view | firstFramePrompt must show | videoPrompt must animate |
|---|---|---|
| product_reveal | Product on surface, avatar not holding it yet | Avatar reaches for it, picks it up, brings it toward camera, continues speaking while holding it |
| product_in_hand | Avatar already holding product in one hand | Avatar holds it, extends it toward camera, taps closed packaging, or gestures while holding it |
| package_hero | Product centered prominently in frame, label forward, avatar behind/beside it | Avatar holds it up centered in front of lens, label fully visible, speaking behind it |
| package_closeup | Tight frame on a specific product detail | Camera stays close on that detail while avatar's voice narrates; avatar hand may rotate the package |
| generic | Avatar only, no product | Avatar speaks, gestures, reacts — no product |
| EXTENSION (Continuation) | EXACTLY matches the end state of the previous segment | Continues the exact same physical action and environment as the previous segment |

**firstFramePrompt** — Frozen starting frame. Describe the avatar (appearance, pose, expression, location) and, if product is present, its exact position using the view label.
> product_in_hand: "[product_in_hand] The [AVATAR] stands in a bright kitchen, holding the closed [PRODUCT] dark navy stand-up pouch naturally in their right hand at chest height, label facing the camera, smiling confidently."
> product_reveal: "[product_reveal] The [AVATAR] stands in a modern living room, looking at the camera. The closed [PRODUCT] dark navy stand-up pouch sits on the wooden coffee table in front of them, label facing forward."
> generic: "The [AVATAR] stands in a warmly lit living room, looking directly at camera with a knowing expression, one hand raised slightly."

**videoPrompt** — Detailed motion description, avatar appearance, product interaction.
**scenePrompt** — (Optional) Concise scene description.
**words** — Exact narration text for this segment.

**ACTION EXAMPLES (FOR THE "ACTION:" SECTION):**
- **product_reveal:** "[product_reveal] The [FULL AVATAR DESCRIPTION] reaches forward to the coffee table, picks up the closed [FULL PRODUCT DESCRIPTION], raises it to chest height [product_in_hand] with the label facing the camera, and continues speaking while holding it up."
- **product_in_hand:** "[product_in_hand] The [FULL AVATAR DESCRIPTION] holds the closed [FULL PRODUCT DESCRIPTION] naturally in one hand, extends it slightly toward the lens, then pulls it back and speaks with their free hand gesturing."
- **continuation:** "[product_in_hand] The [FULL AVATAR DESCRIPTION] continues standing in the bright kitchen holding the closed [FULL PRODUCT DESCRIPTION]. They gently tap the label with one finger while speaking directly to the camera."
- **generic:** "The [FULL AVATAR DESCRIPTION] speaks to the camera, raises one finger to mark a point, gently shakes their head to signal disagreement, confident and composed."

**⚠️ GESTURE SAFETY RULE (CRITICAL):**
- **NEVER describe finger counting** (e.g. "holds up two fingers", "counts on fingers", "shows two fingers"). AI video models cannot reliably render specific finger positions and will produce incorrect or offensive results (e.g. middle finger instead of two fingers).
- Instead, use **named gestures with clear social meaning**:
  - ✅ "nods twice to emphasize the point"
  - ✅ "holds up a peace sign / V-shape briefly, then lowers hand"
  - ✅ "raises an open palm to emphasize"
  - ✅ "gently shakes head to signal disagreement"
  - ✅ "raises one index finger to make a point"
  - ❌ "holds up two fingers" / "counts to two on fingers" / "shows the number with fingers"

**scenePrompt** — (Optional) Concise scene description.
**words** — Exact narration text for this segment.`;

// ─── Output Format ────────────────────────────────────────────────────────────

// ─── Output Format (Shots) ───────────────────────────────────────────────────

export const UGC_SHOT_OUTPUT_FORMAT = `## OUTPUT FORMAT (JSON ONLY)
Return a JSON array of objects, one per segment:
\`\`\`
[
  {
    "segmentId": "<segment id>",
    "shots": [
      {
        "type": "product" | "generic",
        "firstFramePrompt": "...",
        "videoPrompt": "Detailed motion description.",
        "scenePrompt": "(Optional) Concise scene description.",
        "words": "Exact narration text.",
        "hasProductInteraction": true
      }
    ]
  }
]
\`\`\`
**Note:** Set \`hasProductInteraction\` to \`true\` ONLY IF the physical product packaging is visibly present, being held, or interacted with by the avatar in this specific shot. 
**STRICT VISIBILITY RULE (OVERRIDES ALL OTHER RULES):** If the script \`words\` for this segment explicitly mention the product name, its core topic/ingredient (e.g., "methylene blue" for "Methylene Blue Gummies"), a product category (e.g., "this cream", "this device"), or the speaker says "this" referring to the product, you **MUST** make this a product shot (\`type: "product"\`) and you **MUST** set \`hasProductInteraction: true\`. This rule takes precedence even in the Hook or Problem phases.
**STORYTELLING GUIDANCE:** For all other segments, prioritize a smooth, natural-feeling UGC performance. Do not force generic shots if they create jarring visual jumps or break the avatar's performance rhythm.`;

// ─── Output Format (B-rolls) ─────────────────────────────────────────────────

export const UGC_BROLL_OUTPUT_FORMAT = `## OUTPUT FORMAT (JSON ONLY)
Return a JSON array of objects, one per segment:
\`\`\`
[
  {
    "segmentId": "<segment id>",
    "bRolls": [
      {
        "type": "b-roll",
        "displayMode": "cutaway" | "overlay",
        "position": { "x": number, "y": number },
        "scale": number,
        "firstFramePrompt": "A highly detailed, self-contained image generation prompt for the FROZEN STARTING FRAME of this B-roll clip. Describe the exact product, composition, lighting, surface, and environment. Do NOT reference asset filenames like image_1.png. Example: 'A macro close-up of small blue cubic gummy supplements piled on a pristine white marble surface. Natural daylight from the left creates soft shadows, revealing the slightly crystalline texture of the gummies. Shallow depth of field, photorealistic.'",
        "videoPrompt": "...",
        "scenePrompt": "...",
        "words": "..."
      }
    ]
  }
]
\`\`\`
**IMPORTANT FOR bRolls ARRAY:**
- A single segment can contain **multiple** objects in the \`bRolls\` array.
- Generate one \`bRoll\` object for **every individual trigger** identified (e.g., if the script says "this or this", generate two separate overlays).
- Each \`bRoll\` should have its own \`words\` property matching exactly what it visualizes.

**IMPORTANT FOR displayMode & positioning:**
- Use \`displayMode: "cutaway"\` (full screen) for major transitions or demonstration clips.
- Use \`displayMode: "overlay"\` (small graphic on top of avatar) for quick "helpers", diagrams, or icons that reinforce specific words (like "this" or "fever").
- For \`overlay\`, provide \`position\` (0-100 x/y) and \`scale\` (0.1 to 0.5). Default to top-right or side-space to avoid covering the face.

**IMPORTANT FOR firstFramePrompt:** This is a prompt sent directly to an image generation AI. It must be 100% self-contained, descriptive, and photorealistic. Never use references like 'image_1.png', 'the product from above', or 'as labeled'. Always describe the product's actual physical appearance in full detail.`;

// ─── Prompt Builder (Shots) ──────────────────────────────────────────────────

export function buildUgcShotPrompt(
  segmentsText: string,
  topicName?: string,
  topicDescription?: string,
  productName?: string,
  productDescription?: string,
  styleDna?: string,
  assetLabels?: string,
): string {
  const assetContext = assetLabels ? `**PRODUCT ASSET LABELS:**\n${assetLabels}` : "";

  const styleContext = styleDna
    ? `## VISUAL STYLE REFERENCE\n${styleDna}\nApply this aesthetic to all shot descriptions while maintaining the UGC feel.\n\n`
    : "";

  const specificProductName = productName || "the product";

  const dynamicScriptIntelligence = `## STEP 2 — CONTENT OPTIMIZATION (INTERNAL REASONING — DO NOT OUTPUT THIS STEP)

**ENVIRONMENT CONTEXT (CRITICAL):**
All script segments are recorded in the **SAME SCENE and SAME PLACE**. This is a single, continuous UGC setting (e.g., a home, studio, or desk). Maintain visual continuity.

**PRODUCT VISIBILITY RULES:**
1. **The "Problem" Phase (HOOK/PROBLEM):** If the segment describes a problem, symptom, or negative state (e.g., "if your gut looks like this"), use \`type: "generic"\`. **DO NOT show the product yet UNLESS its name or core topic is mentioned.**
2. **The "Solution" Phase (BENEFIT/ACTION):** Once the script introduces the solution or specific product benefits, use \`type: "product"\`.
3. **No False Reveals:** Do not show the product if the speaker is using "this" to refer to a symptom.
4. **Variety:** Use different angles (closeup, medium) in the same scene.`;

  const dynamicShotOutputFormat = `## OUTPUT FORMAT (JSON ONLY)
Return a JSON array of objects, one per segment:
\`\`\`
[
  {
    "segmentId": "<segment id>",
    "shots": [
      {
        "type": "product" | "generic",
        "firstFramePrompt": "...",
        "videoPrompt": "Detailed motion description.",
        "scenePrompt": "(Optional) Concise scene description.",
        "words": "Exact narration text.",
        "hasProductInteraction": true
      }
    ]
  }
]
\`\`\`
**SHOT SELECTION GUIDELINE:**
- Use \`type: "product"\` and \`hasProductInteraction: true\` whenever the product is visible or being used.
- Since it is the **same scene**, prioritize showing the product frequently to optimize for engagement and conversion.
- Only use \`type: "generic"\` if the segment is purely conceptual and showing the product would feel forced.`;

  return `${UGC_SYSTEM_ROLE}

---

## CONTEXT

**Product name:** ${productName || "Not provided"}
**Product description:** ${productDescription || "Not provided"}

**Video topic:** ${topicName || "Not provided"}
**Video description:** ${topicDescription || "Not provided"}

${assetContext ? `${assetContext}\n\n` : ""}${styleContext}## SCRIPT SEGMENTS

${segmentsText}

---

${UGC_VISUAL_ANALYSIS_STEP}

${dynamicScriptIntelligence}

${UGC_CRITICAL_REQUIREMENTS}

${UGC_SHOT_STRUCTURE}

${dynamicShotOutputFormat}`;
}

// ─── Prompt Builder (B-rolls) ────────────────────────────────────────────────

export function buildUgcBrollPrompt(
  segmentsText: string,
  topicName?: string,
  topicDescription?: string,
  productName?: string,
  productDescription?: string,
  styleDna?: string,
  assetLabels?: string,
): string {
  const assetContext = assetLabels ? `**PRODUCT ASSET LABELS:**\n${assetLabels}` : "";

  const styleContext = styleDna
    ? `## VISUAL STYLE REFERENCE\n${styleDna}\nApply this aesthetic to all B-roll descriptions.\n\n`
    : "";

  return `You are an AI Video Creative Director specializing in UGC B-Roll logic. Your job is to generate supplementary cutaway shots based on the **Universal B-Roll Logic Pattern**.

**CRITICAL INSTRUCTION FOR ORGANIC TRIGGERS & THE PING-PONG EFFECT:**
In UGC ads, the Avatar's face and voice (A-Roll) are the most important part of the video. **Your default state should be to return ZERO B-rolls per segment.**
*   ONLY generate a B-roll if the script *organically* triggers it (an Action, a Lifestyle/Sentiment, or a Quality feature).
*   If the script is just a general introduction, transition, or hook, stay 100% on the A-Roll.
*   If a B-roll IS triggered, it must be a **brief 2-4 second interruption** that "ping-pongs" the viewer's attention away from the creator and back again. 
*   NEVER make a B-roll cover the entirety of a segment. 
*   You control the length of the B-roll by selecting the \`words\` substring. 
*   The \`words\` MUST be a logically coherent phrase or complete clause that takes 2-4 seconds to read aloud. NEVER select broken fragments.

## AI IMPLEMENTATION FRAMEWORK (LOGIC FLOW)

1.  **Sentiment/Keyword Analysis:** Parse the transcript strictly for Action, Benefit/Sentiment, or Quality keywords.
2.  **A-Roll Context Check:** Review what the Avatar is doing in the A-Roll for that segment. Ensure your B-roll choice provides a strong visual contrast (e.g., if A-roll is holding the product, B-roll should be a Macro detail or a Lifestyle reaction).
3.  **Coherent Phrase Selection:** If an organic trigger is found, identify the exact 2-4 second phrase/clause in the text that justifies the B-roll. Extract it perfectly.
4.  **B-Roll Mapping:** Assign either a Hands-on, Context, or Macro shot to that specific phrase. If no organic trigger is found, return an empty array \`[]\`.
5.  **Pacing Evaluation:** Verify that the chosen \`words\` still leave enough A-Roll time in the segment so the viewer reconnects with the creator.

---

## CONTEXT

**Product name:** ${productName || "Not provided"}
**Product description:** ${productDescription || "Not provided"}

**Video topic:** ${topicName || "Not provided"}
**Video description:** ${topicDescription || "Not provided"}

${assetContext ? `${assetContext}\n\n` : ""}${styleContext}## SCRIPT SEGMENTS

${segmentsText}

---

${UGC_CRITICAL_REQUIREMENTS}

${UGC_SHOT_STRUCTURE}

${UGC_BROLL_INSTRUCTIONS}

${UGC_BROLL_OUTPUT_FORMAT}`;
}
// ─── Output Format (Unified) ────────────────────────────────────────────────

export const UGC_UNIFIED_OUTPUT_FORMAT = `## OUTPUT FORMAT (JSON ONLY)
Return a JSON array of objects, one per segment:
\`\`\`
[
  {
    "segmentId": "<segment id>",
    "shots": [
      {
        "type": "product" | "generic",
        "firstFramePrompt": "...",
        "videoPrompt": "Detailed motion description.",
        "scenePrompt": "(Optional) Concise scene description.",
        "words": "Exact narration text.",
        "hasProductInteraction": true
      }
    ],
    "bRolls": [
      {
        "type": "b-roll",
        "displayMode": "cutaway" | "overlay",
        "position": { "x": number, "y": number },
        "scale": number,
        "firstFramePrompt": "A highly detailed, self-contained image generation prompt for the FROZEN STARTING FRAME of this B-roll clip. Describe the exact product, composition, lighting, surface, and environment. Do NOT reference asset filenames like image_1.png.",
        "videoPrompt": "...",
        "scenePrompt": "...",
        "words": "..."
      }
    ]
  }
]
\`\`\`
**STRICT VISIBILITY RULE (Shots - OVERRIDES ALL OTHER RULES):** If the script \`words\` for this segment explicitly mention the product name, its core topic/ingredient (e.g., "methylene blue" for "Methylene Blue Gummies"), a product category (e.g., "this cream", "this device"), or the speaker says "this" referring to the product, you **MUST** make this a product shot (\`type: "product"\`) and you **MUST** set \`hasProductInteraction: true\`. This rule takes precedence even in the Hook or Problem phases.

**IMPORTANT FOR bRolls ARRAY:**
- Generate one \`bRoll\` object for **every individual trigger** identified (e.g., if the script says "this or this", generate two separate overlays).
- Each \`bRoll\` should have its own \`words\` property matching exactly what it visualizes.
- If no organic trigger is found for B-rolls in a segment, return an empty array \`[]\` for \`bRolls\`.`;

// ─── Prompt Builder (Unified) ────────────────────────────────────────────────

export function buildUgcUnifiedPrompt(
  segmentsText: string,
  topicName?: string,
  topicDescription?: string,
  productName?: string,
  productDescription?: string,
  styleDna?: string,
  assetLabels?: string,
): string {
  const assetContext = assetLabels ? `**PRODUCT ASSET LABELS:**\n${assetLabels}` : "";

  const styleContext = styleDna
    ? `## VISUAL STYLE REFERENCE\n${styleDna}\nApply this aesthetic into your descriptions while maintaining the UGC feel.\n\n`
    : "";

  const dynamicScriptIntelligence = `## STEP 2 — CONTENT OPTIMIZATION (INTERNAL REASONING — DO NOT OUTPUT THIS STEP)

**ENVIRONMENT CONTEXT (A-Roll):**
All script segments are recorded in the **SAME SCENE and SAME PLACE**. Maintain visual continuity for the Avatar.

**B-ROLL TRIGGER LOGIC:**
ONLY generate B-rolls (cutaways or overlays) when the script organically triggers them (Action, Sentiment/Lifestyle, Quality Feature, or Demonstrative pointer like "this" or "here"). 
The A-Roll (Avatar speaking) is the base layer. B-rolls should be brief (2-4 seconds) and "ping-pong" the attention.`;

  return `${UGC_SYSTEM_ROLE}

---

## CONTEXT

**Product name:** ${productName || "Not provided"}
**Product description:** ${productDescription || "Not provided"}

**Video topic:** ${topicName || "Not provided"}
**Video description:** ${topicDescription || "Not provided"}

${assetContext ? `${assetContext}\n\n` : ""}${styleContext}## SCRIPT SEGMENTS

${segmentsText}

---

${UGC_VISUAL_ANALYSIS_STEP}

${dynamicScriptIntelligence}

${UGC_CRITICAL_REQUIREMENTS}

${UGC_SHOT_STRUCTURE}

${UGC_BROLL_INSTRUCTIONS}

${UGC_UNIFIED_OUTPUT_FORMAT}`;
}
