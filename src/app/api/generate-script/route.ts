import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { script, duration = 25 } = await req.json();

    if (!script) {
      return NextResponse.json({ error: "The 'script' field is required" }, { status: 400 });
    }

    // Validate duration: clamp between 15 and 45 seconds
    const durationNum = Number(duration);
    const safeDuration = !isNaN(durationNum) ? durationNum : 25;
    const targetDuration = Math.min(45, Math.max(15, safeDuration));

    // Calculate approximate word count (average speaking rate: ~150 words/minute = 2.5 words/second)
    const wordsPerSecond = 2.5;
    const targetWordCount = Math.round(targetDuration * wordsPerSecond);

    // Calculate timing breakdown based on duration
    const hookDuration = Math.max(3, Math.round(targetDuration * 0.1)); // ~10% for hook
    const closingDuration = Math.max(3, Math.round(targetDuration * 0.1)); // ~10% for closing
    const bodyDuration = targetDuration - hookDuration - closingDuration;

    // Define distinct archetypes to force variety
    const archetypes = [
      {
        name: "The Contrarian",
        instruction:
          'Adopt a "Contrarian" persona. Challenge common beliefs about the topic. Start by telling the audience why everything they think they know might be wrong. Be bold, slightly provocative, and eye-opening. Do not be polite; be disruptive.',
      },
      {
        name: "The Storyteller",
        instruction:
          'Adopt a "Storyteller" persona. Do NOT give advice directly. Instead, start immediately with a specific, vivid story or scenario (e.g., "Imagine it is 1999..." or "He was broke and alone...") that illustrates the topic. Let the lesson emerge naturally from the narrative.',
      },
      {
        name: "The Realist",
        instruction:
          'Adopt a "No-Nonsense Realist" persona. Speak with urgency and tough love. Stop coddling the viewer. Use short, punchy sentences. Tell them the hard truth they need to hear to get results. Think David Goggins or a strict coach.',
      },
      {
        name: "The Visionary",
        instruction:
          'Adopt a "Visionary" persona. Focus on the big picture and future possibilities. Use poetic, inspiring language. Paint a picture of what life COULD be like. Use metaphors and emotional imagery to uplift the viewer.',
      },
      {
        name: "The Analyst",
        instruction:
          'Adopt an "Analyst" persona. Present the topic as a formula, a hack, or a psychological fact. Use precise language. Start with "Here is the exact framework..." or "Psychology says...". Focus on the mechanics and "how-to".',
      },
    ];

    // Select a random archetype to ensure every generation feels different
    const archetype = archetypes[Math.floor(Math.random() * archetypes.length)];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert video scriptwriter specializing in high-retention short-form content (TikTok, Reels, Shorts).

Your goal is to write a script that STOPS the scroll and holds attention until the very end.

**CORE PRINCIPLES (NON-NEGOTIABLE):**
1.  **Grade 6-8 Readability:** Use simple, punchy words. No jargon. No complex sentences.
2.  **No Fluff:** Every word must earn its place. Cut "Hello everyone," "Welcome back," and "In this video."
3.  **Visual Language:** Write for the ear AND the eye.

**STRUCTURE:**
1.  **THE HOOK (0-3s):** You must shatter the viewer's pattern. Use a "Scroll Stopper" statement that is controversial, counter-intuitive, or creates an immediate open loop.
2.  **THE RETAINER (3-15s):** deliver value immediately but keep the final payoff for the end (Open Loop).
3.  **THE PAYOFF (15-${targetDuration}s):** Deliver the core insight and end on a high note.

**CURRENT PERSONA: ${archetype.name}**
**STYLE INSTRUCTION: ${archetype.instruction}**

**CONSTRAINTS:**
-   **Duration:** Exactly ${targetDuration} seconds when spoken (approx ${targetWordCount} words).
-   **Format:** Return ONLY the raw spoken text. No headers (e.g., "Hook:", "Body:"). No scene descriptors.
-   **Tone:** Conversational, fast-paced, and magnetic.`,
        },
        {
          role: "user",
          content: `Generate a unique video script about the following topic using the "${archetype.name}" persona:\n\n${script}\n\nTarget exactly ${targetDuration} seconds. Return ONLY the spoken words.`,
        },
      ],
      temperature: 0.9,
    });

    const generatedScript = (completion.choices[0]?.message?.content || "").trim();

    if (!generatedScript) {
      return NextResponse.json({ error: "Unable to generate the script" }, { status: 500 });
    }

    return new NextResponse(generatedScript, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    console.error("Error in /generate-script:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Error generating the script", details: errorMessage },
      { status: 500 },
    );
  }
}
