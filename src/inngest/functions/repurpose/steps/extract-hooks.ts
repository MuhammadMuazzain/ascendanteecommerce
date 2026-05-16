import { GoogleGenAI } from "@google/genai";
import { config as appConfig } from "@/inngest/config";
import type { Paragraph } from "@/lib/transcribe/types";

// ─── Types ──────────────────────────────────────────────────────────────────

export type HookType = "importance" | "consequence" | "problem" | "contrast";

export interface Hook {
  start_time: string;
  end_time: string;
  spoken_text: string;
  hook_type: HookType;
  description: string;
  strength: number;
}

export interface ExtractHooksResult {
  hooks: Hook[];
}

export interface ExtractHooksOptions {
  paragraphs: Paragraph[];
}

// ─── Prompt ──────────────────────────────────────────────────────────────────

const HOOK_EXTRACTION_SYSTEM_PROMPT = `
# Persuasive Hook Extraction for E-commerce Scripts

You are an expert in **short-form e-commerce ad copy and persuasion**.

Your task is to extract **high-impact persuasive hooks** from a transcript.

The input is a list of time-aligned sentences.

---

## Definition: Persuasive Hook

A **persuasive hook** is a sentence (or group of consecutive sentences) that:

- Increases perceived importance, value, or urgency
- Makes the viewer think: “this matters” or “this applies to me”
- Strengthens desire, fear, curiosity, or belief

Hooks do NOT need to interrupt flow.

---

## What qualifies as a hook

Select segments that include one or more of:

### 1. High-Impact Claims
- “most important…”
- “involved in 300 functions”
- Expands scale or importance

### 2. Consequence / Loss Statements
- “you’re not getting all the benefits”
- Highlights what the user is missing or doing wrong

### 3. Problem Awareness
- Identifies symptoms or pain points

### 4. System-Wide Impact
- Affects many parts of the body/life
- Broad relevance

### 5. Contrast or Correction
- “but…”, “what most people don’t know…”
- Challenges assumptions

---

## What to ignore

Do NOT include:

- Generic filler (“I’m a pharmacist…”)
- Basic instructions
- Product descriptions
- Proof statements (“lab tested…”)
- CTAs

---

## Grouping Rule (IMPORTANT)

- You may **merge consecutive sentences** into one hook if they form a single idea
- Do NOT break a strong idea into multiple hooks
- Prefer **complete persuasive thoughts**

---

## Output Format (JSON)

\`\`\`json
{
  "hooks": [
    {
      "start_time": "00:10.88",
      "end_time": "00:22.82",
      "spoken_text": "Magnesium is one of the most important minerals in our entire body because it's involved in over three hundred functions. Your muscles, your nerves, your brain, your heart, your mitochondria, it all needs magnesium.",
      "hook_type": "importance | consequence | problem | contrast",
      "description": "Expands perceived importance using large-scale biological impact",
      "strength": 1-10
    }
  ]
}
\`\`\`
`.trim();

// ─── Helper ──────────────────────────────────────────────────────────────────

function formatSecondsToTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(2).padStart(5, "0");
  return `${String(mins).padStart(2, "0")}:${secs}`;
}

function buildTranscriptInput(paragraphs: Paragraph[]): string {
  const sentences = paragraphs.flatMap((p) =>
    p.sentences.map((s) => ({
      start_time: formatSecondsToTimestamp(s.start),
      end_time: formatSecondsToTimestamp(s.end),
      text: s.text,
    })),
  );
  return JSON.stringify(sentences, null, 2);
}

// ─── Step ────────────────────────────────────────────────────────────────────

/**
 * Uses Gemini to analyse time-aligned paragraphs and extract persuasive hooks
 * suitable for short-form e-commerce ad editing.
 */
export async function extractHooksWithGemini({
  paragraphs,
}: ExtractHooksOptions): Promise<ExtractHooksResult> {
  const gemini = new GoogleGenAI({ apiKey: appConfig.gemini.key });
  const model = appConfig.gemini.model2; // defaults to gemini-2.5-flash

  const transcriptInput = buildTranscriptInput(paragraphs);

  const response = await gemini.models.generateContent({
    model,
    contents: [
      { text: HOOK_EXTRACTION_SYSTEM_PROMPT },
      {
        text: `Here is the transcript:\n\n${transcriptInput}\n\nExtract the persuasive hooks.`,
      },
    ],
    config: {
      responseMimeType: "application/json",
    },
  });

  const text = response?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    return { hooks: [] };
  }

  try {
    const parsed = JSON.parse(text);
    return { hooks: Array.isArray(parsed.hooks) ? parsed.hooks : [] };
  } catch {
    console.error("[extract-hooks] Failed to parse Gemini response:", text);
    return { hooks: [] };
  }
}
