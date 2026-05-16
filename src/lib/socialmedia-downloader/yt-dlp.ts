import path from "path";
import mime from "mime";
import os from "os";
import fs from "fs";
import fsp from "fs/promises";
import https from "https";
import { FormatOptions, QualityOptions, YtDlp } from "ytdlp-nodejs";
import { generateId } from "@/utils/id";
import ffmpegStatic from "ffmpeg-static";
import { ProxyService } from "./webshare";

interface infoVideo {
  id: any;
  title: any;
  description: any;
  thumbnail: any;
  duration: any;
  channel: any;
  username: any;
  tags: any;
}

export function createTempFolder(prefix = "temp-"): string {
  const tmpBase = os.tmpdir();
  const folderPath = path.join(tmpBase, `${prefix}${generateId()}`);
  fs.mkdirSync(folderPath);
  return folderPath;
}

export async function fileUrlToBuffer(
  fileUrl: string,
): Promise<{ buffer: Buffer; contentType: string }> {
  try {
    // Fetch the file as an array buffer
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    // Extract MIME type from the response headers
    const contentType = response.headers.get("content-type") || "application/octet-stream";

    // Convert the array buffer to a Node.js buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Return the buffer, MIME type, and size
    return { buffer, contentType };
  } catch (error) {
    console.error("Error converting URL to buffer:", error);
    throw error;
  }
}

export type VideoQuality = "high" | "medium" | "low";

export class SocialNetworkService {
  private ytdlp: YtDlp;
  private proxyService: ProxyService;
  private binaryUrl: string;
  private binaryUrlFallback: string;
  private blockedProxyListUrl?: string;
  private readonly binaryPath: string;
  private baseTempFolder: string = createTempFolder("social-request-");

  constructor(proxyService: ProxyService, blockedProxyListUrl?: string) {
    this.proxyService = proxyService;
    this.blockedProxyListUrl = blockedProxyListUrl;

    const platform = os.platform();
    const binaryName = platform === "darwin" ? "yt-dlp_macos" : "yt-dlp_linux";

    this.binaryUrl = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${binaryName}`;
    this.binaryUrlFallback = `https://cdn.scenify.io/yt-dlp/${binaryName}`;
    this.binaryPath = path.join(os.tmpdir(), binaryName);
  }

  private async ensureBinary(): Promise<string> {
    if (fs.existsSync(this.binaryPath)) {
      return this.binaryPath;
    }

    try {
      console.log("Downloading yt-dlp binary from primary source:", this.binaryUrl);
      await this.downloadFile(this.binaryUrl, this.binaryPath);
      await fsp.chmod(this.binaryPath, 0o755);
      return this.binaryPath;
    } catch (err: any) {
      console.warn("Primary download failed, trying fallback:", err.message);
      try {
        await this.downloadFile(this.binaryUrlFallback, this.binaryPath);
        await fsp.chmod(this.binaryPath, 0o755);
        return this.binaryPath;
      } catch (fallbackErr: any) {
        console.error("Fallback download also failed:", fallbackErr.message);
        throw new Error(`Failed to download yt-dlp binary: ${fallbackErr.message}`);
      }
    }
  }

