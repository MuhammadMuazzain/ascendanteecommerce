import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/database";
import { InstagramBusinessAPI } from "@/lib/socials/ig";
import { config } from "../../config";
import { generateId } from "@/utils/id";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const error_description = searchParams.get("error_description");

    if (!code) {
      return NextResponse.json({ error: "The 'code' field is required" }, { status: 400 });
    }

    if (!state) {
      return NextResponse.json({ error: "The 'state' field is required" }, { status: 400 });
    }

    if (error || error_description) {
      return NextResponse.json(
        {
          error: "Unable instagram redirect",
          details: error_description || error,
        },
        { status: 500 },
      );
    }

    const igApi = new InstagramBusinessAPI({
      baseUrl: config.ig.url,
      appId: config.ig.appId,
      appSecret: config.ig.appSecret,
      redirectUri: config.ig.redirectUri,
    });

    // Exchange code for short-lived token
    const shortTokenResponse = await igApi.exchangeCodeForShortLivedToken(code);
    // shortTokenResponse typically contains access_token and user_id (app-scoped)
    // Now exchange for long-lived token
    const shortLived = shortTokenResponse.access_token;
    const longTokenResponse = await igApi.exchangeShortLivedForLongLived(shortLived);
    // console.log({ shortLived, longTokenResponse });
    let socialAccount = await db
      .selectFrom("user_social_accounts")
      .selectAll()
      .where("user_id", "=", state)
      .where("is_active", "=", true)
      .where("provider", "=", "INSTAGRAM")
      .executeTakeFirst();

    if (socialAccount) {
      await db
        .updateTable("user_social_accounts")
        .set({
          account_id: shortTokenResponse.user_id,
          metadata: { shortTokenResponse, longTokenResponse },
        })
        .where("id", "=", socialAccount.id)
        .returningAll()
        .executeTakeFirstOrThrow();
    } else {
      socialAccount = await db
        .insertInto("user_social_accounts")
        .values({
          id: generateId(),
          account_id: shortTokenResponse.user_id,
          provider: "INSTAGRAM",
          access_token: longTokenResponse?.access_token || "",
          refresh_token: "",
          metadata: { shortTokenResponse, longTokenResponse },
          is_active: true,
          user_id: state,
        })
        .returningAll()
        .executeTakeFirstOrThrow();
    }

    //return NextResponse.json({ success: true }, { status: 200 });
    return NextResponse.redirect(`${config.baseUrl}/account?connected=instagram&userId=${state}`);
  } catch (error) {
    console.error("Error in callback instagram:", error);
    return NextResponse.redirect(`${config.baseUrl}?error=true`);
  }
}
