import { v4 as uuidv4 } from "uuid";

interface Cut {
  from: number; // in milliseconds
  to: number; // in milliseconds
}

interface SceneData {
  tracks: any[];
  clips: any[];
  settings: any;
}

/**
 * Generates editor scene JSON by applying a list of cuts to a video.
 * Converts everything to microseconds as required by the editor.
 */
export function generateSceneFromCuts(
  videoUrl: string,
  videoDurationMs: number, // Total duration of the video in milliseconds
  cuts: Cut[],
  videoName: string = "video.mp4",
): SceneData {
  // 1. Sort cuts by start time
  console.log("Cuts:", cuts);
  const sortedCuts = [...cuts].sort((a, b) => a.from - b.from);

  // 2. Identify keeping segments (the inverse of cuts)
  const segments: { from: number; to: number }[] = [];
  let currentStart = 0;

  for (const cut of sortedCuts) {
    if (cut.from > currentStart) {
      segments.push({ from: currentStart, to: cut.from });
    }
    currentStart = Math.max(currentStart, cut.to);
  }

  // Add the final segment if there is remaining video after the last cut
  if (currentStart < videoDurationMs) {
    segments.push({ from: currentStart, to: videoDurationMs });
  }

  // 3. Build clips array by converting to microseconds
  const MS_TO_US = 1000;
  let timelineCurrentUs = 0;

  const trackId = `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const clipIds: string[] = [];
  let clips: any[] = [];

  for (const seg of segments) {
    const durationMs = seg.to - seg.from;
    const durationUs = durationMs * MS_TO_US;

    const clipId = `clip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    clipIds.push(clipId);

    clips.push({
      type: "Video",
      id: clipId,
      name: videoName,
      src: videoUrl,
      display: {
        from: timelineCurrentUs,
        to: timelineCurrentUs + durationUs,
      },
      playbackRate: 1,
      duration: durationUs,
      left: 0,
      top: 0,
      width: 1080,
      height: 1920,
      angle: 0,
      zIndex: 10,
      opacity: 1,
      flip: null,
      style: {},
      trim: {
        from: seg.from * MS_TO_US,
        to: seg.to * MS_TO_US,
      },
      chromaKey: {
        enabled: false,
        color: "#00FF00",
        similarity: 0.1,
        spill: 0,
      },
      locked: false,
      audio: true,
      volume: 1,
      effects: [],
    });

    timelineCurrentUs += durationUs;
  }

  // 4. Construct complete scene JSON
  return {
    tracks: [
      {
        id: trackId,
        name: "Track 1",
        type: "Video",
        clipIds: clipIds,
      },
    ],
    clips: clips,
    settings: {
      width: 1080,
      height: 1920,
      fps: 30,
      bgColor: "#1C160D",
    },
  };
}
