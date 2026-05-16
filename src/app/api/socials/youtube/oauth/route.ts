import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { YouTubeService } from "@/lib/socials/youtube";
import { config } from "../../config";

export async function GET(req: NextRequest) {
  try {
    //const { searchParams } = new URL(req.url);
    //const userId = searchParams.get("userId");

    const session = await auth.api.getSession({
      headers: await headers(),
    });
    const userId = session?.user?.id || null;

    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ytService = new YouTubeService({
      serviceAccount: config.google.oauthAccount,
      redirectUrl: config.google.redirectUrl,
    });

    const url = ytService.generateAuthUrl(userId);

    return NextResponse.json({ url }, { status: 200 });
  } catch (error) {
    console.error("Youtube OAuth initialization error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Failed to initialize Youtube OAuth.", details: errorMessage },
      { status: 500 },
    );
  }
}
