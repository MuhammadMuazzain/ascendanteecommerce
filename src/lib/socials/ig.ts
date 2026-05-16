import { URLSearchParams } from "url";

export enum IGPublishType {
  REELS = "REELS",
  STORIES = "STORIES",
}

/**
 * InstagramBusinessAPI
 * Handles Instagram Business login, token exchange, refresh, and publishing.
 */
export class InstagramBusinessAPI {
  private appId: string;
  private appSecret: string;
  private redirectUri: string;
  private baseUrl: string;

  constructor(options: { appId: string; appSecret: string; redirectUri: string; baseUrl: string }) {
    this.appId = options.appId;
    this.appSecret = options.appSecret;
    this.redirectUri = options.redirectUri;
    this.baseUrl = options.baseUrl;
  }

  /** Build authorization URL */
  getAuthorizationUrl(scopes: string[], state?: string): string {
    const base = "https://www.instagram.com/oauth/authorize";
    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: this.redirectUri,
      response_type: "code",
      scope: scopes.join(","),
    });
    if (state) params.set("state", state);
    return `${base}?${params.toString()}`;
  }

  /** Exchange code for short-lived token */
  async exchangeCodeForShortLivedToken(code: string): Promise<any> {
    const url = "https://api.instagram.com/oauth/access_token";
    const body = new URLSearchParams({
      client_id: this.appId,
      client_secret: this.appSecret,
      grant_type: "authorization_code",
      redirect_uri: this.redirectUri,
      code,
    });

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("Short-lived token error:", data);
        throw new Error("Failed to get Instagram short-lived token.");
      }
      return data;
    } catch (err: any) {
      console.error("exchangeCodeForShortLivedToken error:", err);
      throw new Error("Something went wrong during Instagram login.");
    }
  }

  /** Exchange short-lived for long-lived token */
  async exchangeShortLivedForLongLived(shortLivedToken: string): Promise<any> {
    const url = `${this.baseUrl}/access_token?grant_type=ig_exchange_token&client_secret=${encodeURIComponent(this.appSecret)}&access_token=${encodeURIComponent(shortLivedToken)}`;
    try {
      const res = await fetch(url, { method: "GET" });
      const data = await res.json();
      if (!res.ok) {
        console.error("Long-lived token error:", data);
        throw new Error("Failed to get Instagram long-lived token.");
      }
      return data;
    } catch (err: any) {
      console.error("exchangeShortLivedForLongLived error:", err);
      throw new Error("Error exchanging Instagram token.");
    }
  }

  /** Refresh long-lived token */
  async refreshLongLivedToken(longLivedToken: string): Promise<any> {
    const url = `${this.baseUrl}/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(longLivedToken)}`;
    try {
      const res = await fetch(url, { method: "GET" });
      const data = await res.json();
      if (!res.ok) {
        console.error("Refresh token error:", data);
        throw new Error("Failed to refresh Instagram token.");
      }
      return data;
    } catch (err: any) {
      console.error("refreshLongLivedToken error:", err);
      throw new Error("Error refreshing Instagram token.");
    }
  }

  /** Publish image to Instagram */
  async publishImage({
    igUserId,
    imageUrl,
    caption,
    accessToken,
  }: {
    igUserId: string;
    imageUrl: string;
    caption?: string;
    accessToken: string;
  }): Promise<any> {
    try {
      const createUrl = `${this.baseUrl}/${igUserId}/media`;
      const params = new URLSearchParams({
        image_url: imageUrl,
        access_token: accessToken,
      });
      if (caption) params.set("caption", caption);

      const createRes = await fetch(`${createUrl}?${params.toString()}`, {
        method: "POST",
      });
      const createData = await createRes.json();
      if (!createRes.ok || !createData.id) {
        console.error("Create media error:", createData);
        throw new Error("Failed to create Instagram media.");
      }

      const publishUrl = `${this.baseUrl}/${igUserId}/media_publish`;
      const publishRes = await fetch(publishUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creation_id: createData.id }),
      });
      const publishData = await publishRes.json();
      if (!publishRes.ok) {
        console.error("Publish media error:", publishData);
        throw new Error("Failed to publish Instagram media.");
      }
      return publishData;
    } catch (err: any) {
      console.error("publishImage error:", err);
      throw new Error("Error publishing image to Instagram.");
    }
  }

  /** Publish video to Instagram */
  async publishVideo({
    igUserId,
    videoUrl,
    caption,
    accessToken,
    type,
  }: {
    igUserId: string;
    videoUrl: string;
    caption?: string;
    accessToken: string;
    type: IGPublishType;
  }): Promise<any> {
    try {
      // 1) create media
      const createUrl = `${this.baseUrl}/${igUserId}/media`;
      const body = { video_url: videoUrl, media_type: type, caption };
      const createRes = await fetch(createUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const createData = await createRes.json();
      if (!createRes.ok || !createData.id) {
        console.error("Create video media error:", createData);
        throw new Error("Failed to create Instagram video media.");
      }

      const creationId = createData.id;

      // 2) poll until FINISHED
      const statusUrl = `${this.baseUrl}/${creationId}`;
      let attempt = 0,
        statusResponse: any;
      while (attempt < 100) {
        const res = await fetch(statusUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });
        statusResponse = await res.json();
        if (!res.ok) {
          console.error("Video status error:", statusResponse);
          throw new Error("Failed to check Instagram video status.");
        }
        if (statusResponse.status_code === "FINISHED") break;
        if (statusResponse.status_code === "IN_PROGRESS") {
          console.log(statusResponse);
          attempt++;
          await new Promise((r) => setTimeout(r, 5000));
        } else {
          throw new Error(`Unexpected video status: ${statusResponse.status_code}`);
        }
      }
      if (statusResponse.status_code !== "FINISHED")
        throw new Error("Video did not finish processing in time.");

      // 3) publish
      const publishUrl = `${this.baseUrl}/${igUserId}/media_publish`;
      const publishRes = await fetch(publishUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ creation_id: creationId }),
      });
      const publishData = await publishRes.json();
      if (!publishRes.ok) {
        console.error("Publish video error:", publishData);
        throw new Error("Failed to publish Instagram video.");
      }
      return publishData;
    } catch (err: any) {
      console.error("publishVideo error:", err);
      throw new Error("Error publishing video to Instagram.");
    }
  }
}
