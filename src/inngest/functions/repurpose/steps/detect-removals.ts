import { GoogleGenAI } from "@google/genai";
import { config as appConfig } from "@/inngest/config";
import type { Paragraph, Word } from "@/lib/transcribe/types";

// ─── Types ──────────────────────────────────────────────────────────────────

export type RemovalCategory = "brand_mention" | "platform_mention" | "pricing_or_sales";

export interface RemovalSegment {
  /** Category that triggered this removal */
  category: RemovalCategory;
  /** Human-readable label for what was detected, e.g. "TikTok Shop" or "Flash Sale" */
  label: string;
  /** Start timestamp in seconds */
  start: number;
  /** End timestamp in seconds */
  end: number;
  /** The spoken sentence(s) containing the flagged content */
  spoken_text: string;
  /** Brief explanation of why this segment should be removed */
  reason: string;
}

export interface DetectRemovalsResult {
  removals: RemovalSegment[];
}

export interface DetectRemovalsOptions {
  paragraphs: Paragraph[];
  words: Word[];
  /** The advertiser's own product name. When provided, it is whitelisted and
   *  will NOT be flagged as an external brand mention. */
  productName?: string;
}

// ─── Prompt ──────────────────────────────────────────────────────────────────

const DETECT_REMOVALS_SYSTEM_PROMPT = `
# Content Removal Detection for E-commerce Video Repurposing

You are an expert video editor for an e-commerce brand. Your job is to review a transcript and identify segments that must be **removed or covered** before the video can be repurposed across platforms.

The input has two parts:
1. **sentences** — time-aligned sentences (text, start, end in seconds, paragraph_index)
2. **words** — word-level timestamps (word, start, end in seconds)

---

## Categories to Flag

### 1. Brand Mentions (category: "brand_mention")

Flag any content that names or implies a **specific external brand, store, or seller** that is not the advertiser.

Examples:
- "I got this from XYZ store"
- "This is made by BrandName"
- "Available at Walmart / Amazon / Target"
- "It's the ToePlex Magnesium" ← external product brand name

Why: We want videos to look platform-neutral and not affiliated with another store.

---

### 2. Platform Mentions (category: "platform_mention")

Flag any content that directly references:
- TikTok / TikTok Shop
- "orange shopping cart" / "orange cart"
- Shopping cart icon or any platform-specific UI element
- "link in bio", "swipe up" (when tied to a specific platform)

Examples:
- "in the orange shopping cart"
- "find it on TikTok Shop"
- "I'll link it in my TikTok bio"

Why: We keep videos platform-neutral so they work on any channel.

---

### 3. Pricing, Sales, and Inventory (category: "pricing_or_sales")

Flag any content that mentions:
- Specific prices or discounts ("$20 today only", "price dropped")
- Sale events ("Flash Sale", "Holiday Sale", "Black Friday", "amazing sale right now")
- Stock urgency ("only 10 left", "they usually sell out", "grab it quick")
- Back-in-stock announcements or time-limited offers

Examples:
- "grab it quick because it's on an amazing sale right now and when the price goes this low they usually sell out"
- "only $19.99 this week"
- "back in stock!"

Why: These segments make the video feel outdated once the sale ends.

---

## Trimming Rule (IMPORTANT)

A sentence may contain **both clean content and flagged content**.

When this happens, you MUST try to trim the segment to cover only the flagged portion — **not the entire sentence** — but only if the **remaining portion still makes grammatical sense and stands on its own**.

### How to trim

1. Identify the exact words where the flagged content starts and ends.
2. Look up those words in the **words** array to get their precise \`start\` and \`end\` timestamps.
3. Set \`spoken_text\` to only the trimmed flagged portion.
4. Set \`start\` and \`end\` to match the trimmed word timestamps.

### Example

Sentence: "If you want to try this I'll link it right down there in the orange shopping cart they have fast free shipping but grab it quick because it's on an amazing sale right now and when the price goes this low they usually sell out."

- Flagged portion: "in the orange shopping cart they have fast free shipping but grab it quick because it's on an amazing sale right now and when the price goes this low they usually sell out"
- Safe remainder: "If you want to try this I'll link it right down there" ← still makes sense ✓
- So: output ONLY the flagged portion with its word-level timestamps, not the full sentence.

### When NOT to trim

If cutting out the flagged portion would leave a **meaningless fragment** (e.g. "And" or "So"), flag the entire sentence instead.

---

## General Rules

- Do NOT flag general CTAs like "try this product" or "leave a comment" unless they include a platform reference.
- If a sentence only mentions "price" generically (e.g. "it's worth the price") without a specific sale, do NOT flag it.
- Do NOT flag brand names that clearly refer to the advertiser's own product.

---

## Output Format (JSON)

Return ONLY valid JSON:

\`\`\`json
{
  "removals": [
    {
      "category": "brand_mention | platform_mention | pricing_or_sales",
      "label": "orange shopping cart / sale urgency",
      "start": 101.845,
      "end": 109.045006,
      "spoken_text": "in the orange shopping cart they have fast free shipping but grab it quick because it's on an amazing sale right now and when the price goes this low they usually sell out.",
      "reason": "References the TikTok orange cart UI and creates time-limited sale urgency"
    }
  ]
}
\`\`\`

If no segments need removal, return: \`{"removals": []}\`
`.trim();

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface FlatSentence {
  text: string;
  start: number;
  end: number;
  paragraph_index: number;
}

function flattenSentences(paragraphs: Paragraph[]): FlatSentence[] {
  return paragraphs.flatMap((p, pIdx) =>
    p.sentences.map((s) => ({
      text: s.text,
      start: s.start,
      end: s.end,
      paragraph_index: pIdx,
    })),
  );
}

// ─── Step ────────────────────────────────────────────────────────────────────

/**
 * Uses Gemini to scan time-aligned transcript sentences and detect segments
 * that should be removed or covered:
 *   - Brand / competitor mentions
 *   - Platform mentions (TikTok, orange cart, etc.)
 *   - Pricing, sales, or inventory urgency
 *
 * When only part of a sentence is flagged, Gemini trims to the problematic
 * sub-span (using word timestamps) if the remainder still makes sense.
 */
export async function detectRemovalsWithGemini({
  paragraphs,
  words,
  productName,
}: DetectRemovalsOptions): Promise<DetectRemovalsResult> {
  const gemini = new GoogleGenAI({ apiKey: appConfig.gemini.key });
  const model = appConfig.gemini.model2; // defaults to gemini-2.5-flash

  const sentences = flattenSentences(paragraphs);

  const transcriptInput = JSON.stringify({ sentences, words }, null, 2);

  // Build an optional whitelist note to inject into the user message
  const whitelistNote = productName
    ? `\n\n## OUR PRODUCT (DO NOT FLAG)\nThe advertiser's product is called: "${productName}". Do NOT flag any mention of "${productName}" as a brand mention — it is our own product.`
    : "";

  const response = await gemini.models.generateContent({
    model,
    contents: [
      { text: DETECT_REMOVALS_SYSTEM_PROMPT },
      {
        text: `Here is the transcript data:\n\n${transcriptInput}${whitelistNote}\n\nIdentify all segments that must be removed or covered. Apply sub-sentence trimming where appropriate.`,
      },
    ],
    config: {
      responseMimeType: "application/json",
    },
  });

  const text = response?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    return { removals: [] };
  }

  try {
    const parsed = JSON.parse(text);
    return { removals: Array.isArray(parsed.removals) ? parsed.removals : [] };
  } catch {
    console.error("[detect-removals] Failed to parse Gemini response:", text);
    return { removals: [] };
  }
}
