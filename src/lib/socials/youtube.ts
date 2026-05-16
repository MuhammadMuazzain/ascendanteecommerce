import fs from "fs";
import os from "os";
import path from "path";
import mime from "mime";
import { google, youtube_v3, Auth } from "googleapis";

export async function downloadFile(
  fileUrl: string,
): Promise<{ buffer: Buffer; contentType: string }> {
  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }

  // Obtener MIME type del header
  const contentType = response.headers.get("content-type") || "application/octet-stream";

  // Convertir MIME a extensión
  let extension = mime.getExtension(contentType); // mp4
  if (!extension) {
    // fallback: intentar sacar de la URL
    const parsed = path.parse(new URL(fileUrl).pathname);
    extension = parsed.ext.replace(".", "") || "bin";
  }
  extension = `.${extension}`; // .mp4

  // Convertir arrayBuffer a Buffer
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return { buffer, contentType };
}
enum PrivacyStatus {
  PUBLIC = "public",
  PRIVATE = "private",
  UNLISTED = "unlisted",
}

export interface YouTubeServiceOptions {
  redirectUrl: string;
  serviceAccount: string;
  scopes?: string[];
}

export interface YouTubeTokens {
  access_token: string;
  refresh_token?: string;
  scope: string;
  token_type: string;
  expiry_date?: number;
}

export interface UploadVideoParams {
  url: string;
  title: string;

  thumbUrl?: string;
  description?: string;
  tags?: string[];
  privacyStatus?: PrivacyStatus;
  categoryId?: string;
}

export interface YouTubeUser {
  id: string; // user identifier in your DB
  tokens: YouTubeTokens;
}

export class YouTubeService {
  private oauth2Client: Auth.OAuth2Client;
  private scopes: string[];

  constructor(options: YouTubeServiceOptions) {
    this.scopes = options.scopes || [
      "https://www.googleapis.com/auth/youtube.upload", // subir videos
      "https://www.googleapis.com/auth/youtube.force-ssl", // leer canal y stats
      "openid",
      "email",
      "profile", // info de cuenta Google
    ];
    const serviceAccountJson = Buffer.from(options.serviceAccount, "base64").toString("utf8");
    const credentials = JSON.parse(serviceAccountJson);
    const { client_secret, client_id, redirect_uris } = credentials.web;
    this.oauth2Client = new google.auth.OAuth2(client_id, client_secret, options.redirectUrl);
  }

  /** Genera URL para que el usuario autorice la app */
  generateAuthUrl(state?: string): string {
    try {
      const oauth = this.oauth2Client.generateAuthUrl({
        access_type: "offline", // para obtener refresh token
        scope: this.scopes,
        state,
        prompt: "consent", // fuerza mostrar la ventana de consentimiento
      });
      return oauth;
    } catch (err: any) {
      console.error(err);
      throw new Error("error upload");
    }
  }

  /** Intercambia el code por tokens y obtiene perfil del canal */
  async getTokensAndProfile(code: string): Promise<{
    tokens: YouTubeTokens;
    channel: youtube_v3.Schema$Channel | null;
  }> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);

      const service = google.youtube({
        version: "v3",
        auth: this.oauth2Client,
      });
      const res = await service.channels.list({
        part: ["snippet", "statistics"],
        mine: true,
      });
      const channel = res.data.items && res.data.items.length > 0 ? res.data.items[0] : null;
      //console.log("channel: ", JSON.stringify(channel, null, 2))
      return { tokens: tokens as YouTubeTokens, channel };
    } catch (err: any) {
      console.error(err);
      throw new Error("error upload");
    }
  }

  /** Retorna un cliente OAuth2 autorizado con tokens de un usuario */
  getClientForUser(userTokens: YouTubeTokens) {
    try {
      const client = new google.auth.OAuth2();
      client.setCredentials(userTokens);
      return client;
    } catch (err: any) {
      console.error(err);
      throw new Error("error upload");
    }
  }

  /** Obtiene información del canal de un usuario usando sus tokens */
  async getChannelInfo(userTokens: YouTubeTokens): Promise<youtube_v3.Schema$Channel | null> {
    try {
      const client = this.getClientForUser(userTokens);
      const service = google.youtube({ version: "v3", auth: client });
      const res = await service.channels.list({
        part: ["snippet", "statistics"],
        mine: true,
      });
      return res.data.items && res.data.items.length > 0 ? res.data.items[0] : null;
    } catch (err: any) {
      console.error(err);
      throw new Error("error upload");
    }
  }

  /** Sube un video + thumbnail usando tokens de un usuario */
  async uploadVideo(params: UploadVideoParams, tokens: YouTubeTokens) {
    try {
      const { title, description, tags, privacyStatus, categoryId } = params;

      const { buffer, contentType } = await downloadFile(params.url);
      const tmpDir = os.tmpdir();
      const outputPath = path.join(tmpDir, `video-${Date.now()}.mp4`);
      await fs.promises.writeFile(outputPath, buffer);

      const client = this.getClientForUser(tokens);
      const service = google.youtube({ version: "v3", auth: client });

      // Upload video
      const videoRes = await service.videos.insert({
        part: ["snippet", "status"],
        requestBody: {
          snippet: {
            title,
            description,
            tags,
            categoryId: categoryId || "28", // default: Science & Technology
            defaultLanguage: "en",
            defaultAudioLanguage: "en",
          },
          status: { privacyStatus: privacyStatus || PrivacyStatus.PRIVATE }, // public | private | unlisted
        },
        media: { body: fs.createReadStream(outputPath) },
      });

      // Set thumbnail
      if (params.thumbUrl && videoRes.data.id) {
        const { buffer, contentType } = await downloadFile(params.thumbUrl);
        const tmpDir = os.tmpdir();
        const outputThumb = path.join(tmpDir, `video-${Date.now()}.mp4`);
        await fs.promises.writeFile(outputThumb, buffer);

        await service.thumbnails.set({
          videoId: videoRes.data.id,
          media: { body: fs.createReadStream(outputThumb) },
        });
      }

      return videoRes.data;
    } catch (err) {
      console.error(err);
      throw new Error("error upload");
    }
  }
}
