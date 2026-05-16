import mime from "mime/lite";

export const download = (url: string, filename: string) => {
  fetch(url)
    .then((response) => response.blob())
    .then((blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${filename}.mp4`); // Specify the filename for the downloaded video
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    })
    .catch((error) => console.error("Download error:", error));
};

export async function fileUrlToBuffer(
  fileUrl: string,
): Promise<{ buffer: Buffer; contentType: string }> {
  try {
    // If it's a local file path (starts with / or is an absolute path on disk)
    if (!fileUrl.startsWith("http") && !fileUrl.startsWith("data:")) {
      const fs = await import("fs");
      if (fs.existsSync(fileUrl)) {
        console.log(`[DOWNLOAD] Reading local file: ${fileUrl}`);
        const buffer = await fs.promises.readFile(fileUrl);
        const mime = await import("mime/lite");
        const contentType = mime.default.getType(fileUrl) || "application/octet-stream";
        return { buffer, contentType };
      }
    }

    console.log(`[DOWNLOAD] Fetching remote URL: ${fileUrl}`);
    // Fetch the file as an array buffer
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    // Extract MIME type from the response headers
    let contentType = response.headers.get("content-type") || "application/octet-stream";

    // Fallback to URL extension if MIME is generic or bin
    const mime = await import("mime/lite");
    try {
      const urlObj = new URL(fileUrl);
      const urlPath = urlObj.pathname.toLowerCase();
      const urlExt = urlPath.split(".").pop()?.split(/[?#]/)[0];

      const isGeneric =
        contentType === "application/octet-stream" ||
        contentType === "binary/octet-stream" ||
        !contentType;

      if (isGeneric && urlExt) {
        const inferredMime = mime.default.getType(urlExt);
        if (inferredMime) contentType = inferredMime;
      }
    } catch (e) {
      // Ignore URL parsing errors for non-standard URLs
    }

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
