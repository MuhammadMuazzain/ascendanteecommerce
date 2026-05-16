import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { db } from "@/lib/database";
import { auth } from "@/lib/auth";
import { IGPublishType, InstagramBusinessAPI } from "@/lib/socials/ig";
import { config } from "../../config";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    const userId = session?.user?.id || null;

    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { url, caption, type } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "The 'url' field is required" }, { status: 400 });
    }

    const igApi = new InstagramBusinessAPI({
      baseUrl: config.ig.url,
      appId: config.ig.appId,
      appSecret: config.ig.appSecret,
      redirectUri: config.ig.redirectUri,
    });

    const socialAccount = await db
      .selectFrom("user_social_accounts")
      .selectAll()
      .where("user_id", "=", userId)
      .where("is_active", "=", true)
      .where("provider", "=", "INSTAGRAM")
      .executeTakeFirst();
    if (!socialAccount) throw new Error("No authentication instagram");

    if (!socialAccount.account_id || !socialAccount.access_token) {
      throw new Error("Incomplete Instagram authentication data");
    }

    await igApi.publishVideo({
      igUserId: socialAccount.account_id,
      videoUrl: url,
      caption: caption,
      type: type || IGPublishType.REELS,
      accessToken: socialAccount.access_token,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error publish instagram:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Error posting on instagram", details: errorMessage },
      { status: 500 },
    );
  }
}
