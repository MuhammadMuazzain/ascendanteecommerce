import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { InstagramBusinessAPI } from "@/lib/socials/ig";
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

    const igApi = new InstagramBusinessAPI({
      baseUrl: config.ig.url,
      appId: config.ig.appId,
      appSecret: config.ig.appSecret,
      redirectUri: config.ig.redirectUri,
    });

    const scopes = [
      "instagram_business_basic",
      "instagram_business_content_publish",
      "instagram_business_manage_comments",
      "instagram_business_manage_messages",
    ];
    // Optional: include state to protect against CSRF in production
    //const url = igApi.getAuthorizationUrl(scopes, "optional-csrf-state");
    const url = igApi.getAuthorizationUrl(scopes, userId);

    return NextResponse.json({ url }, { status: 200 });
  } catch (error) {
    console.error("Instagram OAuth initialization error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Failed to initialize Instagram OAuth.", details: errorMessage },
      { status: 500 },
    );
  }
}
