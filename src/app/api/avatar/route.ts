import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { assetQueries } from "@/lib/database/asset-queries";
import { nanoid } from "nanoid";

export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const assets = await assetQueries.findByUserId(userId);

    // Filter for avatars in application logic since we use metadata
    const avatars = assets.filter(
      (asset) => asset.asset_type === "image" && (asset.metadata as any)?.isAvatar === true,
    );

    return NextResponse.json({ avatars });
  } catch (error: any) {
    console.error("Error in GET /api/avatar:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { url, prompt, aspectRatio } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const assetId = nanoid();
    const newAsset = await assetQueries.create({
      id: assetId,
      user_id: userId,
      asset_type: "image",
      source_type: "ai_generated",
      original_filename: `avatar-${assetId}.png`,
      unique_filename: `avatar-${assetId}.png`,
      file_path: url, // For external URLs, we store the URL as the path for now
      public_url: url,
      metadata: {
        isAvatar: true,
        prompt,
        aspectRatio,
      },
    });

    return NextResponse.json({ asset: newAsset });
  } catch (error: any) {
    console.error("Error in POST /api/avatar:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = new URL(req.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const asset = await assetQueries.findById(id);
    if (!asset || asset.user_id !== session.user.id) {
      return NextResponse.json({ error: "Avatar not found" }, { status: 404 });
    }

    const metadata = asset.metadata as { isAvatar?: boolean } | null;
    if (!metadata?.isAvatar) {
      return NextResponse.json({ error: "Not an avatar asset" }, { status: 400 });
    }

    await assetQueries.delete(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in DELETE /api/avatar:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 },
    );
  }
}
