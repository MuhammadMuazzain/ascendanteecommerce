import { fontManager, getPresetTemplate } from "@openvideo/engine-pixi";
import { Design } from "@/types/editor";
import { FONT_DEFAULT, FONT_SIZE_DEFAULT, FONT_URL_DEFAULT } from "@/constants/captions";
import { ICaptionsControlProps } from "@/components/editor/interface/captions";
import {
  CAPTION_PRESET_TIKTOK_MEDIUM_ID,
  resolveCaptionPresetById,
} from "@/lib/caption-presets";
import { alignTranscriptionWordsToScript } from "@/lib/transcribe/align-to-script";
import * as PIXI from "pixi.js";
import { COMBO_ANIMATION_GROUPS } from "@/constants/custom-animations";
import { proxiedAssetUrl } from "@/lib/asset-proxy";
import { normalizeDesignTracks } from "@/lib/design-tracks";

type Segment = {
  display: {
    to: number;
    from: number;
  };
  words: string;
  duration: number;
};

function extractFields(data: Segment[]) {
  return data.map(({ display, words, duration }) => ({
    display,
    words,
    duration,
  }));
}

/**
 * Generates a unique clip ID
 */
const generateClipId = (prefix: string = "clip"): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  return `${prefix}_${timestamp}_${random}`;
};

/**
 * Generates a unique track ID
 */
const generateTrackId = (type: string): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  return `track_${type.toLowerCase()}_${timestamp}_${random}`;
};

/**
 * Calculates dimensions and position to fill a target area while maintaining aspect ratio
 */
export const calculateFillDimensions = (
  srcWidth: number,
  srcHeight: number,
  targetWidth: number,
  targetHeight: number,
) => {
  if (!srcWidth || !srcHeight) {
    return { width: targetWidth, height: targetHeight, left: 0, top: 0 };
  }
  const srcRatio = srcWidth / srcHeight;
  const targetRatio = targetWidth / targetHeight;

  let width, height, left, top;

  if (srcRatio > targetRatio) {
    // Source is wider than target
    height = targetHeight;
    width = targetHeight * srcRatio;
    left = (targetWidth - width) / 2;
    top = 0;
  } else {
    // Source is taller than target
    width = targetWidth;
    height = targetWidth / srcRatio;
    left = 0;
    top = (targetHeight - height) / 2;
  }

  return { width, height, left, top };
};

/**
 * Calculates dimensions and position to fit content within a target area while maintaining aspect ratio
 * The entire content will be visible (no cropping), with letterboxing/pillarboxing as needed
 */
export const calculateFitDimensions = (
  srcWidth: number,
  srcHeight: number,
  targetWidth: number,
  targetHeight: number,
) => {
  const srcRatio = srcWidth / srcHeight;
  const targetRatio = targetWidth / targetHeight;

  let width, height, left, top;

  if (srcRatio > targetRatio) {
    // Source is wider than target - fit to width
    width = targetWidth;
    height = targetWidth / srcRatio;
    left = 0;
    top = (targetHeight - height) / 2;
  } else {
    // Source is taller than target - fit to height
    height = targetHeight;
    width = targetHeight * srcRatio;
    left = (targetWidth - width) / 2;
    top = 0;
  }

  return { width, height, left, top };
};

/**
 * Gets image dimensions from a URL
 */
export const getImageDimensions = (url: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (img.naturalWidth <= 0 || img.naturalHeight <= 0) {
        reject(new Error("Invalid image dimensions"));
        return;
      }
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = (err) => {
      console.error("Error loading image for dimensions:", url, err);
      reject(err);
    };
    img.src = proxiedAssetUrl(url);
  });
};

/**
 * Gets video dimensions from a URL
 */
export const getVideoDimensions = (url: string): Promise<{ width: number; height: number }> => {
  console.log("getVideoDimensions", url);
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.onloadedmetadata = () => {
      resolve({ width: video.videoWidth, height: video.videoHeight });
    };
    video.onerror = (err) => {
      console.error("Error loading video for dimensions:", url, err);
      reject(err);
    };
    video.src = proxiedAssetUrl(url);
    video.load();
  });
};

/**
 * Fetches caption data from a URL
 */
