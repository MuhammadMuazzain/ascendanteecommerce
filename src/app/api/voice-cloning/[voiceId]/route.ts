import { NextRequest, NextResponse } from "next/server";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

/**
 * GET /api/voice-cloning/[voiceId]
 * Get detailed information about a specific cloned voice
 *
 * Returns: Voice details including samples
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ voiceId: string }> },
) {
  try {
    const { voiceId } = await params;

    if (!voiceId) {
      return NextResponse.json({ error: "Voice ID is required" }, { status: 400 });
    }

    const apiKey = process.env.ELEVENLABS_KEY || process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "ElevenLabs API key not configured" }, { status: 500 });
    }

    // Initialize ElevenLabs client
    const elevenlabs = new ElevenLabsClient({
      apiKey: apiKey,
    });

    // Get voice details
    const voice = await elevenlabs.voices.get(voiceId);

    return NextResponse.json(
      {
        voice_id: voice.voiceId,
        name: voice.name,
        description: voice.description,
        preview_url: voice.previewUrl,
        category: voice.category,
        labels: voice.labels,
        samples:
          voice.samples?.map((sample) => ({
            sample_id: sample.sampleId,
            file_name: sample.fileName,
            mime_type: sample.mimeType,
            size_bytes: sample.sizeBytes,
            hash: sample.hash,
          })) || [],
        settings: voice.settings,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching voice details:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch voice details",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/voice-cloning/[voiceId]
 * Delete a cloned voice
 *
 * Returns: Success status
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ voiceId: string }> },
) {
  try {
    const { voiceId } = await params;

    if (!voiceId) {
      return NextResponse.json({ error: "Voice ID is required" }, { status: 400 });
    }

    const apiKey = process.env.ELEVENLABS_KEY || process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "ElevenLabs API key not configured" }, { status: 500 });
    }

    // Initialize ElevenLabs client
    const elevenlabs = new ElevenLabsClient({
      apiKey: apiKey,
    });

    // Delete the voice
    await elevenlabs.voices.delete(voiceId);

    return NextResponse.json(
      {
        success: true,
        message: "Voice deleted successfully",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error deleting voice:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to delete voice",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/voice-cloning/[voiceId]
 * Edit voice settings (name, description, labels)
 *
 * Request body:
 * - name: string (optional)
 * - description: string (optional)
 * - labels: object (optional)
 *
 * Returns: Updated voice details
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ voiceId: string }> },
) {
  try {
    const { voiceId } = await params;
    const body = await request.json();
    const { name, description, labels } = body;

    if (!voiceId) {
      return NextResponse.json({ error: "Voice ID is required" }, { status: 400 });
    }

    if (!name && !description && !labels) {
      return NextResponse.json(
        {
          error: "At least one field (name, description, or labels) must be provided",
        },
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

    // Edit the voice
    await elevenlabs.voices.update(voiceId, {
      name: name,
      description: description,
      labels: labels,
    });

    // Get updated voice details
    const updatedVoice = await elevenlabs.voices.get(voiceId);

    return NextResponse.json(
      {
        voice_id: updatedVoice.voiceId,
        name: updatedVoice.name,
        description: updatedVoice.description,
        preview_url: updatedVoice.previewUrl,
        labels: updatedVoice.labels,
        category: updatedVoice.category,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error editing voice:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to edit voice",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}
