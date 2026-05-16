import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { db } from "@/lib/database";
import { auth } from "@/lib/auth";
import { YouTubeService } from "@/lib/socials/youtube";
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

    const ytService = new YouTubeService({
      serviceAccount: config.google.oauthAccount,
      redirectUrl: config.google.redirectUrl,
    });

    const socialAccount = await db
      .selectFrom("user_social_accounts")
      .selectAll()
      .where("user_id", "=", userId)
      .where("is_active", "=", true)
      .where("provider", "=", "YOUTUBE")
      .executeTakeFirst();
    if (!socialAccount) throw new Error("No authentication youtube");
    if (!socialAccount?.metadata?.tokens) throw new Error("Incomplete YouTube authentication data");

    const result = await ytService.uploadVideo(
      {
        url: body.url,
        title: body.title,
        thumbUrl: body.thumbUrl,
        description: body.description,
        tags: body.tags,
        privacyStatus: body.privacyStatus,
        categoryId: body.categoryId,
      },
      socialAccount.metadata.tokens,
    );
    console.log("youtube result: ", result);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error publish youtube:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Error posting on youtube", details: errorMessage },
      { status: 500 },
    );
  }
}
