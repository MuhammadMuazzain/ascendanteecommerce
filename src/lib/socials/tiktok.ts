export enum PrivacyLevel {
  PUBLIC_TO_EVERYONE = "PUBLIC_TO_EVERYONE",
  MUTUAL_FOLLOW_FRIENDS = "MUTUAL_FOLLOW_FRIENDS",
  SELF_ONLY = "SELF_ONLY",
}

export enum TikTokSource {
  FILE_UPLOAD = "FILE_UPLOAD",
  PULL_FROM_URL = "PULL_FROM_URL",
}

type PostInfo = {
  title: string;
  privacy_level?: PrivacyLevel;
  disable_duet?: boolean;
  disable_comment?: boolean;
  disable_stitch?: boolean;
  video_cover_timestamp_ms?: number;
  brand_content_toggle?: boolean;
  brand_organic_toggle?: boolean;
};

type SourceInfo = {
  source: TikTokSource;
  video_url?: string;
  video_size?: number;
  chunk_size?: number;
  total_chunk_count?: number;
};

type TikTokInitResponse = {
  data: {
    publish_id: string;
    upload_url?: string; // Only for FILE_UPLOAD
  };
  error: {
    code: string;
    message: string;
    log_id: string;
  };
};

interface TikTokTokenResponse {
  access_token: string;
  expires_in: number;
  open_id: string;
  refresh_expires_in: number;
  refresh_token: string;
  scope: string;
  token_type: "Bearer";
}

interface TikTokConfig {
  baseUrl: string;
  clientKey: string;
  clientSecret: string;
  redirectUri: string;
}

export class TikTokAuthService {
  private clientKey: string;
  private clientSecret: string;
  private redirectUri: string;
  private baseUrl: string;

  constructor(options: TikTokConfig) {
    this.clientKey = options.clientKey;
    this.clientSecret = options.clientSecret;
    this.redirectUri = options.redirectUri;
    this.baseUrl = options.baseUrl;
  }

  /** Exchange code for access_token */
  async exchangeCodeForToken(code: string): Promise<TikTokTokenResponse> {
    try {
      const resp = await fetch(`${this.baseUrl}/oauth/token/`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_key: this.clientKey,
          client_secret: this.clientSecret,
          code,
          grant_type: "authorization_code",
          redirect_uri: this.redirectUri,
        }).toString(),
      });

      const data = await resp.json();
      if (!resp.ok) {
        console.error("Token error:", data);
        throw new Error("Failed to exchange code with TikTok.");
      }

      return data;
    } catch (err: any) {
      console.error("exchangeCodeForToken error:", err);
      throw new Error("Something went wrong during TikTok login.");
    }
  }

  /** Refresh access_token */
  async refreshAccessToken(refreshToken: string): Promise<TikTokTokenResponse> {
    try {
      const resp = await fetch(`${this.baseUrl}/oauth/token/`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_key: this.clientKey,
          client_secret: this.clientSecret,
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }).toString(),
      });

      const data = await resp.json();
      if (!resp.ok) {
        console.error("Refresh token error:", data);
        throw new Error("Failed to refresh TikTok token.");
      }

      return data;
    } catch (err: any) {
      console.error("refreshAccessToken error:", err);
      throw new Error("Error refreshing TikTok token.");
    }
  }

  /** Revoke access_token */
  async revokeAccessToken(accessToken: string): Promise<void> {
    try {
      const resp = await fetch(`${this.baseUrl}/oauth/revoke/`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_key: this.clientKey,
          client_secret: this.clientSecret,
          token: accessToken,
        }).toString(),
      });

      if (!resp.ok) {
        const data = await resp.json();
        console.error("Revoke error:", data);
        throw new Error("Failed to revoke TikTok access token.");
      }
    } catch (err: any) {
      console.error("revokeAccessToken error:", err);
      throw new Error("Error revoking TikTok token.");
    }
  }

  /** Post a video from URL (PULL_FROM_URL) */
  async postVideoFromUrl(
    accessToken: string,
    videoUrl: string,
    postInfo: PostInfo,
  ): Promise<string> {
    try {
      const body = {
        post_info: postInfo,
        source_info: {
          source: TikTokSource.PULL_FROM_URL,
          video_url: videoUrl,
        } as SourceInfo,
      };

      const resp = await fetch(`${this.baseUrl}/post/publish/video/init/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify(body),
      });

      const data: TikTokInitResponse = await resp.json();

      if (!resp.ok || data.error.code !== "ok") {
        console.error("Post video error:", data);
        throw new Error("Failed to post video on TikTok.");
      }

      return data.data.publish_id;
    } catch (err: any) {
      console.error("postVideoFromUrl error:", err);
      throw new Error("Error posting video to TikTok.");
    }
  }
}
