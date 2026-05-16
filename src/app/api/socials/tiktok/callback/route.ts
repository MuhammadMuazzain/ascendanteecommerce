import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/database";
import { TikTokAuthService } from "@/lib/socials/tiktok";
import { config } from "../../config";
import { generateId } from "@/utils/id";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code) {
      return NextResponse.json({ error: "The 'code' field is required" }, { status: 400 });
    }

    if (!state) {
      return NextResponse.json({ error: "The 'state' field is required" }, { status: 400 });
    }

    const tiktokService = new TikTokAuthService({
      clientKey: config.tiktok.clientKey,
      clientSecret: config.tiktok.clientSecret,
      redirectUri: config.tiktok.redirectUrl,
      baseUrl: config.tiktok.url,
    });

    const tokens = await tiktokService.exchangeCodeForToken(code);
    //console.log("tiktok tokens: "tokens);
    let socialAccount = await db
      .selectFrom("user_social_accounts")
      .selectAll()
      .where("user_id", "=", state)
      .where("is_active", "=", true)
      .where("provider", "=", "TIKTOK")
      .executeTakeFirst();

    if (socialAccount) {
      await db
        .updateTable("user_social_accounts")
        .set({
          account_id: tokens.open_id,
          metadata: tokens,
        })
        .where("id", "=", socialAccount.id)
        .returningAll()
        .executeTakeFirstOrThrow();
    } else {
      socialAccount = await db
        .insertInto("user_social_accounts")
        .values({
          id: generateId(),
          account_id: tokens.open_id,
          provider: "TIKTOK",
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          metadata: tokens,
          is_active: true,
          user_id: state,
        })
        .returningAll()
        .executeTakeFirstOrThrow();
    }

    //return NextResponse.json({ success: true }, { status: 200 });
    return NextResponse.redirect(`${config.baseUrl}/account?connected=tiktok&userId=${state}`);
  } catch (error) {
    console.error("Error in callback tiktok:", error);
    return NextResponse.redirect(`${config.baseUrl}?error=true`);
  }
}
