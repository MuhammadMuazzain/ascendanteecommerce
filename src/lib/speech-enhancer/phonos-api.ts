import crypto from "node:crypto";
import fs from "node:fs";
import { readFile } from "node:fs/promises";
import { Readable } from "node:stream";
import { PHONOS_BASE_URL, DEFAULT_HEADERS } from "./constants";
import { DirectUploadResponse, PhonosAPIResponse } from "./types";

/**
 * PhonosAPI client for interacting with Adobe's speech enhancement services.
 * Now fully optimized using built-in Node.js modules (fetch, crypto, fs).
 */
export class PhonosAPI {
  private bearerToken: string;
  private checksum: string | null = null;
  private signedId: string | null = null;

  /**
   * @param authorizationToken - Bearer token for Adobe Phonos API.
   */
  constructor(authorizationToken: string) {
    this.bearerToken = authorizationToken.startsWith("Bearer ")
      ? authorizationToken
      : `Bearer ${authorizationToken}`;
  }

  /**
   * Helper to perform fetch requests with default headers.
   */
  private async request<T = any>(
    path: string,
    options: RequestInit = {},
  ): Promise<{ status: number; data: T | null }> {
    const url = path.startsWith("http") ? path : `${PHONOS_BASE_URL}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...DEFAULT_HEADERS,
        authorization: this.bearerToken,
        ...(options.headers || {}),
      },
    });

    let data: T | null = null;
    if (response.status !== 204) {
      try {
        data = (await response.json()) as T;
      } catch {
        // Handle non-JSON responses if necessary
      }
    }

    return { status: response.status, data };
  }

  /**
   * Calculates MD5 checksum and reads file data.
   */
  private async calculateFileMetadata(filePath: string): Promise<Buffer> {
    const fileData = await readFile(filePath);
    const md5Digest = crypto.createHash("md5").update(fileData).digest();
    this.checksum = md5Digest.toString("base64");
    return fileData;
  }

  /**
   * Fetches a signed URL for direct upload to ActiveStorage.
   */
  public async getDirectUploadUrl(filePath: string): Promise<DirectUploadResponse | null> {
    const fileData = await this.calculateFileMetadata(filePath);

    const { status, data } = await this.request<DirectUploadResponse>(
      "/rails/active_storage/direct_uploads",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          blob: {
            filename: "test.mp3",
            content_type: "audio/mpeg",
            byte_size: fileData.length,
            checksum: this.checksum,
          },
        }),
      },
    );

    if (status !== 200 && status !== 201) {
      console.error(`[PhonosAPI] Direct upload registration failed with status ${status}:`, data);
      return null;
    }

    return data;
  }

  /**
   * Performs the file upload to the cloud storage.
   */
  public async uploadFile(filePath: string): Promise<string> {
    const fileData = await this.calculateFileMetadata(filePath);
    const directUploadData = await this.getDirectUploadUrl(filePath);

    if (!directUploadData || !directUploadData.direct_upload) {
      console.error("[PhonosAPI] Invalid direct upload data received:", directUploadData);
      throw new Error("Failed to obtain valid direct upload URL from Phonos.");
    }

    this.signedId = directUploadData.signed_id;

    const uploadHeaders = {
      "Content-Length": fileData.length.toString(),
      "Content-Md5": this.checksum!,
      "Content-Type": "audio/mpeg",
      "Content-Disposition": `inline; filename="test.mp3"; filename*=UTF-8''test.mp3`,
      Origin: "https://podcast.adobe.com",
      Referer: "https://podcast.adobe.com/",
    };

    console.log(`[PhonosAPI] Uploading to cloud storage: ${directUploadData.direct_upload.url}`);
    const response = await fetch(directUploadData.direct_upload.url, {
      method: "PUT",
      headers: uploadHeaders,
      body: fileData as any,
    });

    if (!response.ok) {
      throw new Error(`Cloud upload failed with status ${response.status}`);
    }

    console.log(`✅ File uploaded successfully. (signed_id: ${this.signedId})`);
    return this.signedId;
  }

  /**
   * Creates a speech enhancement track for the uploaded file.
   */
  public async createEnhanceSpeechTrack(trackId: string): Promise<string> {
    if (!this.signedId) {
      throw new Error("No signed_id found. Did you upload a file first?");
    }

    const { data } = await this.request("/api/v1/enhance_speech_tracks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: trackId,
        track_name: "test.mp3",
        model_version: "v2",
        signed_id: this.signedId,
      }),
    });

    return data?.id || trackId;
  }

  /**
   * Checks the result status of a track enhancement.
   */
  public async checkEnhancementResult(trackId: string): Promise<PhonosAPIResponse> {
    const { status, data } = await this.request(
      `/api/v1/enhance_speech_tracks/${trackId}/enhanced_audio`,
    );
    return { status, data };
  }

  /**
   * Downloads the enhanced audio from a result URL.
   */
  public async downloadEnhancedAudio(downloadUrl: string, outputPath?: string): Promise<string> {
    const fileName = outputPath || `audio_${Math.floor(Date.now() / 1000)}.wav`;
    const startTime = Date.now();

    const response = await fetch(downloadUrl);
    if (!response.ok || !response.body) {
      throw new Error(`Failed to download audio: ${response.statusText}`);
    }

    const totalSize = parseInt(response.headers.get("content-length") || "0");
    let downloadedSize = 0;
    const writer = fs.createWriteStream(fileName);

    // Convert Web ReadableStream to Node.js Readable
    const nodeReadable = Readable.fromWeb(response.body as any);

    return new Promise((resolve, reject) => {
      nodeReadable.on("data", (chunk: Buffer) => {
        downloadedSize += chunk.length;
        if (totalSize > 0) {
          const percent = Math.floor((100 * downloadedSize) / totalSize);
          process.stdout.write(`\rDownloading: ${percent}% complete`);
        }
      });

      nodeReadable.pipe(writer);
      writer.on("finish", () => {
        console.log(
          `\n✅ Downloaded: ${fileName} (${((Date.now() - startTime) / 1000).toFixed(2)}s)`,
        );
        resolve(fileName);
      });
      writer.on("error", reject);
    });
  }
}
