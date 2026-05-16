import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
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

    let url = "https://www.tiktok.com/v2/auth/authorize/";

    // the following params need to be in `application/x-www-form-urlencoded` format.
    url += `?client_key=${config.tiktok.clientKey}`;
    url += "&scope=user.info.basic,video.publish,video.upload";
    url += "&response_type=code";
    url += `&redirect_uri=${config.tiktok.redirectUrl}`;
    url += "&state=" + userId;

    return NextResponse.json({ url }, { status: 200 });
  } catch (error) {
    console.error("Tiktok OAuth initialization error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Failed to initialize Tiktok OAuth.", details: errorMessage },
      { status: 500 },
    );
  }
}
