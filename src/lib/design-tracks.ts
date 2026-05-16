import type { Design } from "@/types/editor";
import { proxiedAssetUrl, shouldProxyAssetUrl } from "@/lib/asset-proxy";

type TrackLike = Record<string, unknown> & { clipIds?: unknown };

function collectClipIds(clips: unknown): Set<string> {
  const ids = new Set<string>();
  if (Array.isArray(clips)) {
    for (const clip of clips) {
      if (clip && typeof clip === "object" && typeof (clip as { id?: string }).id === "string") {
        ids.add((clip as { id: string }).id);
      }
    }
    return ids;
  }
  if (clips && typeof clips === "object") {
    for (const key of Object.keys(clips as Record<string, unknown>)) {
      ids.add(key);
    }
  }
  return ids;
}

/** Normalize a single track; drop invalid clip id references. */
export function normalizeTrack(
  track: unknown,
  validClipIds: Set<string>,
): TrackLike | null {
  if (track == null || typeof track !== "object") return null;

  const t = track as TrackLike;
  const rawClipIds = Array.isArray(t.clipIds) ? t.clipIds : [];
  const clipIds = rawClipIds.filter(
    (id): id is string => typeof id === "string" && id.length > 0 && validClipIds.has(id),
  );

  return {
    ...t,
    clipIds,
  };
}

/** Sanitize track list for OpenVideo core / timeline (no null entries, always clipIds[]). */
export function sanitizeTracksArray(
  tracks: unknown,
  clips: unknown,
): TrackLike[] {
  const validClipIds = collectClipIds(clips);
  if (!Array.isArray(tracks)) return [];

  return tracks
    .map((track) => normalizeTrack(track, validClipIds))
    .filter((track): track is TrackLike => track != null);
}

/** Ensures every track has a clipIds array — prevents runtime errors in OpenVideo / editor code. */
export function normalizeDesignTracks<T extends { tracks?: unknown[]; clips?: unknown }>(
  design: T,
): T {
  if (!design?.tracks || !Array.isArray(design.tracks)) {
    return design;
  }

  const sanitizedTracks = sanitizeTracksArray(design.tracks, design.clips);

  return {
    ...design,
    tracks: sanitizedTracks,
  };
}

function proxyClipMediaUrls(clip: Record<string, unknown>): Record<string, unknown> {
  const next = { ...clip };

  if (typeof next.src === "string" && next.src && shouldProxyAssetUrl(next.src)) {
    next.src = proxiedAssetUrl(next.src);
  }

  const metadata = next.metadata;
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    const meta = { ...(metadata as Record<string, unknown>) };
    if (typeof meta.previewUrl === "string" && shouldProxyAssetUrl(meta.previewUrl)) {
      meta.previewUrl = proxiedAssetUrl(meta.previewUrl);
    }
    next.metadata = meta;
  }

  // Legacy designs: music bed had trim.to = 0 so nothing played
  if (next.type === "Audio" && next.loop === true && next.display && typeof next.display === "object") {
    const display = next.display as { from?: number; to?: number };
    const trim = (next.trim && typeof next.trim === "object" ? next.trim : {}) as {
      from?: number;
      to?: number;
    };
    if ((trim.to ?? 0) === 0 && (display.to ?? 0) > 0) {
      next.trim = { from: trim.from ?? 0, to: display.to };
    }
  }

  return next;
}

/** Normalize tracks + proxy R2 media for browser/editor (CORS-safe). */
export function prepareDesignForEditor(design: Design): Design {
  const withTracks = normalizeDesignTracks(design) as Design;

  return {
    ...withTracks,
    clips: (withTracks.clips || [])
      .filter((clip) => clip != null && typeof clip === "object")
      .map((clip) => proxyClipMediaUrls(clip as Record<string, unknown>)),
  };
}

export function normalizeDesign(design: Design): Design {
  return prepareDesignForEditor(design);
}

export function findTrackByClipId(
  tracks: Array<{ clipIds?: string[] } | null | undefined> | undefined,
  clipId: string,
) {
  if (!tracks) return undefined;
  return tracks.find((t) => t?.clipIds?.includes(clipId));
}

/** Patch @openvideo/core store so getSnapshot never reads clipIds from undefined tracks. */
export function patchProjectStoreTrackSafety(store: {
  getState: () => {
    tracks: unknown;
    clips: unknown;
    settings: Record<string, unknown>;
  };
  setState: (partial: { getSnapshot: () => unknown }) => void;
}): void {
  store.setState({
    getSnapshot: () => {
      const current = store.getState();
      const tracks = sanitizeTracksArray(current.tracks, current.clips);
      const clips =
        current.clips && typeof current.clips === "object" && !Array.isArray(current.clips)
          ? (current.clips as Record<string, unknown>)
          : Object.fromEntries(
              (Array.isArray(current.clips) ? current.clips : [])
                .filter((c) => c && typeof c === "object" && (c as { id?: string }).id)
                .map((c) => [(c as { id: string }).id, c]),
            );

      return {
        settings: { ...current.settings },
        tracks: tracks.map((t) => ({
          ...t,
          clipIds: [...(t.clipIds ?? [])],
        })),
        clips: Object.fromEntries(
          Object.entries(clips).map(([k, v]) => [k, { ...(v as object) }]),
        ),
      };
    },
  });
}
