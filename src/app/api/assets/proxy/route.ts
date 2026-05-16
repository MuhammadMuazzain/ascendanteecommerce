import { NextRequest, NextResponse } from "next/server";

function isAllowedAssetUrl(target: URL): boolean {
  const publicDomain = process.env.R2_PUBLIC_DOMAIN?.replace(/\/$/, "");
  if (publicDomain) {
    try {
      const allowed = new URL(publicDomain);
      if (target.origin === allowed.origin || target.href.startsWith(`${publicDomain}/`)) {
        return true;
      }
    } catch {
      // ignore invalid R2_PUBLIC_DOMAIN
    }
  }

  return target.hostname.endsWith(".r2.dev");
}

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url");
  if (!rawUrl) {
    return NextResponse.json({ error: "url query parameter is required" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  if (target.protocol !== "https:" && target.protocol !== "http:") {
    return NextResponse.json({ error: "Invalid protocol" }, { status: 400 });
  }

  if (!isAllowedAssetUrl(target)) {
    return NextResponse.json({ error: "URL not allowed" }, { status: 403 });
  }

  try {
    const upstream = await fetch(target.toString());
    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream fetch failed: ${upstream.status}` },
        { status: upstream.status },
      );
    }

    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    const body = await upstream.arrayBuffer();

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Asset proxy error:", error);
    return NextResponse.json(
      {
        error: "Failed to proxy asset",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 502 },
    );
  }
}
