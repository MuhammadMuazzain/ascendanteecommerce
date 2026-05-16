import { NextRequest, NextResponse } from "next/server";

import { config } from "../config";

import { SocialNetworkService } from "@/lib/socialmedia-downloader/yt-dlp";
import { ProxyService } from "@/lib/socialmedia-downloader/webshare";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { url: string };

    if (!body.url) {
      return NextResponse.json({ error: "Invalid input. 'url' is required." }, { status: 400 });
    }

    const proxyService = new ProxyService(
      config.webshare.url,
      config.webshare.apiKey,
      config.webshare.accountListUrl,
    );
    const snService = new SocialNetworkService(proxyService, config.YtDlp.blockedProxyListUrl);

    const info = await snService.getVideoInfo(body.url);

    return NextResponse.json(info);
  } catch (error) {
    console.error("Social Networking Info API error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
