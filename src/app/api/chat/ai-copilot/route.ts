import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { aiCopilotFlow } from "@/genkit/aiCopilotFlow";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const videoId = searchParams.get("videoId") || null;

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  try {
    const { chatQueries } = await import("@/lib/database/chat-queries");
    const sessionRecord = await chatQueries.getOrCreateSession(userId, projectId, videoId);
    const messages = await chatQueries.getMessages(sessionRecord.id);
    const segments = await chatQueries.getSegments(projectId);

    return NextResponse.json({
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        metadata: m.metadata,
        createdAt: m.created_at,
      })),
      clips: segments.map((s) => ({
        id: s.id,
        ...s.segment_data,
        schema_id: s.schema_id,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch chat history:", error);
    return NextResponse.json({ error: "Failed to fetch chat history" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, projectId } = body;
    const videoId = body.videoId ?? req.headers.get("x-video-id") ?? null;

    const session = await auth.api.getSession({
      headers: await headers(),
    });
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "messages array is required" }, { status: 400 });
    }

    const baseUrl = req.nextUrl.origin;
    const input = {
      messages,
      projectId,
      videoId,
      currentClips: body.currentClips,
      userId,
      baseUrl,
    };

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          await aiCopilotFlow.run(input, {
            abortSignal: req.signal,
            onChunk: (chunk) => {
              try {
                controller.enqueue(encoder.encode(chunk));
              } catch (e: unknown) {
                const err = e as { code?: string; message?: string };
                if (
                  err?.code !== "ERR_INVALID_STATE" &&
                  !String(err?.message ?? "").includes("closed")
                ) {
                  throw e;
                }
              }
            },
          });
        } catch (error) {
          console.error("AI Copilot flow error:", error);
          controller.error(error);
        } finally {
          try {
            controller.close();
          } catch (_) {}
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json({ error: "Chat processing failed" }, { status: 500 });
  }
}
