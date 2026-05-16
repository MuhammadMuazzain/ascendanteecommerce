type PreviewKind = "image" | "video";

export type ProjectPreview = {
  previewUrl: string | null;
  previewKind: PreviewKind | null;
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** First usable still or clip URL inside a segment's stored JSON. */
export function extractPreviewFromSegmentData(data: unknown): { url: string; kind: PreviewKind } | null {
  if (!data || typeof data !== "object") return null;
  const seg = data as Record<string, unknown>;

  const shots = Array.isArray(seg.shots) ? seg.shots : [];
  for (const shot of shots) {
    if (!shot || typeof shot !== "object") continue;
    const s = shot as Record<string, unknown>;
    const videoUrl = asString(s.videoUrl);
    if (videoUrl) return { url: videoUrl, kind: "video" };
    const imageUrl = asString(s.imageUrl) ?? asString(s.firstFrame);
    if (imageUrl) return { url: imageUrl, kind: "image" };
  }

  const directVideo = asString(seg.videoUrl) ?? asString(seg.url) ?? asString(seg.activeUrl);
  if (directVideo) return { url: directVideo, kind: "video" };

  const directImage = asString(seg.imageUrl) ?? asString(seg.firstFrameUrl);
  if (directImage) return { url: directImage, kind: "image" };

  const assets = Array.isArray(seg.assets) ? seg.assets : [];
  for (const asset of assets) {
    if (!asset || typeof asset !== "object") continue;
    const a = asset as Record<string, unknown>;
    const url = asString(a.url);
    if (!url) continue;
    return { url, kind: a.type === "video" ? "video" : "image" };
  }

  const generated = Array.isArray(seg.generatedImageUrls) ? seg.generatedImageUrls : [];
  const firstGenerated = asString(generated[0]);
  if (firstGenerated) return { url: firstGenerated, kind: "image" };

  return null;
}

export function resolveProjectPreview(
  project: {
    thumbnail?: string | null;
    generationPreviewUrl?: string | null;
  },
  segments: Array<{ segment_data: unknown; order?: number | null }>,
): ProjectPreview {
  const thumbnail = asString(project.thumbnail);
  if (thumbnail) return { previewUrl: thumbnail, previewKind: "image" };

  const generationPreview = asString(project.generationPreviewUrl);
  if (generationPreview) return { previewUrl: generationPreview, previewKind: "image" };

  const sorted = [...segments].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  for (const segment of sorted) {
    const extracted = extractPreviewFromSegmentData(segment.segment_data);
    if (extracted) return { previewUrl: extracted.url, previewKind: extracted.kind };
  }

  return { previewUrl: null, previewKind: null };
}
