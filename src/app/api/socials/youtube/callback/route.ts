import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/database";
import { YouTubeService } from "@/lib/socials/youtube";
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

    const ytService = new YouTubeService({
      serviceAccount: config.google.oauthAccount,
      redirectUrl: config.google.redirectUrl,
    });

    const info = await ytService.getTokensAndProfile(code as string);
    //console.log("youtube tokens: "info);
    let socialAccount = await db
      .selectFrom("user_social_accounts")
      .selectAll()
      .where("user_id", "=", state)
      .where("is_active", "=", true)
      .where("provider", "=", "YOUTUBE")
      .executeTakeFirst();

    if (socialAccount) {
      await db
        .updateTable("user_social_accounts")
        .set({
          account_id: info.channel?.id || "",
          metadata: info,
        })
        .where("id", "=", socialAccount.id)
        .returningAll()
        .executeTakeFirstOrThrow();
    } else {
      socialAccount = await db
        .insertInto("user_social_accounts")
        .values({
          id: generateId(),
          account_id: info.channel?.id || "",
          provider: "YOUTUBE",
          access_token: info.tokens.access_token,
          refresh_token: info.tokens.refresh_token || "",
          metadata: info,
          is_active: true,
          user_id: state,
        })
        .returningAll()
        .executeTakeFirstOrThrow();
    }
    /*
    let auth = await authRepository.getByUserId(state)
    if(auth) {
      await authRepository.update(auth.id, {
        youtube: {
          accountId: info.channel?.id,
          tokens: info.tokens
        }
      })
    } else {
      auth = await authRepository.create({
        id: generateId(),
        userId: state,
        youtube: {
          accountId: info.channel?.id,
          tokens: info.tokens
        }
      })
    }
    */
    //return NextResponse.json({ success: true }, { status: 200 });
    return NextResponse.redirect(`${config.baseUrl}/account?connected=youtube&userId=${state}`);
  } catch (error) {
    console.error("Error in callback youtube:", error);
    return NextResponse.redirect(`${config.baseUrl}?error=true`);
  }
}
