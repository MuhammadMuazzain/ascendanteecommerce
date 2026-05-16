import { db } from "@/lib/database";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id) {
      return Response.json({ error: "Scheme ID is required" }, { status: 400 });
    }

    // Get authenticated user
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    const userId = session?.user?.id || null;

    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ensure the generation belongs to the authenticated user
    const existingScheme = await db
      .selectFrom("generations")
      .selectAll()
      .where("id", "=", id)
      .where("user_id", "=", userId)
      .executeTakeFirst();

    if (!existingScheme) {
      return Response.json({ error: "Scheme not found" }, { status: 404 });
    }

    const scheme = existingScheme.input;
    const output = existingScheme.output;
    const visuals = Array.isArray(output) ? output : (output as any)?.segments || [];

    //console.log({ visuals, scheme });
    let totalDuration = 0;

    for (let i = 0; i < (scheme.segments || []).length; i++) {
      const seg = scheme.segments[i];
      const visual = visuals.find((v: any) => v.id === seg.id);

      // Only update if the visual result exists and was successful
      if (visual) {
        const duration = visual.duration * 1000; // convert seconds → ms

        scheme.segments[i] = {
          ...seg,
          clips: [
            {
              refId: "clipId",
              type: "video",
              src: visual.videos,
              previewSrc: visual.preview,
              duration,
              display: { from: totalDuration, to: totalDuration + duration },
            },
          ],
          duration,
          textToSpeech: {
            refId: "textToSpeechId",
            src: visual.audioUrl,
            duration,
          },
          speechToText: {
            refId: "speechToTextId",
            src: visual.captionUrl,
          },
        };

        totalDuration += duration;
      } else {
        console.warn(`Segment ${seg.id} was skipped — no visual result found.`);
      }
    }

    return Response.json({
      success: true,
      progress: existingScheme.progress,
      status: existingScheme.status,
      scheme,
    });
  } catch (error) {
    console.error("Error Get scheme:", error);
    return Response.json(
      {
        error: "Failed to Get scheme",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
