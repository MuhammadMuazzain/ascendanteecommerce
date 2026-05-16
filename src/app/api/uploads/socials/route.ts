import { NextRequest, NextResponse } from "next/server";
import { SocialVideoService } from "@/lib/social-video-service";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as { url: string; projectId?: string };

    if (!body.url) {
      return NextResponse.json({ error: "Invalid input. 'url' is required." }, { status: 400 });
    }

    const asset = await SocialVideoService.processUrl(body.url, userId, body.projectId || null);

    return NextResponse.json({ url: asset.public_url, assetId: asset.id });
  } catch (error) {
    console.error("Social Networking API error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
