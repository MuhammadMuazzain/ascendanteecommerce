import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { PostHog } from "posthog-node";

const posthogClient = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
});

export async function POST(req: Request) {
  try {
    const { action } = await req.json();

    if (action === "capture_event") {
      posthogClient.capture({
        distinctId: "server-debug-user",
        event: "server_debug_event_triggered",
        properties: {
          source: "playground_debug_api",
          timestamp: new Date().toISOString(),
        },
      });
      return NextResponse.json({
        success: true,
        message: "Server event captured",
      });
    }

    if (action === "trigger_error") {
      // Intentional error for Sentry
      throw new Error("Intentional Server Debug Error from Playground");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    Sentry.captureException(error);

    // Manual PostHog exception capture pattern
    posthogClient.capture({
      distinctId: "server-debug-user",
      event: "$exception",
      properties: {
        error_message: (error as Error).message,
        stack: (error as Error).stack,
        source: "playground_debug_api",
      },
    });

    console.error("Debug API Error:", error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  } finally {
    // Ensure all events are sent before the function exits in serverless
    await posthogClient.shutdown();
  }
}
