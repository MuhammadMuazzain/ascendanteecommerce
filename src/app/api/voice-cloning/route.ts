import { NextRequest, NextResponse } from "next/server";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

/**
 * POST /api/voice-cloning
 * Clone a voice from audio URLs
 *
 * Request body:
 * - name: string - Voice name (required)
 * - description: string - Voice description (optional)
 * - fileUrls: string[] - List of audio file URLs (required, 1-25 files recommended)
 * - labels: object - Optional labels
 *
 * Returns: Cloned voice details
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, fileUrls, labels } = body;

    // Validation
    if (!name) {
      return NextResponse.json({ error: "Voice name is required" }, { status: 400 });
    }

    if (!fileUrls || !Array.isArray(fileUrls) || fileUrls.length === 0) {
      return NextResponse.json(
        { error: "At least one audio file URL is required" },
        { status: 400 },
      );
    }

    if (fileUrls.length > 25) {
      return NextResponse.json({ error: "Maximum 25 audio files allowed" }, { status: 400 });
    }

    const apiKey = process.env.ELEVENLABS_KEY || process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "ElevenLabs API key not configured" }, { status: 500 });
    }

    // Initialize ElevenLabs client
    const elevenlabs = new ElevenLabsClient({
      apiKey: apiKey,
    });

    // Helper to download files from URLs
    const downloadFile = async (url: string): Promise<File> => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download audio from ${url}`);
      }
      const blob = await response.blob();
      const fileName = url.split("/").pop() || "sample.mp3";
      return new File([blob], fileName, { type: blob.type });
    };

    // Download all files from URLs
    const files = await Promise.all(fileUrls.map(downloadFile));

    // Clone the voice using the SDK (IVC - Instant Voice Cloning)
    const cloneResponse = await elevenlabs.voices.ivc.create({
      name: name,
      description: description || undefined,
      files: files,
      labels: labels,
      removeBackgroundNoise: true,
    });

    // Fetch the full voice details
    const voice = await elevenlabs.voices.get(cloneResponse.voiceId);

    return NextResponse.json(
      {
        voice_id: voice.voiceId,
        name: voice.name,
        description: voice.description,
        preview_url: voice.previewUrl,
        labels: voice.labels,
        category: voice.category,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error cloning voice:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to clone voice",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/voice-cloning
 * List all cloned voices (user-created voices)
 *
 * Returns: List of cloned voices
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

    // Get all voices
    const voicesResponse = await elevenlabs.voices.getAll();

    // Filter for cloned voices (category: 'cloned' or 'generated')
    const clonedVoices = (voicesResponse.voices || []).filter(
      (voice) => voice.category === "cloned" || voice.category === "generated",
    );

    const voices = clonedVoices.map((voice) => ({
      voice_id: voice.voiceId,
      name: voice.name,
      description: voice.description,
      preview_url: voice.previewUrl,
      category: voice.category,
      labels: voice.labels,
    }));

    return NextResponse.json({ voices }, { status: 200 });
  } catch (error) {
    console.error("Error fetching cloned voices:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch cloned voices",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}
