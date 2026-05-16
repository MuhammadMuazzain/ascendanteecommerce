import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { db } from "@/lib/database";
import { auth } from "@/lib/auth";
import { PrivacyLevel, TikTokAuthService } from "@/lib/socials/tiktok";
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

    const body = await req.json();

    const tiktokService = new TikTokAuthService({
      clientKey: config.tiktok.clientKey,
      clientSecret: config.tiktok.clientSecret,
      redirectUri: config.tiktok.redirectUrl,
      baseUrl: config.tiktok.url,
    });

    const socialAccount = await db
      .selectFrom("user_social_accounts")
      .selectAll()
      .where("user_id", "=", userId)
      .where("is_active", "=", true)
      .where("provider", "=", "TIKTOK")
      .executeTakeFirst();
    if (!socialAccount) throw new Error("No authentication tiktok");
    if (!socialAccount.access_token) throw new Error("Incomplete TikTok authentication data");

    await tiktokService.postVideoFromUrl(socialAccount.access_token, body.url, {
      title: body.title,
      privacy_level: body.privacyLevel || PrivacyLevel.SELF_ONLY,
      disable_duet: body.disableDuet,
      disable_comment: body.disableComment,
      disable_stitch: body.disableStitch,
      video_cover_timestamp_ms: body.videoCoverTimestampMs || 1000,
      brand_content_toggle: body.brandContentToggle,
      brand_organic_toggle: body.brandOrganicToggle,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error publish tiktok:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Error posting on tiktok", details: errorMessage },
      { status: 500 },
    );
  }
}
