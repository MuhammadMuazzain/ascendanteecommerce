import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database";
import { generateId } from "@/utils/id";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const baseUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";

  if (error) {
    console.error("Drive OAuth error from Google:", error);
    return NextResponse.redirect(`${baseUrl}?drive_error=${error}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}?drive_error=missing_params`);
  }

  let userId: string;
  let redirectBack: string = "";

  try {
    const parsed = JSON.parse(state);
    userId = parsed.userId;
    redirectBack = parsed.redirectBack || "";
  } catch {
    return NextResponse.redirect(`${baseUrl}?drive_error=invalid_state`);
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${baseUrl}/api/drive/callback`,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("Drive token exchange failed:", errText);
      return NextResponse.redirect(`${baseUrl}?drive_error=token_exchange_failed`);
    }

    const tokens = await tokenRes.json();
    const { access_token, refresh_token, expires_in } = tokens;

    // Upsert in user_social_accounts
    const existing = await db
      .selectFrom("user_social_accounts")
      .selectAll()
      .where("user_id", "=", userId)
      .where("provider", "=", "GOOGLE_DRIVE")
      .where("is_active", "=", true)
      .executeTakeFirst();

    if (existing) {
      await db
        .updateTable("user_social_accounts")
        .set({
          access_token,
          refresh_token: refresh_token || existing.refresh_token,
          metadata: { expires_in, scope: tokens.scope },
        })
        .where("id", "=", existing.id)
        .execute();
    } else {
      await db
        .insertInto("user_social_accounts")
        .values({
          id: generateId(),
          user_id: userId,
          provider: "GOOGLE_DRIVE",
          account_id: userId, // reuse userId as account identifier
          access_token,
          refresh_token: refresh_token || null,
          metadata: { expires_in, scope: tokens.scope },
          is_active: true,
        })
        .execute();
    }

    // Redirect back to the editor (or wherever they came from)
    const successUrl = redirectBack
      ? `${redirectBack}?drive_connected=true`
      : `${baseUrl}?drive_connected=true`;

    return NextResponse.redirect(successUrl);
  } catch (err) {
    console.error("Drive callback error:", err);
    return NextResponse.redirect(`${baseUrl}?drive_error=server_error`);
  }
}
