import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { script } = await request.json();

    if (!script || typeof script !== "string" || !script.trim()) {
      return NextResponse.json(
        { error: "Script is required and must be a non-empty string" },
        { status: 400 },
      );
    }

    // Call OpenAI API to generate a title
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are a creative video title generator. Given a script or video content, generate a compelling, engaging title that:
- Is 3-8 words long
- Captures the main theme or message
- Is catchy and attention-grabbing
- Is appropriate for video content
- Avoids generic phrases like "Video about" or "Script for"

Examples:
- Script: "Learn how to cook pasta" → Title: "Master Pasta Cooking"
- Script: "The importance of exercise" → Title: "Exercise Your Way to Health"
- Script: "Tips for better sleep" → Title: "Sleep Better Tonight"

Generate only the title, nothing else.`,
          },
          {
            role: "user",
            content: script.trim(),
          },
        ],
        max_tokens: 50,
        temperature: 0.7,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json().catch(() => ({}));
      console.error("OpenAI API error:", errorData);
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const openaiData = await openaiResponse.json();

    if (!openaiData.choices || !openaiData.choices[0] || !openaiData.choices[0].message) {
      throw new Error("Invalid OpenAI response format");
    }

    const generatedTitle = openaiData.choices[0].message.content.trim().replace(/^["']|["']$/g, ""); // Remove leading/trailing quotes

    if (!generatedTitle) {
      throw new Error("Empty title generated");
    }

    return NextResponse.json({ title: generatedTitle });
  } catch (error) {
    console.error("Title generation error:", error);

    // Fallback to simple extraction if LLM fails
    try {
      const { script } = await request.json();
      const firstSentence = script.split(/[.!?]+/)[0]?.trim();
      let fallbackTitle = "Untitled Video";

      if (firstSentence && firstSentence.length > 0) {
        fallbackTitle =
          firstSentence.length > 50 ? `${firstSentence.substring(0, 47)}...` : firstSentence;
      } else {
        const words = script.trim().split(/\s+/).slice(0, 6);
        fallbackTitle = words.length > 0 ? words.join(" ") : "Untitled Video";
      }

      return NextResponse.json({ title: fallbackTitle });
    } catch (fallbackError) {
      console.error("Fallback title generation error:", fallbackError);
      return NextResponse.json({ error: "Failed to generate title" }, { status: 500 });
    }
  }
}
