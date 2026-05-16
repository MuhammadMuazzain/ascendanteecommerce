import { fontManager, getPresetTemplate } from "@openvideo/engine-pixi";
import { Design } from "@/types/editor";
import { FONT_DEFAULT, FONT_SIZE_DEFAULT, FONT_URL_DEFAULT } from "@/constants/captions";
import { ICaptionsControlProps } from "@/components/editor/interface/captions";
import {
  CAPTION_PRESET_TIKTOK_MEDIUM_ID,
  resolveCaptionPresetById,
} from "@/lib/caption-presets";
import * as PIXI from "pixi.js";
import { COMBO_ANIMATION_GROUPS } from "@/constants/custom-animations";
import { groupWordsByWidth } from "./schema-converter";
import { alignTranscriptionWordsToScript } from "@/lib/transcribe/align-to-script";
import { proxiedAssetUrl } from "@/lib/asset-proxy";
import { normalizeDesignTracks } from "@/lib/design-tracks";

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
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = (err) => {
      console.error("Error loading image for dimensions:", url, err);
      reject(err);
    };
    img.crossOrigin = "anonymous";
    img.src = proxiedAssetUrl(url);
  });
};

/**
 * Gets video dimensions and duration from a URL
 */
export const getVideoMetadata = (
  url: string,
): Promise<{ width: number; height: number; duration: number }> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.onloadedmetadata = () => {
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
        duration: video.duration * 1000, // Convert to ms
      });
    };
    video.onerror = (err) => {
      console.error("Error loading video for metadata:", url, err);
      reject(err);
    };
    video.crossOrigin = "anonymous";
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
// export const groupWordsByWidth = (
//   words: any[],
//   maxWidth: number = 800,
//   fontSize: number = FONT_SIZE_DEFAULT,
//   fontFamily: string = FONT_DEFAULT,
// ): any[] => {
//   if (!words || words.length === 0) return [];

//   // Create canvas for text measurement
//   const canvas = document.createElement("canvas");
//   const ctx = canvas.getContext("2d");
//   if (!ctx) return [];

//   ctx.font = `${fontSize}px ${fontFamily}`;

//   const captions: any[] = [];
//   let currentWords: any[] = [];
//   let currentText = "";
//   let currentWidth = 0;

//   for (let i = 0; i < words.length; i++) {
//     const word = words[i];
//     const wordText = word.word || word.text || "";

//     // Calculate width if we add this word
//     const testText = currentText ? `${currentText} ${wordText}` : wordText;
//     const bitmapText = new PIXI.BitmapText(testText, {
//       fontFamily,
//       fontSize,
//     });
//     const testWidth = bitmapText.width + 160;

//     if (testWidth > maxWidth && currentWords.length > 0) {
//       // Width exceeded, create caption with current words
//       const firstWord = currentWords[0];
//       const lastWord = currentWords[currentWords.length - 1];

//       // Measure actual height of the text
//       const metrics = ctx.measureText("AaFfLMZpPqQ");
//       const textHeight =
//         metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;

//       captions.push({
//         text: currentText,
//         width: currentWidth, // Actual measured width
//         height: textHeight || fontSize, // Actual measured height, fallback to fontSize
//         words: currentWords.map((w, idx) => ({
//           text: w.word || w.text || "",
//           from: idx === 0 ? 0 : (w.start - firstWord.start) * 1000, // Relative to caption start in ms
//           to: (w.end - firstWord.start) * 1000, // Relative to caption start in ms
//           isKeyWord: idx === 0 || idx === currentWords.length - 1, // First and last words are keywords
//           paragraphIndex: "",
//         })),
//         from: firstWord.start, // In seconds
//         to: lastWord.end, // In seconds
//       });

//       // Start new caption with current word
//       currentWords = [word];
//       currentText = wordText;
//       currentWidth = ctx.measureText(wordText).width * 1.2;
//     } else {
//       // Add word to current caption
//       currentWords.push(word);
//       currentText = testText;
//       currentWidth = testWidth;
//     }
//   }

