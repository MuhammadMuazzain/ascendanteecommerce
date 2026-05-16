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

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const accessToken = await getAccessToken(userId);
    if (!accessToken) return NextResponse.json({ error: "needs_drive_auth" }, { status: 403 });

    const query = encodeURIComponent(
      "mimeType='application/vnd.google-apps.folder' and trashed=false",
    );
    const searchRes = await fetch(
      `${DRIVE_API}/files?q=${query}&fields=files(id,name)&spaces=drive&orderBy=name`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (!searchRes.ok) {
      if (searchRes.status === 401)
        return NextResponse.json({ error: "needs_drive_auth" }, { status: 403 });
      throw new Error(`Drive search failed: ${await searchRes.text()}`);
    }

    const searchData = await searchRes.json();
    return NextResponse.json({ folders: searchData.files || [] }, { status: 200 });
  } catch (error) {
    console.error("Drive list folders error:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const accessToken = await getAccessToken(userId);
    if (!accessToken) return NextResponse.json({ error: "needs_drive_auth" }, { status: 403 });

    const body = await req.json();
    const { name } = body;
    if (!name) return NextResponse.json({ error: "Folder name is required" }, { status: 400 });

    const createRes = await fetch(`${DRIVE_API}/files`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        mimeType: "application/vnd.google-apps.folder",
      }),
    });

    if (!createRes.ok) {
      throw new Error(`Drive folder creation failed: ${await createRes.text()}`);
    }

    const folder = await createRes.json();
    return NextResponse.json({ folder }, { status: 200 });
  } catch (error) {
    console.error("Drive create folder error:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
