import { generateCaptionClips } from "./caption-generator";
import { core, projectStore } from "./project";
import { nanoid } from "@openvideo/core";

export type WordsPerLineMode = "single" | "multiple";

interface RegenerateCaptionClipsOptions {
  captionClip: any;
  mode: WordsPerLineMode;
  fontSize?: number;
  fontFamily?: string;
  fontUrl?: string;
  styleUpdate?: any;
}

const CUSTOM_ANIMATIONS_CAPTIONS = [
  "charTypewriter",
  "scaleMidCaption",
  "scaleDownCaption",
  "upDownCaption",
  "upLeftCaption",
  "fadeByWord",
  "slideFadeByWord",
];

/**
 * Helper to generate animation objects for caption clips
 */
function getAnimationObjects(animation: string | string[], clipDuration: number) {
  const animations = Array.isArray(animation) ? animation : [animation];
  return animations
    .filter((a) => a !== "undefined")
    .map((a) => ({
      type: a,
      options: {
        duration: CUSTOM_ANIMATIONS_CAPTIONS.includes(a) ? clipDuration : clipDuration * 0.2,
        delay: 0,
      },
    }));
}

/**
 * Maps a flat styleUpdate object into the standard nested clip structure
 */
function applyStyleUpdate(json: any, styleUpdate: any, clipDuration: number) {
  if (!styleUpdate) return json;

  // Initialize style if missing
  if (!json.style) json.style = {};

  // 1. Basic Style Properties
  if (styleUpdate.fill) json.style.fill = styleUpdate.fill;
  if (styleUpdate.align) json.style.align = styleUpdate.align;
  if (styleUpdate.fontFamily) json.style.fontFamily = styleUpdate.fontFamily;
  if (styleUpdate.fontUrl) json.style.fontUrl = styleUpdate.fontUrl;
  if (styleUpdate.fontSize) json.style.fontSize = styleUpdate.fontSize;
  if (styleUpdate.textCase) json.style.textCase = styleUpdate.textCase;

  // 2. Stroke Properties
  if (styleUpdate.strokeWidth !== undefined || styleUpdate.stroke) {
    if (typeof json.style.stroke !== "object" || json.style.stroke === null) {
      json.style.stroke = { color: "#000000", width: 0 };
    }
    if (styleUpdate.strokeWidth !== undefined) json.style.stroke.width = styleUpdate.strokeWidth;
    if (styleUpdate.stroke) json.style.stroke.color = styleUpdate.stroke;
  }

  // 3. Shadow Properties
  if (styleUpdate.dropShadow) {
    json.style.shadow = {
      color: styleUpdate.dropShadow.color,
      alpha: styleUpdate.dropShadow.alpha,
      blur: styleUpdate.dropShadow.blur,
      distance: styleUpdate.dropShadow.distance,
      angle: styleUpdate.dropShadow.angle,
    };
  }

  // 4. Caption Metadata (Root 'caption' object only)
  if (!json.caption) json.caption = { words: [] };

  if (styleUpdate.wordAnimation) {
    json.caption.wordAnimation = styleUpdate.wordAnimation;
  }

  if (styleUpdate.textBoxStyle) {
    json.caption.textBoxStyle = styleUpdate.textBoxStyle;
  }

  if (styleUpdate.caption) {
    json.caption = {
      ...json.caption,
      ...styleUpdate.caption,
      colors: {
        ...(json.caption.colors || {}),
        ...(styleUpdate.caption.colors || {}),
      },
    };
  }

  // 5. Root Animations
  if (styleUpdate.animation) {
    json.animations = getAnimationObjects(styleUpdate.animation, clipDuration);
  }

  return json;
}

/**
 * Regenerates all caption clips associated with a mediaId based on new settings
 */
export async function regenerateCaptionClips({
  captionClip,
  mode,
  fontSize,
  fontFamily,
  fontUrl,
  styleUpdate,
}: RegenerateCaptionClipsOptions) {
  if (!captionClip?.mediaId) return;

  const project = projectStore.getState();
  const { clips, tracks } = project;
  const mediaId = captionClip.mediaId;

  // 1. Find and sort all sibling caption clips
  const siblingClips = Object.values(clips)
    .filter((c: any) => c.type === "Caption")
    .sort((a: any, b: any) => a.display.from - b.display.from);

  if (siblingClips.length === 0) return;

  // 2. Extract and normalized words from all sibling clips
  const allWords = siblingClips.flatMap((c: any) => {
    const clipStartUs = c.display.from;
    const words = c.words || c.caption?.words || c.originalOpts?.caption?.words || [];
    return words.map((w: any) => ({
      ...w,
      start: (clipStartUs + w.from * 1000) / 1000000,
      end: (clipStartUs + w.to * 1000) / 1000000,
      mediaClipId: c.mediaId,
    }));
  });

  if (allWords.length === 0) return;

  // 3. Generate new raw JSONs based on the new word-per-line mode
  const currentOpts = captionClip.originalOpts || {};
  const combinedStyle = { ...captionClip.style, ...(styleUpdate || {}) };

  const newClipsJSON = await generateCaptionClips({
    videoWidth: project.settings.width,
    videoHeight: project.settings.height,
    words: allWords,
    mode: mode,
    fontSize: fontSize || currentOpts.fontSize || 80,
    fontFamily: fontFamily || currentOpts.fontFamily || "Bangers-Regular",
    fontUrl: fontUrl || currentOpts.fontUrl,
    style: combinedStyle,
  });

  // 4. Determine target track
  const targetTrack = tracks.find((t) => t?.clipIds?.includes(captionClip.id));
  if (!targetTrack) return;

  // 5. Enrich and Clean each generated JSON
  const paddingY = styleUpdate?.textBoxStyle?.verticalPadding ?? 0;

  const clipsToAdd = newClipsJSON.map((json) => {
    const clipDuration = json.display.to - json.display.from;

    // Construct base object without root pollution
    let enriched: any = {
      type: "Caption",
      id: json.id || nanoid(),
      text: json.text,
      mediaId: captionClip.mediaId,
      left: json.left,
      top: json.top != null ? json.top - paddingY * 3 : 0,
      width: json.width,
      height: json.height,
      angle: captionClip.angle ?? 0,
      opacity: captionClip.opacity ?? 1,
      zIndex: captionClip.zIndex ?? 0,
      flip: captionClip.flip ?? null,
      display: { from: json.display.from, to: json.display.to },
      duration: clipDuration,
      style: { ...(json.style || {}) },
      caption: {
        ...(json.caption || {}),
        ...(captionClip.caption || {}),
        words: json.caption?.words || [], // Prefer newly generated words
      },
    };

    // Apply the style updates cleanly
    enriched = applyStyleUpdate(enriched, styleUpdate, clipDuration);

    return enriched;
  });

  // 6. Execute atomic swap via Core batch
  const fullClips = await Promise.all(clipsToAdd.map((c) => core.clip.prepare(c as any)));

  const removeCommand = {
    id: nanoid(),
    type: "clip.remove" as const,
    payload: { ids: siblingClips.map((c: any) => c.id) },
  };

  const addCommands = fullClips.map((clip) => ({
    id: nanoid(),
    type: "clip.add" as const,
    payload: { clip, trackId: targetTrack.id },
  }));

  core.batch([removeCommand, ...addCommands]);

  return clipsToAdd;
}
