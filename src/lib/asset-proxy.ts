/**
 * Browser loads to R2 public URLs are blocked by CORS unless the bucket allows localhost.
 * Proxy through Next.js so the editor can fetch captions, audio, and images.
 */

function isR2PublicHost(hostname: string): boolean {
  return hostname.endsWith(".r2.dev") || hostname.includes("r2.cloudflarestorage.com");
}

export function shouldProxyAssetUrl(url: string): boolean {
  if (!url || typeof window === "undefined") return false;
  if (url.startsWith("/")) return false;

  try {
    const { hostname } = new URL(url);
    return isR2PublicHost(hostname);
  } catch {
    return false;
  }
}

export function proxiedAssetUrl(url: string): string {
  if (!shouldProxyAssetUrl(url)) return url;
  const path = `/api/assets/proxy?url=${encodeURIComponent(url)}`;
  if (typeof window !== "undefined") {
    return new URL(path, window.location.origin).href;
  }
  return path;
}
