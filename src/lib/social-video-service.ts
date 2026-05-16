import fs from "fs";
import path from "path";
import os from "os";

import { db } from "@/lib/database";
import { Asset } from "@/lib/database/types";
import { R2StorageService } from "@/lib/r2-storage";
import { GeminiService } from "@/lib/gemini/copilot";
import { SocialNetworkService } from "@/lib/socialmedia-downloader/yt-dlp";

import { config, config as socialsConfig } from "@/app/api/uploads/socials/config";
import { config as inngestConfig } from "@/inngest/config";
import { generateId } from "@/utils/id";

import { ProxyService } from "./socialmedia-downloader/webshare";

// Initialize R2 Service
const r2 = new R2StorageService({
  bucketName: socialsConfig.r2.bucket || inngestConfig.r2.bucket,
  accessKeyId: socialsConfig.r2.accessKeyId || inngestConfig.r2.accessKeyId,
  secretAccessKey: socialsConfig.r2.secretAccessKey || inngestConfig.r2.secretAccessKey,
  accountId: socialsConfig.r2.accountId || inngestConfig.r2.accountId,
  cdn: socialsConfig.r2.cdn || inngestConfig.r2.cdn,
});

export class SocialVideoService {
  /**
   * Processes a social media URL:
   * 1. Checks for existing asset.
   * 2. Downloads video.
   * 3. Uploads to R2.
   * 4. Saves to database.
   * 5. Indexes in Gemini.
   */
  static async processUrl(
    url: string,
    userId: string,
    projectId: string | null,
    onStatus?: (message: string) => void,
  ): Promise<Asset> {
    // 1. Check if we already have this video processed
    const existingAsset = await db
      .selectFrom("assets")
      .selectAll()
      .where("metadata", "@>", JSON.stringify({ original_url: url }))
      .where("user_id", "=", userId)
      .executeTakeFirst();

    if (existingAsset) {
      onStatus?.("Using previously processed video...");
      let asset = existingAsset as Asset;
      if (!asset.gemini_file_uri) {
        onStatus?.("Indexing existing video with AI...");
        asset = await GeminiService.indexAsset(asset);
      }
      return asset;
    }

    // 2. Download video
    onStatus?.("Downloading video from social media...");
    const proxyService = new ProxyService(
      config.webshare.url,
      config.webshare.apiKey,
      config.webshare.accountListUrl,
    );
    const snService = new SocialNetworkService(proxyService, config.YtDlp.blockedProxyListUrl);

    const { fileName, buffer, contentType } = await snService.downloadUrl(url);

    // 3. Upload to R2
    onStatus?.("Uploading video to storage...");
    const filePath = `UPLOADS/social-media/${generateId()}-${fileName}`;
    const publicUrl = await r2.uploadData(filePath, buffer, contentType);
    console.log("[SocialVideoService] Downloaded video url", publicUrl);

    // 4. Save to database
    onStatus?.("Saving video metadata...");
    const assetId = generateId();
    const newAsset: any = {
      id: assetId,
      user_id: userId,
      project_id: projectId,
      source_type: "user_uploaded",
      asset_type: "video",
      original_filename: fileName,
      unique_filename: path.basename(filePath),
      file_path: filePath,
      public_url: publicUrl,
      mime_type: contentType,
      file_size: buffer.length,
      metadata: {
        original_url: url,
        is_social_import: true,
      },
      created_at: new Date(),
      updated_at: new Date(),
    };

    await db.insertInto("assets").values(newAsset).execute();

    // 5. Index in Gemini
    onStatus?.("Analyzing video with AI...");

    // We need a local file for Gemini upload
    const tempFilePath = path.join(os.tmpdir(), `${assetId}-${fileName}`);
    fs.writeFileSync(tempFilePath, buffer);

    try {
      const geminiResult = await GeminiService.uploadFile(tempFilePath, contentType);

      // Update asset with Gemini info
      await db
        .updateTable("assets")
        .set({
          gemini_file_uri: geminiResult.fileUri,
          duration: geminiResult.duration ? parseFloat(geminiResult.duration) : null,
        })
        .where("id", "=", assetId)
        .execute();

      const updatedAsset = await db
        .selectFrom("assets")
        .selectAll()
        .where("id", "=", assetId)
        .executeTakeFirst();

      onStatus?.("Video ready for chat!");
      return updatedAsset as Asset;
    } finally {
      // Clean up temp file
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  }

  static isSocialUrl(url: string): boolean {
    const socialPatterns = [
      /youtube\.com\/watch\?v=/,
      /youtu\.be\//,
      /tiktok\.com\//,
      /kick\.com\//,
      /twitch\.tv\//,
    ];
    return socialPatterns.some((pattern) => pattern.test(url));
  }

  static extractUrls(text: string): string[] {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = text.match(urlRegex) || [];
    return matches.filter((url) => this.isSocialUrl(url));
  }
}
