import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const DRIVE_SCOPES = ["https://www.googleapis.com/auth/drive.file", "openid", "email", "profile"];

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const redirectBack = searchParams.get("redirectBack") || "";

    // Build the Google OAuth URL manually using GOOGLE_CLIENT_ID
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: `${process.env.BETTER_AUTH_URL}/api/drive/callback`,
      response_type: "code",
      scope: DRIVE_SCOPES.join(" "),
      access_type: "offline",
      prompt: "consent",
      // Encode userId + redirectBack in state
      state: JSON.stringify({ userId, redirectBack }),
    });

    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    return NextResponse.json({ url }, { status: 200 });
  } catch (error) {
    console.error("Drive OAuth init error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
