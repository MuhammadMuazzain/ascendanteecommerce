import { SocialNetworkService } from "../../src/lib/socialmedia-downloader/yt-dlp";
import { ProxyService } from "../../src/lib/socialmedia-downloader/webshare";

import { R2StorageService } from "../../src/lib/r2-storage";

import { generateId } from "../../src/utils/id";

import { config as socialsConfig } from "../../src/app/api/uploads/socials/config";

// Initialize R2 Service (mirroring SocialVideoService)
const r2 = new R2StorageService({
  bucketName: socialsConfig.r2.bucket,
  accessKeyId: socialsConfig.r2.accessKeyId,
  secretAccessKey: socialsConfig.r2.secretAccessKey,
  accountId: socialsConfig.r2.accountId,
  cdn: socialsConfig.r2.cdn,
});

async function test() {
  const url = "https://www.youtube.com/watch?v=tyjUH5TLSTM";
  console.log(`Testing yt-dlp with URL: ${url}`);

  const proxyService = new ProxyService(
    socialsConfig.webshare.url,
    socialsConfig.webshare.apiKey,
    socialsConfig.webshare.accountListUrl,
  );
  const snService = new SocialNetworkService(proxyService, socialsConfig.YtDlp.blockedProxyListUrl);

  try {
    console.log("Fetching video info...");
    const info = await snService.getVideoInfo(url);
    console.log("Video Info:", JSON.stringify(info, null, 2));

    console.log("Starting download...");
    const result = await snService.downloadUrl(url, "high"); // Use low quality for faster test
    console.log("Download successful!");
    console.log("Filename:", result.fileName);
    console.log("Content Type:", result.contentType);
    console.log("Buffer size:", result.buffer.length);

    // R2 Upload logic (mirroring SocialVideoService)
    console.log("Uploading to R2...");
    const filePath = `TESTS/UPLOADS/social-media/${generateId()}-${result.fileName}`;
    const publicUrl = await r2.uploadData(filePath, result.buffer, result.contentType);
    console.log("Upload successful! Public URL:", publicUrl);

    process.exit(0);
  } catch (error) {
    console.error("Test failed:", error);
    process.exit(1);
  }
}

test();