export const fetchCaptionData = async (url: string): Promise<any> => {
  try {
    const response = await fetch(proxiedAssetUrl(url));
    if (!response.ok) {
      throw new Error(`Failed to fetch caption data: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching caption data:", error);
    return null;
  }
};

/**
 * Groups words by width using canvas text measurement
 * Words are accumulated until the text width exceeds maxWidth, then a new caption is created
 */
export const groupWordsByWidth = (
  words: any[],
  maxWidth: number = 800,
  fontSize: number = FONT_SIZE_DEFAULT,
  fontFamily: string = FONT_DEFAULT,
  maxLines: number = 1,
  shots: any[] = [],
  textCase: string | null = null,
): any[] => {
  if (!words || words.length === 0) return [];

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];

  ctx.font = `${fontSize}px ${fontFamily}`;

  const captions: any[] = [];
  let currentWords: any[] = [];

  let lines: string[] = [""];
  let currentLineCount = 1;
  let lastCommaIndex = -1;

  const getCurrentText = () => lines.join("\n");

  const measureTextWidth = (text: string): number => {
    const metrics = ctx.measureText(text);
    let width = metrics.width;

    const punctuationMatches = text.match(/[.,!?;:]/g);
    if (punctuationMatches) {
      width += punctuationMatches.length * 4;
    }

    return width;
  };

  const rebuildLines = (words: any[]) => {
    const newLines: string[] = [];
    let tempLine = "";

    for (const w of words) {
      const text = w.word || w.text;
      const test = tempLine ? `${tempLine} ${text}` : text;

      if (measureTextWidth(test) + 160 > maxWidth) {
        newLines.push(tempLine);
        tempLine = text;
      } else {
        tempLine = test;
      }
    }

    if (tempLine) newLines.push(tempLine);

    return newLines;
  };

  const finalizeCaption = () => {
    if (currentWords.length === 0) return;

    const currentText = getCurrentText();

    const firstWord = currentWords[0];
    const lastWord = currentWords[currentWords.length - 1];

    const metrics = ctx.measureText("AaFfLMZpPqQ");
    const singleLineHeight =
      metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent || fontSize;

    const totalHeight = singleLineHeight * currentLineCount;

    let maxW = 0;
    const widthSpace = ctx.measureText(" ").width + 2;

    lines.forEach((line) => {
      const lineText = textCase === "uppercase" ? line.toUpperCase() : line;
      const width = measureTextWidth(lineText);
      maxW = Math.max(maxW, width);
    });

    const wordsLine = lines[0].split(" ");
    const totalWidth = maxW + (wordsLine.length + 1) * widthSpace;

    captions.push({
      text: currentText,
      width: totalWidth,
      height: totalHeight,
      mediaClipId: currentWords[0].mediaClipId || "",
      words: currentWords.map((w, idx) => ({
        text: w.word || w.text || "",
        from: idx === 0 ? 0 : (w.start - firstWord.start) * 1000,
        to: (w.end - firstWord.start) * 1000,
        isKeyWord: idx === 0 || idx === currentWords.length - 1,
        paragraphIndex: w.paragraphIndex ?? "",
      })),
      from: firstWord.start,
      to: lastWord.end,
    });
  };

  const resetBlock = () => {
    currentWords = [];
    lines = [""];
    currentLineCount = 1;
    lastCommaIndex = -1;
  };

  if (shots && shots.length > 0) {
    let wordIndex = 0;
    for (const shot of shots) {
      const shotWordsStr = shot.words || "";
      if (!shotWordsStr.trim()) continue;

      const shotWordsCount = shotWordsStr.trim().split(/\s+/).length;

      resetBlock();
      for (let i = 0; i < shotWordsCount && wordIndex < words.length; i++) {
        currentWords.push(words[wordIndex++]);
      }

      if (currentWords.length > 0) {
        lines = rebuildLines(currentWords);
        currentLineCount = lines.length;
        finalizeCaption();
      }
    }
    return captions;
  }

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const wordText = word.word || word.text || "";

    const endsWithPeriod = /[.!?]$/.test(wordText);
    const endsWithComma = /[,;:]$/.test(wordText);

    const currentLine = lines[lines.length - 1];

    const testLineText = currentLine ? `${currentLine} ${wordText}` : wordText;

    const testLineWidth = measureTextWidth(testLineText) + 160;

    const isOverflowing = testLineWidth > maxWidth;

    if (isOverflowing && currentLine !== "") {
      // Intentar cortar en coma si existe
      if (lastCommaIndex !== -1) {
        const wordsBeforeComma = currentWords.slice(0, lastCommaIndex + 1);
        const wordsAfterComma = currentWords.slice(lastCommaIndex + 1);

        // cerrar caption antes de coma
        currentWords = wordsBeforeComma;
        lines = rebuildLines(wordsBeforeComma);
        currentLineCount = lines.length;
        finalizeCaption();

        // reiniciar con lo que sigue
        currentWords = [...wordsAfterComma, word];
        lines = [currentWords.map((w) => w.word || w.text).join(" ")];
        currentLineCount = 1;

        lastCommaIndex = -1;

        if (endsWithPeriod) {
          finalizeCaption();
          resetBlock();
        } else if (endsWithComma) {
          lastCommaIndex = currentWords.length - 1;
        }

        continue;
      }

      if (currentLineCount < maxLines) {
        const currentLineWords = lines[lines.length - 1].split(" ");

        const lastWordFromLine = currentLineWords.pop();

        if (lastWordFromLine) {
          lines[lines.length - 1] = currentLineWords.join(" ");

          const newLine = lastWordFromLine;
          lines.push(newLine);
          currentLineCount++;

          const updatedNewLine = `${lines[lines.length - 1]} ${wordText}`;
          lines[lines.length - 1] = updatedNewLine;
          currentWords.push(word);
        } else {
          lines.push(wordText);
          currentLineCount++;
          currentWords.push(word);
        }

        if (endsWithPeriod) {
          finalizeCaption();
          resetBlock();
          continue;
        }

        if (endsWithComma) {
          lastCommaIndex = currentWords.length - 1;
        }
      } else {
        finalizeCaption();
        resetBlock();

        currentWords = [word];
        lines = [wordText];
        currentLineCount = 1;

        if (endsWithPeriod) {
          finalizeCaption();
          resetBlock();
          continue;
        }

        if (endsWithComma) {
          lastCommaIndex = currentWords.length - 1;
        }
      }

      continue;
    }

    lines[lines.length - 1] = testLineText;
    currentWords.push(word);

    if (endsWithComma) {
      lastCommaIndex = currentWords.length - 1;
    }

    if (endsWithPeriod) {
      finalizeCaption();
      resetBlock();
    }
  }

  finalizeCaption();

  return captions;
};

/**
 * Converts schema.json format to exported.json format compatible with Studio
 */
export const convertSchemaToDesign = async (
  schemaJson: any,
  schemaType?: string,
): Promise<Design> => {
  const type = schemaType || schemaJson.type;
  console.log(`Converting schema of type: ${type}`);
  console.log({ schemaJson });
  const clips: any[] = [];
  const tracks: any[] = [];

  // Track IDs for organizing clips
  const videoTrackId = generateTrackId("video");
  const audioTrackId = generateTrackId("audio");
  const captionTrackId = generateTrackId("captions");
  const bRollTrackId = generateTrackId("bRoll");
  const musicTrackId = generateTrackId("music");

  const videoClipIds: string[] = [];
  const audioClipIds: string[] = [];
  const captionClipIds: string[] = [];
  const bRollClipIds: string[] = [];
  const musicClipIds: string[] = [];
  const sfxTracks: {
    id: string;
    name: string;
    clipIds: string[];
    endTimeUs: number;
  }[] = [];

  let currentSegmentOffsetUs = 0;
  let lastOutPreset = "";

  // Track last used animation group to prevent consecutive repetition across segments
  let lastAnimationGroupKey: string | null = null;

  // Extract aspect ratio to calculate dimensions
  const aspectRatio = schemaJson.aspectRatio || "9:16";
  const [widthRatio, heightRatio] = aspectRatio.split(":").map(Number);

  // Get caption configuration from schema or use defaults
  const captionConfig = schemaJson.caption || {
    id: CAPTION_PRESET_TIKTOK_MEDIUM_ID,
    name: "TikTok Text Medium",
    position: "bottom",
    size: "medium",
  };

  const captionPreset =
    resolveCaptionPresetById(captionConfig.id) ??
    resolveCaptionPresetById(CAPTION_PRESET_TIKTOK_MEDIUM_ID) ??
    resolveCaptionPresetById("caption-7") ??
    resolveCaptionPresetById("caption-6");
  // Per-word captions create hundreds of BitmapFonts and spam refresh during playback.
  const styleCaptions: ICaptionsControlProps = {
    ...captionPreset!,
    type: "multiple",
  };
  // Map size to fontSize
  const sizeToFontSize: Record<string, number> = {
    small: 48,
    medium: 64,
    large: 80,
  };
  const fontSize = 80;

  // Map position to verticalAlign
  const positionToVerticalAlign: Record<string, "top" | "center" | "bottom"> = {
    top: "top",
    middle: "center",
    bottom: "bottom",
  };
  const verticalAlign = positionToVerticalAlign[captionConfig.position] || "bottom";

  // Load font for caption text measurement
  await fontManager.loadFonts([
    {
      name: styleCaptions.fontFamily ?? FONT_DEFAULT,
      url: styleCaptions.fontUrl ?? FONT_URL_DEFAULT,
    },
  ]);

  // Default dimensions for 9:16 aspect ratio
  let width = 1080;
  let height = 1920;

  // Adjust based on aspect ratio
  if (widthRatio && heightRatio) {
    if (widthRatio > heightRatio) {
      // Landscape
      width = 1280;
      height = Math.round((1280 * heightRatio) / widthRatio);
    } else {
      // Portrait or square
      height = 1920;
      width = Math.round((1920 * widthRatio) / heightRatio);
    }
  }

  // Process segments
  if (schemaJson.segments && Array.isArray(schemaJson.segments)) {
    for (const item of schemaJson.segments) {
      const segment = item.segment_data || item;
      // Track the media clip ID for this segment (for linking captions)
      let segmentMediaClipId: string | null = null;

      // Select a random animation group for this segment (avoid repeating the last group)
      const groupKeys = Object.keys(COMBO_ANIMATION_GROUPS) as Array<
        keyof typeof COMBO_ANIMATION_GROUPS
      >;
      let currentGroupKey: keyof typeof COMBO_ANIMATION_GROUPS;

      if (groupKeys.length > 1 && lastAnimationGroupKey !== null) {
        do {
          currentGroupKey = groupKeys[Math.floor(Math.random() * groupKeys.length)];
        } while (currentGroupKey === lastAnimationGroupKey);
      } else {
        currentGroupKey = groupKeys[Math.floor(Math.random() * groupKeys.length)];
      }

      const segmentAnimationGroup = COMBO_ANIMATION_GROUPS[currentGroupKey];
      lastAnimationGroupKey = currentGroupKey;

      // Track last used animation within the segment to prevent consecutive repetition
      let segmentLastAnimationName: string | null = null;

      // Process shots (video/image)
      if (segment.shots && Array.isArray(segment.shots)) {
        for (let idx = 0; idx < segment.shots.length; idx++) {
          const shot = segment.shots[idx];
          const videoSrc = shot.videoUrl || shot.video;
          const imgSrc = shot.imageUrl || shot.firstFrame;

          if (videoSrc) {
            const clipId = shot.id || generateClipId();
            segmentMediaClipId = clipId;
            videoClipIds.push(clipId);

            const fromUs = Math.round(currentSegmentOffsetUs + (shot.display?.from ?? 0) * 1000);
            const toUs = Math.round(
              currentSegmentOffsetUs +
                (shot.display?.to ?? (shot.display?.from ?? 0) + (shot.duration ?? 0)) * 1000,
            );
            const durationUs = toUs - fromUs;

            let videoWidth = width;
            let videoHeight = height;
            let videoLeft = 0;
            let videoTop = 0;

            try {
              let srcToLoad = videoSrc;
              const dimensions = await getVideoDimensions(srcToLoad);
              const fill = calculateFillDimensions(
                dimensions.width,
                dimensions.height,
                width,
                height,
              );
              videoWidth = fill.width;
              videoHeight = fill.height;
              videoLeft = fill.left;
              videoTop = fill.top;
            } catch (error) {
              console.error("Failed to get video dimensions:", error);
            }

            clips.push({
              type: "Video",
              src: proxiedAssetUrl(videoSrc),
              display: {
                from: fromUs,
                to: toUs,
              },
              playbackRate: 1,
              duration: durationUs,
              left: videoLeft,
              top: videoTop,
              width: videoWidth,
              height: videoHeight,
              angle: 0,
              zIndex: 10,
              opacity: 1,
              flip: null,
              style: {},
              trim: {
                from: 0,
                to: durationUs,
              },
              audio: true,
              volume: 0,
              id: clipId,
              effects: [],
            });
          } else if (imgSrc) {
            const clipId = shot.id || generateClipId();
            segmentMediaClipId = clipId;
            videoClipIds.push(clipId);

            const fromUs = currentSegmentOffsetUs + (shot.display?.from ?? 0) * 1000;
            const toUs =
              currentSegmentOffsetUs +
              (shot.display?.to ?? (shot.display?.from ?? 0) + (shot.duration ?? 0)) * 1000;
            const durationUs = toUs - fromUs;

            let imgWidth = width;
            let imgHeight = height;
            let imgLeft = 0;
            let imgTop = 0;

            try {
              const dimensions = await getImageDimensions(imgSrc);
              const fill = calculateFillDimensions(
                dimensions.width,
                dimensions.height,
                width,
                height,
              );
              imgWidth = fill.width;
              imgHeight = fill.height;
              imgLeft = fill.left;
              imgTop = fill.top;
            } catch (error) {
              console.error("Failed to get image dimensions:", error);
            }

            clips.push({
              type: "Image",
              src: proxiedAssetUrl(imgSrc),
              display: {
                from: fromUs,
                to: toUs,
              },
              playbackRate: 1,
              duration: durationUs,
              left: imgLeft,
              top: imgTop,
              width: imgWidth,
              height: imgHeight,
              angle: 0,
              zIndex: 10,
              opacity: 1,
              flip: null,
              style: {},
              trim: {
                from: 0,
                to: 0,
              },
              id: clipId,
              animations: [
                (() => {
                  const durationMs = durationUs / 1000;
                  let durationBucket: "fast" | "slow" | "medium" = "slow";
                  if (durationMs < 1000) durationBucket = "fast";
                  else if (durationMs > 2000) durationBucket = "medium";

                  let shotAnimationGroup = segmentAnimationGroup[durationBucket] as string[];

                  // Fallback if the specific bucket is empty for the chosen group (e.g., motion -> fast)
                  if (!shotAnimationGroup || shotAnimationGroup.length === 0) {
                    shotAnimationGroup = [
                      ...(COMBO_ANIMATION_GROUPS.scale[durationBucket] || []),
                      ...(COMBO_ANIMATION_GROUPS.motion[durationBucket] || []),
                      ...(COMBO_ANIMATION_GROUPS.rotation[durationBucket] || []),
                    ];
                  }

                  let animationData: string;
                  if (shotAnimationGroup.length > 1 && segmentLastAnimationName !== null) {
                    do {
                      const animationIndex = Math.floor(Math.random() * shotAnimationGroup.length);
                      animationData = shotAnimationGroup[animationIndex];
                    } while (animationData === segmentLastAnimationName);
                  } else {
                    const animationIndex = Math.floor(Math.random() * shotAnimationGroup.length);
                    animationData = shotAnimationGroup[animationIndex];
                  }

                  segmentLastAnimationName = animationData;
                  const animId = `animation_${Math.random().toString(36).substring(2, 9)}`;

                  const animationObj: any = {
                    type: animationData,
                    options: {
                      duration: durationUs,
                      delay: 0,
                      easing: "linear",
                      iterCount: 1,
                      id: animId,
                    },
                    params: {
                      ...getPresetTemplate(animationData),
                      presetParams: {},
                    },
                  };
                  return animationObj;
                })(),
              ],
              effects: [],
            });
          }
        }
      }

      // Process B-rolls
      if (segment.bRolls && Array.isArray(segment.bRolls)) {
        for (const bRoll of segment.bRolls) {
          if (bRoll.imageUrl) {
            const clipId = generateClipId("bRoll");
            bRollClipIds.push(clipId);

            const bRollFromUs = currentSegmentOffsetUs + (bRoll.display?.from ?? 0) * 1000;
            const bRollToUs = currentSegmentOffsetUs + (bRoll.display?.to ?? 0) * 1000;
            const durationUs = bRollToUs - bRollFromUs;

            const absoluteFromUs = bRollFromUs;
            const absoluteToUs = bRollToUs;

            // Determine if bRoll is image or video
            const isImage =
              bRoll.type === "image" ||
              /\.(jpg|jpeg|png|webp|avif)$/i.test(bRoll.imageUrl || bRoll.videoUrl || bRoll.url);

            let bRollWidth = width;
            let bRollHeight = height;
            let bRollLeft = 0;
            let bRollTop = 0;

            try {
              const dimensions = isImage
                ? await getImageDimensions(bRoll.imageUrl || bRoll.videoUrl || bRoll.url)
                : await getVideoDimensions(bRoll.imageUrl || bRoll.videoUrl || bRoll.url);

              if (bRoll.displayMode === "overlay") {
                const scale = bRoll.scale || 0.35;
                const overlayWidth = width * scale;
                const aspectRatio = dimensions.height / dimensions.width;
                const overlayHeight = overlayWidth * aspectRatio;

                const posX = bRoll.position?.x ?? 70;
                const posY = bRoll.position?.y ?? 20;

                bRollWidth = overlayWidth;
                bRollHeight = overlayHeight;
                // Centering the overlay at the provided percentage coordinates
                bRollLeft = (posX / 100) * width - overlayWidth / 2;
                bRollTop = (posY / 100) * height - overlayHeight / 2;
              } else {
                const fill = calculateFillDimensions(
                  dimensions.width,
                  dimensions.height,
                  width,
                  height,
                );
                bRollWidth = fill.width;
                bRollHeight = fill.height;
                bRollLeft = fill.left;
                bRollTop = fill.top;
              }
            } catch (error) {
              console.error("Failed to get bRoll dimensions:", error);
            }

            if (isImage) {
              clips.push({
                type: "Image",
                src: proxiedAssetUrl(bRoll.imageUrl || bRoll.videoUrl || bRoll.url),
                display: {
                  from: absoluteFromUs,
                  to: absoluteToUs,
                },
                playbackRate: 1,
                duration: durationUs,
                left: bRollLeft,
                top: bRollTop,
                width: bRollWidth,
                height: bRollHeight,
                angle: 0,
                zIndex: 15,
                opacity: 1,
                flip: null,
                style: {},
                trim: {
                  from: 0,
                  to: 0,
                },
                id: clipId,
                animations: [],
                effects: [],
              });
            } else {
              clips.push({
                type: "Video",
                src: proxiedAssetUrl(bRoll.videoUrl || bRoll.imageUrl || bRoll.url),
                display: {
                  from: absoluteFromUs,
                  to: absoluteToUs,
                },
                playbackRate: 1,
                duration: durationUs,
                left: bRollLeft,
                top: bRollTop,
                width: bRollWidth,
                height: bRollHeight,
                angle: 0,
                zIndex: 15, // Between main footage (10) and captions (20)
                opacity: 1,
                flip: null,
                style: {},
                trim: {
                  from: 0,
                  to: durationUs,
                },
                audio: false,
                volume: 0,
                id: clipId,
                effects: [],
              });
            }
          }
        }
      }

      // Add audio from textToSpeech
      if (segment.textToSpeech && segment.textToSpeech.src) {
        const clipId = generateClipId();
        audioClipIds.push(clipId);

        // Use display times from the textToSpeech data
        const fromUs = currentSegmentOffsetUs + (segment.textToSpeech.display?.from ?? 0) * 1000;
        const toUs =
          currentSegmentOffsetUs +
          (segment.textToSpeech.display?.to ??
            (segment.textToSpeech.display?.from ?? 0) + (segment.textToSpeech.duration ?? 0)) *
            1000;
        const durationUs = toUs - fromUs;

        clips.push({
          type: "Audio",
          src: proxiedAssetUrl(segment.textToSpeech.src),
          display: {
            from: fromUs,
            to: toUs,
          },
          playbackRate: 1,
          duration: durationUs,
          left: 0,
          top: 0,
          width: 0,
          height: 0,
          angle: 0,
          zIndex: 30,
          opacity: 1,
          flip: null,
          style: {},
          trim: {
            from: 0,
            to: durationUs,
          },
          loop: false,
          id: clipId,
          volume: 1,
        });
      }

      // Add captions from speechToText
      if (segment.speechToText && segment.speechToText.src) {
        try {
          const captionData = await fetchCaptionData(segment.speechToText.src);

          if (
            captionData &&
            captionData.results &&
            captionData.results.main &&
            captionData.results.main.words
          ) {
            const shotWords = segment.shots?.[0]?.words;
            const scriptText =
              segment.text || (typeof shotWords === "string" ? shotWords : "") || "";
            let words = captionData.results.main.words;
            if (scriptText.trim()) {
              words = alignTranscriptionWordsToScript(words, scriptText);
            }
            const maxLines = styleCaptions?.textBoxStyle?.maxLines ?? 1;
            const verticalPadding = styleCaptions?.textBoxStyle?.verticalPadding ?? 0;
            const typeCaption = styleCaptions.type || "multiple";
            const textCase = styleCaptions.textTransform ?? "normal";
            let captionChunks: any[] = [];
            await fontManager.loadFonts([
              {
                name: styleCaptions.fontFamily ?? FONT_DEFAULT,
                url: styleCaptions.fontUrl ?? FONT_URL_DEFAULT,
              },
            ]);

            // Group words by width using the configured font size
            const maxCaptionWidth = 1080 * 0.8;
            const shots = extractFields(segment.shots);
            const canvas =
              typeof document !== "undefined" ? document.createElement("canvas") : null;
            const ctx = canvas?.getContext("2d");
            if (ctx) {
              ctx.font = `${fontSize}px ${styleCaptions.fontFamily}`;
            }
            const measureText = (text: string) => {
              if (!ctx) return { width: 0, height: fontSize };
              const metrics = ctx.measureText(text);
              const height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
              return {
                width: metrics.width,
                height: height || fontSize,
              };
            };

            if (typeCaption === "word") {
              captionChunks = words.map((word: any) => {
                const text = word.word || word.text || "";
                const textTransform = textCase === "uppercase" ? text.toUpperCase() : text;
                const dims = measureText(textTransform);
                const testWidth = dims.width + 60;
                return {
                  text,
                  from: word.start ?? word.from,
                  to: word.end ?? word.to,
                  width: testWidth,
                  height: dims.height,
                  mediaClipId: word.mediaClipId,
                  words: [
                    {
                      text,
                      from: 0,
                      to: (word.end - word.start) * 1000,
                      isKeyWord: word.isKeyWord,
                      paragraphIndex: word.paragraphIndex ?? 0,
                    },
                  ],
                };
              });
            } else {
              captionChunks = groupWordsByWidth(
                words,
                maxCaptionWidth,
                fontSize,
                styleCaptions.fontFamily ?? FONT_DEFAULT,
                maxLines,
                shots,
              );
            }

            const maxCaptionHeight = captionChunks.reduce((max, chunk) => {
              const jumpLines = (chunk.text.match(/\r?\n/g) || []).length;

              const captionHeight =
                Math.ceil(chunk.height) +
                (jumpLines + 1) * verticalPadding * 2 +
                14 * (jumpLines + 1);

              return Math.max(max, captionHeight);
            }, 0);

            // Create Caption clips for each chunk
            for (const chunk of captionChunks) {
              const clipId = generateClipId();
              captionClipIds.push(clipId);

              // Convert seconds to milliseconds, then to microseconds
              const chunkFromMs = chunk.from * 1000; // seconds to ms
              const chunkToMs = chunk.to * 1000; // seconds to ms
              const chunkDurationMs = chunkToMs - chunkFromMs;

              // Use speechToText display from as the base for absolute timeline position
              const speechFromUs =
                currentSegmentOffsetUs + (segment.speechToText.display?.from ?? 0) * 1000;
              const fromUs = speechFromUs + chunkFromMs * 1000; // μs
              const toUs = speechFromUs + chunkToMs * 1000; // μs
              const durationUs = chunkDurationMs * 1000; // μs

              // Use actual measured dimensions from chunk
              const captionWidth = Math.ceil(chunk.width);
              const captionHeight = Math.ceil(chunk.height) + 30;

              // Calculate top position based on verticalAlign
              let topPosition: number;
              if (verticalAlign === "top") {
                topPosition = 80;
              } else if (verticalAlign === "center") {
                topPosition = (height - captionHeight) / 2;
              } else {
                // bottom
                const jumpLines = (chunk.text.match(/\r?\n/g) || []).length;
                const captionHeight =
                  Math.ceil(chunk.height) +
                  (jumpLines + 1) * verticalPadding * 2 +
                  14 * (jumpLines + 1);
                const captionBottomPadding = 450 - (maxCaptionHeight - captionHeight) / 2;
                topPosition = height - captionBottomPadding;
              }

              clips.push({
                type: "Caption",
                src: "",
                display: {
                  from: fromUs,
                  to: toUs,
                },
                playbackRate: 1,
                duration: durationUs,
                left: (width - captionWidth) / 2,
                top: topPosition,
                width: captionWidth,
                height: captionHeight,
                angle: 0,
                zIndex: 20,
                opacity: 1,
                flip: null,
                style: {
                  fontSize: styleCaptions.fontSize ?? fontSize,
                  fontFamily: styleCaptions.fontFamily ?? FONT_DEFAULT,
                  fontWeight: "700",
                  fontStyle: "normal",
                  color: styleCaptions.color ?? "#ffffff",
                  align: "center",
                  textCase: styleCaptions.textTransform ?? "normal",
                  fontUrl: styleCaptions.fontUrl ?? FONT_URL_DEFAULT,
                  stroke: {
                    color: styleCaptions.borderColor ?? "#000000",
                    width: styleCaptions.borderWidth ?? 4,
                  },
                  shadow: {
                    color: styleCaptions.boxShadow?.color ?? "#000000",
                    alpha: 0.5,
                    blur: styleCaptions.boxShadow?.blur ?? 4,
                    distance: 0,
                    angle: 0,
                  },
                },
                trim: {
                  from: 0,
                  to: 0,
                },
                text: chunk.text,
                caption: {
                  words: chunk.words,
                  colors: {
                    appeared: styleCaptions.appearedColor ?? "#ffffff",
                    active: styleCaptions.activeColor ?? "#ffffff",
                    activeFill: styleCaptions.activeFillColor ?? "#FF5700",
                    background: styleCaptions.backgroundColor ?? "#FF5700",
                    keyword: styleCaptions.isKeywordColor ?? "#ffffff",
                  },
                  preserveKeywordColor: styleCaptions.preservedColorKeyWord ?? true,
                  positioning: {
                    videoWidth: width,
                    videoHeight: height,
                  },
                  ...(styleCaptions.textBoxStyle
                    ? { textBoxStyle: styleCaptions.textBoxStyle }
                    : {}),
                },
                ...(styleCaptions.textBoxStyle ? { textBoxStyle: styleCaptions.textBoxStyle } : {}),
                id: clipId,
                effects: [],
                mediaId: segmentMediaClipId,
                wordsPerLine: "multiple",
              });
            }
          }
        } catch (error) {
          console.error("Error processing caption data:", error);
        }
      }

      // Process sound effects
      if (segment.soundEffects && Array.isArray(segment.soundEffects)) {
        // Sort chronologically for greedy tracking optimal assignment
        const sortedSfx = [...segment.soundEffects].sort((a, b) => (a.start ?? 0) - (b.start ?? 0));

        for (const sfx of sortedSfx) {
          if (sfx.url) {
            const clipId = generateClipId("sfx");

            const fromUs = currentSegmentOffsetUs + (sfx.start ?? 0) * 1000;
            // duration is now in ms, so multiply by 1000 for us
            const durationUs = (sfx.duration ?? 1000) * 1000;
            const toUs = fromUs + durationUs;

            // Assign clipping safely without overlapping logic
            let assigned = false;
            for (let i = 0; i < sfxTracks.length; i++) {
              if (fromUs >= sfxTracks[i].endTimeUs) {
                sfxTracks[i].clipIds.push(clipId);
                sfxTracks[i].endTimeUs = toUs;
                assigned = true;
                break;
              }
            }

            if (!assigned) {
              sfxTracks.push({
                id: generateTrackId("sfx"),
                name: `SFX Track ${sfxTracks.length + 1}`,
                clipIds: [clipId],
                endTimeUs: toUs,
              });
            }

            clips.push({
              type: "Audio",
              src: proxiedAssetUrl(sfx.url),
              display: {
                from: fromUs,
                to: toUs,
              },
              playbackRate: 1,
              duration: durationUs,
              left: 0,
              top: 0,
              width: 0,
              height: 0,
              angle: 0,
              zIndex: 35,
              opacity: 1,
              flip: null,
              style: {},
              trim: {
                from: 0,
                to: durationUs,
              },
              loop: false,
              id: clipId,
              volume: sfx.volume ?? 0.5,
              name: "SFX",
            });
          }
        }
      }

      // Update segment offset for the next iteration
      // Use the maximum of reported segment duration or total shots duration to avoid gaps
      let segmentDurationMs = segment.duration || 0;
      if (segment.shots && Array.isArray(segment.shots) && segment.shots.length > 0) {
        const lastShot = segment.shots[segment.shots.length - 1];
        const lastShotEnd =
          lastShot.display?.to ?? (lastShot.display?.from ?? 0) + (lastShot.duration ?? 0);
        segmentDurationMs = Math.max(segmentDurationMs, lastShotEnd);
      }

      currentSegmentOffsetUs += Math.round(segmentDurationMs * 1000);
    }
  }

  // Add background music if present
  if (schemaJson.music && schemaJson.music.url) {
    const clipId = generateClipId("music");
    musicClipIds.push(clipId);

    clips.push({
      type: "Audio",
      src: proxiedAssetUrl(schemaJson.music.url),
      display: {
        from: 0,
        to: currentSegmentOffsetUs,
      },
      playbackRate: 1,
      duration: currentSegmentOffsetUs,
      left: 0,
      top: 0,
      width: 0,
      height: 0,
      angle: 0,
      zIndex: 5, // Lower z-index for background music
      opacity: 1,
      flip: null,
      style: {},
      trim: {
        from: 0,
        to: currentSegmentOffsetUs,
      },
      loop: true,
      id: clipId,
      volume: 0.5, // Default volume for background music
    });
  }

  // Create tracks in the specific requested order:
  // 1. Captions (Top)
  if (captionClipIds.length > 0) {
    tracks.push({
      id: captionTrackId,
      name: "Caption Track",
      type: "Caption",
      clipIds: captionClipIds,
    });
  }

  // 2. B-Rolls
  if (bRollClipIds.length > 0) {
    tracks.push({
      id: bRollTrackId,
      type: "bRoll",
      name: "B-Roll",
      zIndex: 15,
      clipIds: bRollClipIds,
      opacity: 1,
      muted: false,
    });
  }

  // 3. A-rolls (Main Footage)
  if (videoClipIds.length > 0) {
    tracks.push({
      id: videoTrackId,
      name: "Main Footage",
      type: "Video",
      clipIds: videoClipIds,
    });
  }

  // Audio Track (Voice/STT)
  if (audioClipIds.length > 0) {
    tracks.push({
      id: audioTrackId,
      name: "Audio Track",
      type: "Audio",
      clipIds: audioClipIds,
    });
  }

  // Audio Tracks (SFX)
  for (const track of sfxTracks) {
    tracks.push({
      id: track.id,
      name: track.name,
      type: "Audio",
      clipIds: track.clipIds ?? [],
    });
  }

  // 4. Music / Background Music (Bottom)
  if (musicClipIds.length > 0) {
    tracks.push({
      id: musicTrackId,
      name: "Music Track",
      type: "Audio",
      clipIds: musicClipIds,
    });
  }

  return normalizeDesignTracks({
    tracks,
    clips,
    settings: {
      width,
      height,
      fps: 30,
      bgColor: "#1c1917",
    },
  });
};
