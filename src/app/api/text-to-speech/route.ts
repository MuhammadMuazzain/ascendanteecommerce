import { NextRequest, NextResponse } from "next/server";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

/**
 * POST /api/text-to-speech
 * Converts text to speech using ElevenLabs Text-to-Speech API
 *
 * Request body:
 * - text: string - The text to convert to speech
 * - voiceId: string - The ElevenLabs voice ID to use
 *
 * Returns: Audio data as audio/mpeg
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, voiceId } = body;

    if (!text) {
      return NextResponse.json({ error: "Text is required for audio generation" }, { status: 400 });
    }

    if (!voiceId) {
      return NextResponse.json(
        { error: "VoiceId is required for audio generation" },
        { status: 400 },
      );
    }

    const apiKey = process.env.ELEVENLABS_KEY || process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "ElevenLabs API key not configured" }, { status: 500 });
    }

    // Initialize ElevenLabs client
    const elevenlabs = new ElevenLabsClient({
      apiKey: apiKey,
    });

    // Generate speech using the SDK
    const audio = await elevenlabs.textToSpeech.convert(voiceId, {
      text: text,
      modelId: "eleven_multilingual_v2",
    });

    // Return the audio data directly
    return new NextResponse(audio, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
      },
    });
  } catch (error) {
    console.error("Error generating audio:", error);
    return NextResponse.json({ error: "Failed to generate audio" }, { status: 500 });
  }
}