  private downloadFile(url: string, dest: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(dest);

      https
        .get(url, (response) => {
          // Follow redirects
          if (response.statusCode === 301 || response.statusCode === 302) {
            const redirect = response.headers.location;
            if (!redirect) {
              reject(new Error("Redirect without location header"));
              return;
            }
            file.close();
            fs.unlink(dest, () => {
              this.downloadFile(redirect, dest).then(resolve).catch(reject);
            });
            return;
          }

          if (response.statusCode !== 200) {
            reject(new Error(`Download failed: ${response.statusCode}`));
            return;
          }

          response.pipe(file);
          file.on("finish", () => file.close(() => resolve()));
        })
        .on("error", (err) => {
          fs.unlink(dest, () => reject(err));
        });
    });
  }

  private async ensureCookies(cookieUrl: string): Promise<string | undefined> {
    const cookiePath = path.join(this.baseTempFolder, "cookie.txt");

    try {
      await fsp.access(cookiePath);
      return cookiePath;
    } catch {
      // Continue to download
    }

    try {
      console.log("Downloading cookies from", cookieUrl);
      const { buffer: buff } = await fileUrlToBuffer(cookieUrl);
      await fsp.writeFile(cookiePath, buff.toString());
      return cookiePath;
    } catch (error) {
      console.error("Failed to download cookies:", error);
      return undefined;
    }
  }

  private async getFilteredPairs() {
    let blockedProxies: string[] = [];
    try {
      const allPairs = await this.proxyService.getCookiesAndProxies();
      const urls = allPairs.sort(() => 0.5 - Math.random());

      if (!this.blockedProxyListUrl) return urls;

      const res = await fetch(this.blockedProxyListUrl);
      if (res.ok) {
        const data = await res.json();
        blockedProxies = data.proxies?.blocked || [];
      }

      return urls.filter((pair) => !blockedProxies.includes(pair.proxyUrl));
    } catch (err) {
      console.error("Error fetching blocked proxies:", err);
      throw new Error("Error fetching proxies");
    }
  }

  private selectBestFormat(formats: any[]) {
    const httpsFormats = (formats || []).filter((f) => f.protocol === "https");
    const bestVideo = httpsFormats.findLast((f) => {
      if (!f.vcodec || f.vcodec === "none") return false; // ignore audio-only
      if (f.height > 1000) {
        // for high resolutions, webm only
        return f.ext === "webm";
      } else {
        // for lower resolutions, mp4 or webm
        return f.ext === "mp4" || f.ext === "webm";
      }
    });

    if (!bestVideo) return null;

    return {
      filter: "mergevideo",
      type: bestVideo.ext,
    };
  }

  async downloadUrl(url: string, quality: VideoQuality = "high") {
    const binaryPath = await this.ensureBinary();

    this.ytdlp = new YtDlp({
      binaryPath,
      ffmpegPath: ffmpegStatic || undefined,
    });

    const id = generateId();
    const failedAttempts: {
      name: string;
      proxyUrl?: string;
      cookieUrl?: string;
      error: string;
    }[] = [];

    // Build configuration list
    const configurations: {
      name: string;
      proxyUrl?: string;
      cookieUrl?: string;
    }[] = [{ name: "Direct" }];

    try {
      const pairs = await this.getFilteredPairs();
      for (let i = 0; i < pairs.length; i++) {
        const { proxyUrl, cookieUrl } = pairs[i];
        configurations.push({ name: `Proxy ${i + 1}`, proxyUrl });
        if (cookieUrl) {
          configurations.push({
            name: `Proxy ${i + 1} + Cookie`,
            proxyUrl,
            cookieUrl,
          });
        }
      }
    } catch (err) {
      console.error("Error getting filtered pairs:", err);
    }

    let bestFormat: { filter: string; type: "mp4" | "webm" } | null = null;

    try {
      for (const config of configurations) {
        const { name, proxyUrl, cookieUrl } = config;

        try {
          const currentOptions: FormatOptions<keyof QualityOptions> = {
            format: undefined,
            noCheckCertificates: true,
            noWarnings: true,
            proxy: proxyUrl,
          };

          if (cookieUrl) {
            const cookiePath = await this.ensureCookies(cookieUrl);
            if (cookiePath) {
              currentOptions.cookies = cookiePath;
            } else {
              throw new Error("Failed to download required cookies");
            }
          }

          // Step 1: Get Format (if not already found)
          if (!bestFormat) {
            console.log(`Attempting info: ${name}`);
            const info: any = await this.ytdlp.getInfoAsync(url, currentOptions);
            bestFormat = this.selectBestFormat(info.formats);
            if (!bestFormat) {
              throw new Error("No compatible video format found");
            }
            console.log(`SUCCESS info with ${name}, format ${bestFormat.type}`);
          }

          // Step 2: Download
          console.log(`Attempting download: ${name}`);
          await this.ytdlp.downloadAsync(url, {
            ...currentOptions,
            format: bestFormat as any,
            mergeOutputFormat: bestFormat.type,
            impersonate: ["chrome:windows-10"],
            output: path.join(this.baseTempFolder, `${id}.%(ext)s`),
            ffmpegLocation: ffmpegStatic!,
            onProgress: (progress: any) => {
              if (progress.status === "downloading") {
                console.log(`[Attempting: ${name}] ${progress.percentage}%`);
              }
            },
          });

          const result = await this.processDownloadedFile(id);
          console.log(`SUCCESS download with ${name}`);
          return result;
        } catch (err: any) {
          console.log(`${name} failed: ${err.message}`);
          failedAttempts.push({
            name,
            proxyUrl,
            cookieUrl,
            error: err?.message ?? String(err),
          });
          // Continue to next configuration
        }
      }

      console.error("All download attempts failed:", JSON.stringify(failedAttempts, null, 2));
      throw new Error("All download attempts failed.");
    } finally {
      try {
        if (fs.existsSync(this.baseTempFolder)) {
          fs.rmSync(this.baseTempFolder, { recursive: true, force: true });
        }
      } catch (cleanupError) {
        console.error("Cleanup failed:", cleanupError);
      }
    }
  }

  async getVideoInfo(url: string): Promise<infoVideo> {
    const binaryPath = await this.ensureBinary();
    this.ytdlp = new YtDlp({
      binaryPath,
      ffmpegPath: ffmpegStatic || undefined,
    });

    const baseOptions: FormatOptions<keyof QualityOptions> = {
      format: undefined,
      noCheckCertificates: true,
      noWarnings: true,
    };

    const attemptInfo = async (
      name: string,
      options: FormatOptions<keyof QualityOptions>,
    ): Promise<infoVideo> => {
      console.log(`Attempting info: ${name}`);
      const info: any = await this.ytdlp.getInfoAsync(url, options);
      //console.log(`formats from ${url}: `, info.formats || []);
      return {
        id: info.id,
        title: info.title,
        description: info.description,
        thumbnail: info.thumbnail,
        duration: info.duration,
        channel: info.channel || info.uploader,
        username: info.uploader_id,
        tags: info.tags || [],
      };
    };

    const failedAttempts: {
      name: string;
      proxyUrl?: string;
      cookieUrl?: string;
      error: string;
    }[] = [];

    // Direct attempt
    try {
      const result = await attemptInfo("Direct", baseOptions);
      console.log("SUCCESS: Info retrieved with combination: Proxy: Direct, Cookie: None");
      if (failedAttempts.length > 0) {
        console.log(
          "Failed attempts during info retrieval:",
          JSON.stringify(failedAttempts, null, 2),
        );
      }
      return result;
    } catch (err: any) {
      console.log("Direct attempt failed. Moving to proxies...");
      failedAttempts.push({
        name: "Direct",
        error: err?.message ?? String(err),
      });
    }

    // Proxy attempts
    const pairs = (await this.proxyService.getCookiesAndProxies()).sort(() => 0.5 - Math.random());

    for (let i = 0; i < pairs.length; i++) {
      const { proxyUrl, cookieUrl } = pairs[i];

      // Proxy only
      try {
        const result = await attemptInfo(`Proxy ${i + 1}`, {
          ...baseOptions,
          proxy: proxyUrl,
        });
        console.log(`SUCCESS: Info retrieved with combination: Proxy: ${proxyUrl}, Cookie: None`);
        if (failedAttempts.length > 0) {
          console.log(
            "Failed attempts during info retrieval:",
            JSON.stringify(failedAttempts, null, 2),
          );
        }
        return result;
      } catch (err: any) {
        console.log(`Proxy ${i + 1} failed. Proxy: ${proxyUrl}`);
        failedAttempts.push({
          name: `Proxy ${i + 1}`,
          proxyUrl,
          error: err?.message ?? String(err),
        });
      }

      // Proxy + Cookie
      if (cookieUrl) {
        try {
          const cookiePath = await this.ensureCookies(cookieUrl);

          if (cookiePath) {
            const result = await attemptInfo(`Proxy ${i + 1} + Cookie`, {
              ...baseOptions,
              proxy: proxyUrl,
              cookies: cookiePath,
            });
            console.log(
              `SUCCESS: Info retrieved with combination: Proxy: ${proxyUrl}, Cookie: ${cookieUrl}`,
            );
            if (failedAttempts.length > 0) {
              console.log(
                "Failed attempts during info retrieval:",
                JSON.stringify(failedAttempts, null, 2),
              );
            }
            return result;
          }
        } catch (err: any) {
          console.log(`Proxy ${i + 1} + Cookie failed. Proxy: ${proxyUrl}, Cookie: ${cookieUrl}`);
          failedAttempts.push({
            name: `Proxy ${i + 1} + Cookie`,
            proxyUrl,
            cookieUrl,
            error: err?.message ?? String(err),
          });
        }
      }
    }

    console.error("All info retrieval attempts failed:", JSON.stringify(failedAttempts, null, 2));
    throw new Error("Failed to get video info after all attempts.");
  }

  private async processDownloadedFile(id: string) {
    const files = await fsp.readdir(this.baseTempFolder);
    const downloadedFile = files.find((file) => file.startsWith(`${id}.`));
    if (!downloadedFile) throw new Error("File not found");

    const filePath = path.join(this.baseTempFolder, downloadedFile);
    const buffer = await fsp.readFile(filePath);
    const contentType = mime.getType(path.extname(filePath)) || "application/octet-stream";

    // We don't unlink here if we are going to delete the whole folder later,
    // but it's fine to keep it for memory efficiency if the files are large.
    // However, if we use a shared folder, unlinking individual files is safer
    // to avoid name collisions if IDs aren't unique enough (though they should be).
    await fsp.unlink(filePath).catch(() => {});
    return { buffer, contentType, fileName: downloadedFile };
  }
}
