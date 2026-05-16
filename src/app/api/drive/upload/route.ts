import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/database";

// Allow large video uploads and longer processing time
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
const FOLDER_NAME = "generated";

/**
 * Refreshes an expired Google Drive access token.
 */
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

/**
 * Finds or creates the "generated" folder in the user's Google Drive root.
 */
async function getOrCreateGeneratedFolder(accessToken: string): Promise<string> {
  const query = encodeURIComponent(
    `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
  );
  const searchRes = await fetch(
    `${DRIVE_API}/files?q=${query}&fields=files(id,name)&spaces=drive`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!searchRes.ok) {
    throw new Error(`Drive search failed: ${await searchRes.text()}`);
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id as string;
  }

  // Create the folder
  const createRes = await fetch(`${DRIVE_API}/files`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: FOLDER_NAME,
      mimeType: "application/vnd.google-apps.folder",
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Drive folder creation failed: ${await createRes.text()}`);
  }

  const folder = await createRes.json();
  return folder.id as string;
}

/**
 * Uploads a file to Google Drive using the multipart upload API.
 */
async function uploadFileToDrive(
  accessToken: string,
  folderId: string,
  fileName: string,
  mimeType: string,
  fileBuffer: ArrayBuffer,
): Promise<{ id: string; name: string; webViewLink: string }> {
  const boundary = "generated_boundary_" + Date.now();

  const metadata = JSON.stringify({
    name: fileName,
    parents: [folderId],
    mimeType,
  });

  const metadataPart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`;
  const filePart = `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`;
  const closingBoundary = `\r\n--${boundary}--`;

  const metadataBytes = new TextEncoder().encode(metadataPart);
  const filePartBytes = new TextEncoder().encode(filePart);
  const closingBytes = new TextEncoder().encode(closingBoundary);
  const fileBytes = new Uint8Array(fileBuffer);

  const combined = new Uint8Array(
    metadataBytes.length + filePartBytes.length + fileBytes.length + closingBytes.length,
  );
  combined.set(metadataBytes, 0);
  combined.set(filePartBytes, metadataBytes.length);
  combined.set(fileBytes, metadataBytes.length + filePartBytes.length);
  combined.set(closingBytes, metadataBytes.length + filePartBytes.length + fileBytes.length);

  const uploadRes = await fetch(
    `${DRIVE_UPLOAD_API}/files?uploadType=multipart&fields=id,name,webViewLink`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: combined,
    },
  );

  if (!uploadRes.ok) {
    throw new Error(`Drive upload failed (${uploadRes.status}): ${await uploadRes.text()}`);
  }

  return uploadRes.json();
}

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate the user
    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fetch Drive-specific tokens from user_social_accounts
    const driveAccount = await db
      .selectFrom("user_social_accounts")
      .selectAll()
      .where("user_id", "=", userId)
      .where("provider", "=", "GOOGLE_DRIVE")
      .where("is_active", "=", true)
      .executeTakeFirst();

    if (!driveAccount) {
      // Signal to the frontend that the user needs to connect Drive
      return NextResponse.json(
        { error: "needs_drive_auth", message: "Google Drive not connected." },
        { status: 403 },
      );
    }

    let accessToken = driveAccount.access_token;

    // 3. Refresh if we have a refresh token (Drive tokens expire in 1 hour)
    if (driveAccount.refresh_token) {
      const refreshed = await refreshDriveToken(driveAccount.refresh_token);
      if (refreshed) {
        accessToken = refreshed;
        // Update the stored token
        await db
          .updateTable("user_social_accounts")
          .set({ access_token: refreshed })
          .where("id", "=", driveAccount.id)
          .execute();
      }
    }

    // 4. Parse the incoming form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const fileName = (formData.get("fileName") as string) || `generated-video-${Date.now()}.mp4`;
    const targetFolderId = formData.get("folderId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const mimeType = file.type || "video/mp4";
    const fileBuffer = await file.arrayBuffer();

    // 5. Use the target folder or ensure the "generated" folder exists
    const folderId = targetFolderId || (await getOrCreateGeneratedFolder(accessToken));

    // 6. Upload the file
    const driveFile = await uploadFileToDrive(
      accessToken,
      folderId,
      fileName,
      mimeType,
      fileBuffer,
    );

    return NextResponse.json(
      {
        success: true,
        fileId: driveFile.id,
        fileName: driveFile.name,
        webViewLink: driveFile.webViewLink,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Drive upload error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