//   // Add remaining words as final caption
//   if (currentWords.length > 0) {
//     const firstWord = currentWords[0];
//     const lastWord = currentWords[currentWords.length - 1];

//     // Measure actual height of the text
//     const metrics = ctx.measureText("AaFfLMZpPqQ");
//     const textHeight =
//       metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;

//     captions.push({
//       text: currentText,
//       width: currentWidth, // Actual measured width
//       height: textHeight || fontSize, // Actual measured height, fallback to fontSize
//       words: currentWords.map((w, idx) => ({
//         text: w.word || w.text || "",
//         from: idx === 0 ? 0 : (w.start - firstWord.start) * 1000,
//         to: (w.end - firstWord.start) * 1000,
//         isKeyWord: idx === 0 || idx === currentWords.length - 1,
//         paragraphIndex: "",
//       })),
//       from: firstWord.start,
//       to: lastWord.end,
//     });
//   }

//   // console.log("captions", captions);

//   return captions;
// };

/**
 * Converts schema.json format to exported.json format compatible with Studio
 */
export const convertUgcSchemaToDesign = async (
  schemaJson: any,
  schemaType?: string,
): Promise<Design> => {
  const type = schemaType || schemaJson.type;

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

  let totalVideoDurationUs = 0;
  let lastOutPreset = "";
  let timelineCursorUs = 0;

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
    resolveCaptionPresetById(CAPTION_PRESET_TIKTOK_MEDIUM_ID);

  const styleCaptions: ICaptionsControlProps = {
    ...(captionPreset ?? {}),
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
      const segmentStartUs = timelineCursorUs;

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

      // Extract precise duration from transcription if available
      let lastWordEndMs = 0;
      if (segment.speechToText && segment.speechToText.src) {
        try {
          const captionData = await fetchCaptionData(segment.speechToText.src);
          if (captionData?.results?.main?.words?.length > 0) {
            const words = captionData.results.main.words;
            lastWordEndMs = words[words.length - 1].end * 1000;
          }
        } catch (e) {
          console.error("Error fetching caption data for trimming:", e);
        }
      }

      // Process shots (video/image)
      if (segment.shots && Array.isArray(segment.shots)) {
        for (const shot of segment.shots) {
          const videoSrc = shot.videoUrl;
          const imgSrc = shot.imageUrl;

          if (videoSrc) {
            const clipId = generateClipId();
            segmentMediaClipId = clipId;
            videoClipIds.push(clipId);

            let videoWidth = width;
            let videoHeight = height;
            let videoLeft = 0;
            let videoTop = 0;
            let metadataDurationMs = 0;

            try {
              let srcToLoad = videoSrc;
              const metadata = await getVideoMetadata(srcToLoad);
              videoWidth = metadata.width;
              videoHeight = metadata.height;
              metadataDurationMs = metadata.duration;

              const fill = calculateFillDimensions(metadata.width, metadata.height, width, height);
              videoWidth = fill.width;
              videoHeight = fill.height;
              videoLeft = fill.left;
              videoTop = fill.top;
            } catch (error) {
              console.error("Failed to get video metadata:", error);
            }

            // Use calculated lastWordEndMs if available, otherwise fallback to shot.duration or metadata duration
            let durationMs = metadataDurationMs;
            const durationUs = durationMs * 1000;

            const fromUs = timelineCursorUs;
            const toUs = fromUs + durationUs;
            timelineCursorUs = toUs;

            // Track total duration
            if (toUs > totalVideoDurationUs) {
              totalVideoDurationUs = toUs;
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
              volume: 1,
              id: clipId,
              effects: [],
            });
          } else if (imgSrc) {
            const clipId = generateClipId();
            segmentMediaClipId = clipId;
            videoClipIds.push(clipId);

            // Use shot.duration (in ms) if available, fallback to 4s for images
            const durationMs = shot.duration || 4000;
            const durationUs = durationMs * 1000;

            const fromUs = timelineCursorUs;
            const toUs = fromUs + durationUs;
            timelineCursorUs = toUs;

            if (toUs > totalVideoDurationUs) {
              totalVideoDurationUs = toUs;
            }

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

            const bRollFromUs = (bRoll.display?.from ?? 0) * 1000;
            const bRollToUs = (bRoll.display?.to ?? 0) * 1000;
            const durationUs = bRollToUs - bRollFromUs;

            const absoluteFromUs = segmentStartUs + bRollFromUs;
            const absoluteToUs = segmentStartUs + bRollToUs;

            if (absoluteToUs > totalVideoDurationUs) {
              totalVideoDurationUs = absoluteToUs;
            }

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
                : await getVideoMetadata(bRoll.imageUrl || bRoll.videoUrl || bRoll.url);

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

        // Use display times from the first clip in the segment
        const fromUs = segmentStartUs;
        // Use calculated lastWordEndMs if available, otherwise fallback
        const durationMs = lastWordEndMs || segment.textToSpeech.duration || segment.duration || 0;
        const durationUs = durationMs * 1000;
        const toUs = fromUs + durationUs;

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
            to: 0,
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
            if (typeof scriptText === "string" && scriptText.trim()) {
              words = alignTranscriptionWordsToScript(words, scriptText);
            }
            const maxLines = styleCaptions?.textBoxStyle?.maxLines ?? 1;
            const verticalPadding = styleCaptions?.textBoxStyle?.verticalPadding ?? 0;
            await fontManager.loadFonts([
              {
                name: styleCaptions.fontFamily ?? FONT_DEFAULT,
                url: styleCaptions.fontUrl ?? FONT_URL_DEFAULT,
              },
            ]);

            // Group words by width using the configured font size
            const captionChunks = groupWordsByWidth(
              words,
              800,
              fontSize,
              styleCaptions.fontFamily ?? FONT_DEFAULT,
              maxLines,
            );

            const maxCaptionHeight = captionChunks.reduce((max, chunk) => {
              const jumpLines = (chunk.text.match(/\r?\n/g) || []).length;

              const captionHeight =
                Math.ceil(chunk.height) +
                (jumpLines + 1) * verticalPadding * 2 +
                14 * (jumpLines + 1);

              return Math.max(max, captionHeight);
            }, 0);

            // Get the segment start time in ms
            const segmentStartMs = segmentStartUs / 1000;

            // Create Caption clips for each chunk
            for (const chunk of captionChunks) {
              const clipId = generateClipId();
              captionClipIds.push(clipId);

              // Convert seconds to milliseconds, then to microseconds
              const chunkFromMs = chunk.from * 1000; // seconds to ms
              const chunkToMs = chunk.to * 1000; // seconds to ms
              const chunkDurationMs = chunkToMs - chunkFromMs;

              // Add segment start time to get absolute timeline position
              const fromUs = (segmentStartMs + chunkFromMs) * 1000; // ms to μs
              const toUs = (segmentStartMs + chunkToMs) * 1000; // ms to μs
              const durationUs = chunkDurationMs * 1000; // ms to μs

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
              });
            }
          }
        } catch (error) {
          console.error("Error processing caption data:", error);
        }
      }
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
        to: totalVideoDurationUs,
      },
      playbackRate: 1,
      duration: totalVideoDurationUs,
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
        to: totalVideoDurationUs,
      },
      loop: true,
      id: clipId,
      volume: 0.35,
    });
  }

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

  if (videoClipIds.length > 0) {
    tracks.push({
      id: videoTrackId,
      name: "Video Track",
      type: "Video",
      clipIds: videoClipIds,
    });
  }
  // Create tracks
  if (audioClipIds.length > 0) {
    tracks.push({
      id: audioTrackId,
      name: "Audio Track",
      type: "Audio",
      clipIds: audioClipIds,
    });
  }

  // Music / background bed last (matches narrative / fake UGC schema-converter)
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
