import { NextRequest, NextResponse } from "next/server";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

/**
 * GET /api/voices
 * Fetches available voices from ElevenLabs API
 * Returns a list of voices with their properties (name, gender, accent, etc.)
 */
export async function GET() {
  try {
    const apiKey = process.env.ELEVENLABS_KEY || process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "ElevenLabs API key not configured" }, { status: 500 });
    }

    // Initialize ElevenLabs client
    const elevenlabs = new ElevenLabsClient({
      apiKey: apiKey,
    });

    // Get all available voices using the SDK
    // This includes your account voices + pre-made voices
    const voicesResponse = await elevenlabs.voices.getAll();

    const accountVoices = voicesResponse.voices || [];

    // Shared/library voices may be unavailable on some plans — don't fail the whole request
    let sharedVoices: typeof accountVoices = [];
    try {
      const sharedVoicesResponse = await elevenlabs.voices.getShared({
        pageSize: 100,
      });
      sharedVoices = sharedVoicesResponse.voices || [];
    } catch (sharedError) {
      console.warn("Could not fetch shared ElevenLabs voices:", sharedError);
    }

    const allVoices = [...accountVoices, ...sharedVoices];

    console.log({
      accountVoices: accountVoices.length,
      sharedVoices: sharedVoices.length,
      total: allVoices.length,
    });

    const voices = allVoices;

    return NextResponse.json({ voices }, { status: 200 });
  } catch (error) {
    console.error("Error fetching voices:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch voices",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}
