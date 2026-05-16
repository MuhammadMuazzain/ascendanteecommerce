import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/database";

const DRIVE_API = "https://www.googleapis.com/drive/v3";

async function refreshDriveToken(refreshToken: string): Promise<string | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token ?? null;
}

async function getAccessToken(userId: string) {
  const driveAccount = await db
    .selectFrom("user_social_accounts")
    .selectAll()
    .where("user_id", "=", userId)
    .where("provider", "=", "GOOGLE_DRIVE")
    .where("is_active", "=", true)
    .executeTakeFirst();

  if (!driveAccount) return null;

  let accessToken = driveAccount.access_token;

  if (driveAccount.refresh_token) {
    const refreshed = await refreshDriveToken(driveAccount.refresh_token);
    if (refreshed) {
      accessToken = refreshed;
      await db
        .updateTable("user_social_accounts")
        .set({ access_token: refreshed })
        .where("id", "=", driveAccount.id)
        .execute();
    }
  }
  return accessToken;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const accessToken = await getAccessToken(userId);
    if (!accessToken) return NextResponse.json({ error: "needs_drive_auth" }, { status: 403 });

    const body = await req.json();
    const { name } = body;
    if (!name) return NextResponse.json({ error: "Folder name is required" }, { status: 400 });

    const res = await fetch(`${DRIVE_API}/files/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    });

    if (!res.ok) throw new Error(`Drive rename folder failed: ${await res.text()}`);

    const folder = await res.json();
    return NextResponse.json({ folder }, { status: 200 });
  } catch (error) {
    console.error("Drive rename folder error:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const accessToken = await getAccessToken(userId);
    if (!accessToken) return NextResponse.json({ error: "needs_drive_auth" }, { status: 403 });

    const res = await fetch(`${DRIVE_API}/files/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ trashed: true }), // move to trash rather than permanent delete
    });

    if (!res.ok) throw new Error(`Drive delete folder failed: ${await res.text()}`);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Drive delete folder error:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
