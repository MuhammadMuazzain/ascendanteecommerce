import { Segment, MediaMetadata } from "@/inngest/utils/types";
import { VisualShot } from "@/types/segment";
import { convertMsToSeconds, convertSecondsToMs } from "@/inngest/utils/common";
import { StepContext } from "./types";
import { SegmentUpdater } from "@/inngest/services/updater";

export interface ClipTiming {
  display: { from: number; to: number };
  duration: number;
}

export interface BRollTiming {
  display: { from: number; to: number };
  duration: number;
  time: number;
  originalBRollIndex: number; // Important for mapping back to the brolls array
}

export interface SegmentTiming {
  id: string;
  clips: ClipTiming[];
  bRolls: BRollTiming[];
}

export interface InitialTimingResult {
  clipTimings: ClipTiming[];
  bRollTimings: BRollTiming[];
}

export const getShotDurations = async (
  captionUrl: string,
  shots: VisualShot[],
  totalDuration: number,
  startPause: number,
): Promise<number[]> => {
  const defaultDurations = new Array(shots.length).fill(totalDuration / shots.length);

  try {
    const response = await fetch(captionUrl);
    if (!response.ok) throw new Error("Failed to fetch captions");
    const captionData = await response.json();

    const words = captionData?.results?.main?.words;
    if (!words || !Array.isArray(words) || words.length === 0) {
      return defaultDurations;
    }

    const shotStarts: number[] = [];
    let currentWordIndex = 0;

    for (let i = 0; i < shots.length; i++) {
      const triggerWords = (shots[i].words || "")
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .split(/\s+/)
        .filter(Boolean);

      if (triggerWords.length === 0) {
        shotStarts.push(i === 0 ? 0 : shotStarts[i - 1] + totalDuration / shots.length);
        continue;
      }

      let foundIndex = -1;
      for (let j = currentWordIndex; j < words.length; j++) {
        const wordText = words[j].word.toLowerCase().replace(/[^\w\s]/g, "");
        if (wordText === triggerWords[0]) {
          foundIndex = j;
          break;
        }
      }

      if (foundIndex !== -1) {
        shotStarts.push(words[foundIndex].start + startPause);
        currentWordIndex = foundIndex + 1;
      } else {
        shotStarts.push(i === 0 ? 0 : shotStarts[i - 1] + totalDuration / shots.length);
      }
    }

    const durations: number[] = [];
    for (let i = 0; i < shotStarts.length; i++) {
      const nextStart = i < shotStarts.length - 1 ? shotStarts[i + 1] : totalDuration;
      durations.push(Math.max(0.1, nextStart - shotStarts[i]));
    }

    return durations;
  } catch (err) {
    console.warn("Failed to calculate shot durations from captions:", err);
    return defaultDurations;
  }
};

export const getBRollDisplayTime = async (
  triggerWordsList: string,
  captionUrl: string,
  startPauseMs: number,
): Promise<
  { display: { from: number; to: number }; time: { start: number; end: number } } | undefined
> => {
  try {
    const response = await fetch(captionUrl);
    if (!response.ok) throw new Error("Failed to fetch captions");
    const captionData = await response.json();
    const captionWords: any[] = captionData.results?.main?.words || [];

    if (captionWords.length === 0) return undefined;

    const triggerWords = triggerWordsList
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter(Boolean);

    if (triggerWords.length === 0) return undefined;

    // Fallback: If normalized trigger words match the full normalized transcript (or vice versa), use full duration
    const fullNormalizedTranscript = captionWords
      .map((w) => w.word.toLowerCase().replace(/[^\w\s]/g, ""))
      .join(" ");
    const normalizedTarget = triggerWords.join(" ");

    if (fullNormalizedTranscript === normalizedTarget) {
      const start = convertSecondsToMs(captionWords[0].start);
      const end = convertSecondsToMs(captionWords[captionWords.length - 1].end);
      console.log(`🎯 Full-transcript B-roll match detected. Using range: ${start} - ${end}`);
      return {
        display: { from: start + startPauseMs, to: end + startPauseMs },
        time: { start, end },
      };
    }

    let bestMatch:
      | { startIdx: number; endIdx: number; matchCount: number; span: number }
      | undefined = undefined;

    for (let i = 0; i < captionWords.length; i++) {
      const wordText = captionWords[i].word.toLowerCase().replace(/[^\w\s]/g, "");

      if (wordText === triggerWords[0]) {
        let currentTriggerIndex = 1;
        let lastFoundIndex = i;

        for (
          let j = i + 1;
          j < captionWords.length && currentTriggerIndex < triggerWords.length;
          j++
        ) {
          const nextWordText = captionWords[j].word.toLowerCase().replace(/[^\w\s]/g, "");
          if (nextWordText === triggerWords[currentTriggerIndex]) {
            lastFoundIndex = j;
            currentTriggerIndex++;
          }
        }

        const matchCount = currentTriggerIndex;
        const span = lastFoundIndex - i;

        if (
          !bestMatch ||
          matchCount > bestMatch.matchCount ||
          (matchCount === bestMatch.matchCount && span < bestMatch.span)
        ) {
          bestMatch = { startIdx: i, endIdx: lastFoundIndex, matchCount, span };
        }
      }
    }

    if (bestMatch && bestMatch.matchCount > 0) {
      const start = convertSecondsToMs(captionWords[bestMatch.startIdx].start);
      const from = start + startPauseMs;
      const end = convertSecondsToMs(captionWords[bestMatch.endIdx].end);
      const to = end + startPauseMs;
      return { display: { from, to }, time: { start, end } };
    }

    return undefined;
  } catch (err) {
    console.warn("Failed to calculate b-Roll display time from captions:", err);
    return undefined;
  }
};

// EXTRACTOR: Manual Logic
export async function extractTimingsManual(
  seg: Segment,
  data: MediaMetadata,
  segmentDurationMs: number,
): Promise<InitialTimingResult> {
  const { captionUrl, startPause, endPause } = data;
  const netDurationSec = convertMsToSeconds(segmentDurationMs - startPause - endPause);

  // 1. Shots
  const shotDurationsSec = await getShotDurations(captionUrl, seg.shots || [], netDurationSec, 0);
  const clipTimings: ClipTiming[] = [];
  let currentPos = 0;

  for (let idx = 0; idx < (seg.shots?.length || 0); idx++) {
    let clipDurationMs = convertSecondsToMs(shotDurationsSec[idx]);
    if (idx === 0) clipDurationMs += startPause;
    if (idx === (seg.shots?.length || 0) - 1) clipDurationMs += endPause;
    clipDurationMs = Math.round(clipDurationMs);

    const from = currentPos;
    let to = currentPos + clipDurationMs;
    if (idx === (seg.shots?.length || 0) - 1) {
      to = segmentDurationMs;
      clipDurationMs = to - from;
    }
    clipTimings.push({ display: { from, to }, duration: clipDurationMs });
    currentPos += clipDurationMs;
  }

  // 2. B-Rolls
  const bRollTimings: BRollTiming[] = [];
  if (seg.bRolls) {
    for (let i = 0; i < seg.bRolls.length; i++) {
      const bRoll = seg.bRolls[i];
      if (!bRoll.words) continue;
      const dataTime = await getBRollDisplayTime(bRoll.words, captionUrl, startPause);
      if (!dataTime) continue;

      let { from, to } = dataTime.display;
      if (to > segmentDurationMs) {
        const diff = to - segmentDurationMs;
        to = segmentDurationMs;
        from = Math.max(0, from - diff);
      }
      bRollTimings.push({
        display: { from, to },
        duration: to - from,
        time: from,
        originalBRollIndex: i,
      });
    }
  }

  return { clipTimings, bRollTimings };
}

// EXTRACTOR: AI Logic (Gemini)
export function extractTimingsAI(
  seg: Segment,
  data: MediaMetadata,
  segmentDurationMs: number,
  geminiResult: any,
): InitialTimingResult {
  const clipTimings: ClipTiming[] = [];
  const bRollTimings: BRollTiming[] = [];
  const numShots = seg.shots?.length || 0;

  // 1. Shots
  let currentPos = 0;
  for (let idx = 0; idx < numShots; idx++) {
    const geminiShot = geminiResult.shots[idx];
    let from = currentPos;
    let to = convertSecondsToMs(geminiShot.end) + data.startPause;

    if (idx === 0) from = 0;
    if (idx === numShots - 1) to = segmentDurationMs;

    const durationMs = Math.round(to - from);
    clipTimings.push({ display: { from, to }, duration: durationMs });
    currentPos = to;
  }

  // 2. B-Rolls
  if (seg.bRolls) {
    for (let i = 0; i < seg.bRolls.length; i++) {
      const geminiBRoll = geminiResult.bRolls.find((br: any) => br.originalIndex === i);
      if (geminiBRoll) {
        let from = convertSecondsToMs(geminiBRoll.start) + data.startPause;
        let to = convertSecondsToMs(geminiBRoll.end) + data.startPause;
        if (to > segmentDurationMs) {
          const diff = to - segmentDurationMs;
          to = segmentDurationMs;
          from = Math.max(0, from - diff);
        }

        bRollTimings.push({
          display: { from, to },
          duration: to - from,
          time: from,
          originalBRollIndex: i,
        });
      }
    }
  }

  return { clipTimings, bRollTimings };
}

const isFullyCovered = (f: number, t: number, brs: BRollTiming[]) =>
  brs.some((br) => br.display.from <= f + 1 && br.display.to >= t - 1);

const getClipMoveCost = (
  boundaryIdx: number,
  targetTime: number,
  boundaries: number[],
  brs: BRollTiming[],
  isStart: boolean,
  options: { globalOffset: number; segmentEnd: number },
) => {
  if (boundaryIdx === 0 || boundaryIdx === boundaries.length + 1) return Infinity;
  const testBoundaries = [options.globalOffset, ...boundaries, options.segmentEnd];
  const diff = targetTime - testBoundaries[boundaryIdx];
  testBoundaries[boundaryIdx] = targetTime;
  const prevF = testBoundaries[boundaryIdx - 1],
    prevT = testBoundaries[boundaryIdx];
  const nextF = testBoundaries[boundaryIdx],
    nextT = testBoundaries[boundaryIdx + 1];
  const threshold = isStart ? 500 : 1000; // START_SNAP_THRESHOLD : END_SNAP_THRESHOLD

  if (!isFullyCovered(prevF, prevT, brs) && prevT - prevF < threshold) return Infinity;
  if (!isFullyCovered(nextF, nextT, brs) && nextT - nextF < threshold) return Infinity;

  return Math.abs(diff);
};

function ruleSnapBoundaries(
  bRollTimings: BRollTiming[],
  currentBoundaries: number[],
  options: { globalOffset: number; segmentEnd: number },
) {
  const snapPoints = [options.globalOffset, ...currentBoundaries, options.segmentEnd];
  const START_SNAP_THRESHOLD = 500;
  const END_SNAP_THRESHOLD = 1000;

  for (const br of bRollTimings) {
    for (let j = 0; j < snapPoints.length; j++) {
      const boundary = snapPoints[j];

      // Rule: Outward Expansion Only
      // Start Snap
      const startGap = br.display.from - boundary;
      if (startGap > 0 && startGap < START_SNAP_THRESHOLD) {
        const costA = startGap;
        const costB = getClipMoveCost(
          j,
          br.display.from,
          currentBoundaries,
          bRollTimings,
          true,
          options,
        );
        if (costA <= costB) {
          br.display.from = boundary;
        } else if (j > 0 && j < snapPoints.length - 1) {
          currentBoundaries[j - 1] = br.display.from;
          snapPoints[j] = br.display.from;
        }
      }

      // End Snap
      const endGap = boundary - br.display.to;
      if (endGap > 0 && endGap < END_SNAP_THRESHOLD) {
        const costA = endGap;
        const costB = getClipMoveCost(
          j,
          br.display.to,
          currentBoundaries,
          bRollTimings,
          false,
          options,
        );
        if (costA <= costB) {
          br.display.to = boundary;
        } else if (j > 0 && j < snapPoints.length - 1) {
          currentBoundaries[j - 1] = br.display.to;
          snapPoints[j] = br.display.to;
        }
      }
      br.time = br.display.from;
      br.duration = br.display.to - br.display.from;
    }
  }
}

function ruleFinalizeBoundaries(
  currentBoundaries: number[],
  options: { globalOffset: number; segmentEnd: number },
): number[] {
  const finalized = [options.globalOffset, ...currentBoundaries, options.segmentEnd];
  for (let i = 1; i < finalized.length - 1; i++) {
    finalized[i] = Math.max(finalized[i - 1] + 1, finalized[i]);
    finalized[i] = Math.min(finalized[i], options.segmentEnd - 1);
  }
  return finalized;
}

function applyOptimizationRules(
  initialResult: InitialTimingResult,
  globalOffset: number,
  segmentDurationMs: number,
): { clips: ClipTiming[]; bRolls: BRollTiming[] } {
  const segmentEnd = globalOffset + segmentDurationMs;

  // 1. Keep relative timeline (removed globalOffset addition)
  let clipTimings = initialResult.clipTimings.map((c) => ({
    display: { from: c.display.from, to: c.display.to },
    duration: c.duration,
  }));
  let bRollTimings = initialResult.bRollTimings.map((b) => ({
    display: { from: b.display.from, to: b.display.to },
    duration: b.duration,
    time: b.time,
    originalBRollIndex: b.originalBRollIndex,
  }));

  // 2. Extract internal boundaries
  let currentBoundaries = clipTimings.map((c) => c.display.to);
  currentBoundaries.pop();

  // 3. Apply Snapping Rules (Encapsulated)
  ruleSnapBoundaries(bRollTimings, currentBoundaries, { globalOffset, segmentEnd });

  // 4. Apply Final Cleanup Rules (Encapsulated)
  const finalizedBoundaries = ruleFinalizeBoundaries(currentBoundaries, {
    globalOffset,
    segmentEnd,
  });

  // 5. Reconstruct final clips
  const finalClips: ClipTiming[] = [];
  for (let i = 0; i < clipTimings.length; i++) {
    const from = finalizedBoundaries[i],
      to = finalizedBoundaries[i + 1];
    finalClips.push({ display: { from, to }, duration: to - from });
  }

  return { clips: finalClips, bRolls: bRollTimings };
}

export const calculateSegmentTimings = async (
  context: StepContext,
  mediaMetadata: Record<string, MediaMetadata>,
): Promise<SegmentTiming[]> => {
  const segments = context.scheme.segments;
  const timings: SegmentTiming[] = [];
  let globalTotalDuration = 0;

  const segmentUpdater = new SegmentUpdater(context.schemeId, segments.length);

  // 1. Pre-fetch transcripts and perform "Manual Probe"
  const segmentsWithData = await Promise.all(
    segments.map(async (seg) => {
      const data = mediaMetadata[seg.id];
      if (!data) return null;

      let transcript = null;
      try {
        const resp = await fetch(data.captionUrl);
        if (resp.ok) transcript = await resp.json();
      } catch (e) {
        console.warn(`[TIMINGS] Failed transcript fetch for ${seg.id}`);
      }

      let manualResult: InitialTimingResult | null = null;
      let isValid = false;
      const hasNumbers = (text?: string) => /\d/.test(text || "");
      const needsGeminiTrigger = seg.bRolls?.some((br) => hasNumbers(br.words)) || false;

      if (transcript && seg.shots && !needsGeminiTrigger) {
        const segmentDurationMs = Math.round(data.duration);
        manualResult = await extractTimingsManual(seg, data, segmentDurationMs);

        // VALIDATION: Check if counts match
        const expectedShots = seg.shots.length;
        const expectedBRolls = seg.bRolls?.length || 0;

        if (
          manualResult.clipTimings.length === expectedShots &&
          manualResult.bRollTimings.length === expectedBRolls
        ) {
          isValid = true;
        }
      }

      return { seg, data, transcript, manualResult, isValid, needsGeminiTrigger };
    }),
  );

  const validData = segmentsWithData.filter((d): d is NonNullable<typeof d> => d !== null);

  // 2. Identify Gemini Fallback segments
  const segmentsNeedGemini = validData.filter(
    (d) => (!d.isValid || d.needsGeminiTrigger) && d.transcript,
  );
  const geminiMap = new Map<string, any>();

  if (segmentsNeedGemini.length > 0) {
    const numNumeric = segmentsNeedGemini.filter((d) => d.needsGeminiTrigger).length;
    console.log(
      `[TIMINGS] ${segmentsNeedGemini.length} segments queued for Gemini (${numNumeric} numeric triggers).`,
    );

    const geminiResults = await context.services.gemini.getBatchTimings(
      segmentsNeedGemini.map((d) => ({
        id: d.seg.id,
        shots: d.seg.shots || [],
        bRolls: d.seg.bRolls || [],
        transcript: d.transcript,
        startPause: d.data.startPause,
        endPause: d.data.endPause,
        duration: d.data.duration,
      })),
    );
    geminiResults.segments.forEach((s) => geminiMap.set(s.segmentId, s));
  }

  // 3. Main Optimization Loop
  for (const { seg, data, transcript, manualResult, isValid } of validData) {
    const segmentDurationMs = Math.round(data.duration);
    let initialResult: InitialTimingResult;

    const geminiResult = geminiMap.get(seg.id);

    // PRIORITY 1: Manual if Valid
    if (isValid && manualResult) {
      initialResult = manualResult;
    }
    // PRIORITY 2: Gemini Fallback
    else if (geminiResult && geminiResult.shots.length === (seg.shots?.length || 0)) {
      initialResult = extractTimingsAI(seg, data, segmentDurationMs, geminiResult);
    }
    // PRIORITY 3: Emergency Distribution
    else {
      console.warn(`[TIMINGS] Critical failure for ${seg.id}. Distributing equally.`);
      const numShots = seg.shots?.length || 1;
      const shotDur = segmentDurationMs / numShots;
      const clipTimings: ClipTiming[] = [];
      for (let i = 0; i < numShots; i++) {
        clipTimings.push({
          display: { from: i * shotDur, to: (i + 1) * shotDur },
          duration: shotDur,
        });
      }
      initialResult = { clipTimings, bRollTimings: [] };
    }

    // 4. Final Rule Pass
    const optimized = applyOptimizationRules(initialResult, 0, segmentDurationMs);
    timings.push({ id: seg.id, ...optimized });

    // 5. Schema Injection (Finalized values)
    if (seg.shots) {
      optimized.clips.forEach((clip, i) => {
        if (seg.shots && seg.shots[i]) {
          seg.shots[i].display = { ...clip.display };
          seg.shots[i].duration = clip.duration;
        }
      });
    }
    if (seg.bRolls) {
      optimized.bRolls.forEach((br) => {
        if (seg.bRolls && seg.bRolls[br.originalBRollIndex]) {
          seg.bRolls[br.originalBRollIndex].display = { ...br.display };
          seg.bRolls[br.originalBRollIndex].duration = br.duration;
        }
      });
    }
    if (seg.textToSpeech) {
      seg.textToSpeech.display = {
        from: data.startPause,
        to: segmentDurationMs - data.endPause,
      };
    }
    if (seg.speechToText) {
      seg.speechToText.display = {
        from: data.startPause,
        to: segmentDurationMs - data.endPause,
      };
    }
    await segmentUpdater.updateSegment(seg as any);

    globalTotalDuration += segmentDurationMs;
  }

  await segmentUpdater.finalize();

  return timings;
};

export const calculateSegmentTimingsManual = async (
  context: StepContext,
  mediaMetadata: Record<string, MediaMetadata>,
): Promise<SegmentTiming[]> => {
  const segments = context.scheme.segments;
  const timings: SegmentTiming[] = [];
  const START_SNAP_THRESHOLD = 500; // 0.5s
  const END_SNAP_THRESHOLD = 1000; // 1s
  let globalTotalDuration = 0;

  const segmentUpdater = new SegmentUpdater(context.schemeId, segments.length);

  for (const seg of segments) {
    let attempts = 0;
    const maxAttempts = 4;
    let success = false;
    let durationAllClipsForGlobal = 0;

    while (attempts < maxAttempts && !success) {
      try {
        const data = mediaMetadata[seg.id];
        if (!data || !seg.shots) {
          throw new Error(`[TIMINGS] Metadata or shots missing for segment ${seg.id}`);
        }

        const { captionUrl, duration, startPause, endPause } = data;
        const segmentDurationMs = Math.round(duration);

        // 1. Calculate Initial Clips (Fidelity to audio)
        // Subtract pauses to get the net duration for shot distribution
        const netDurationSec = convertMsToSeconds(segmentDurationMs - startPause - endPause);
        const shotDurationsSec = await getShotDurations(captionUrl, seg.shots, netDurationSec, 0);

        const clipTimings: ClipTiming[] = [];
        let currentPos = 0;

        for (let idx = 0; idx < seg.shots.length; idx++) {
          let clipDurationMs = convertSecondsToMs(shotDurationsSec[idx]);

          if (idx === 0) clipDurationMs += startPause;
          if (idx === seg.shots.length - 1) clipDurationMs += endPause;

          // Ensure we don't drift due to rounding
          clipDurationMs = Math.round(clipDurationMs);

          const from = currentPos;
          let to = currentPos + clipDurationMs;

          // Final clip must exactly hit the segment end
          if (idx === seg.shots.length - 1) {
            to = segmentDurationMs;
            clipDurationMs = to - from;
          }

          clipTimings.push({ display: { from, to }, duration: clipDurationMs });
          currentPos += clipDurationMs;
        }
        durationAllClipsForGlobal = segmentDurationMs;
        const segmentEnd = segmentDurationMs;

        // 2. Calculate B-Rolls (Ideal word timings)
        let bRollTimings: BRollTiming[] = [];
        if (seg.bRolls) {
          for (let i = 0; i < seg.bRolls.length; i++) {
            const bRoll = seg.bRolls[i];
            if (!bRoll.words) continue;
            const dataTime = await getBRollDisplayTime(bRoll.words, captionUrl, 0);
            if (!dataTime) continue;
            let { from, to } = dataTime.display;

            // Cap at segment end and preserve duration
            if (to > segmentEnd) {
              const diff = to - segmentEnd;
              to = segmentEnd;
              from = Math.max(0, from - diff);
            }

            bRollTimings.push({
              display: { from, to },
              duration: to - from,
              time: from,
              originalBRollIndex: i,
            });
          }
        }
        // 3. Optimize Boundaries (Strict 7-Rule Pass)
        let currentBoundaries = clipTimings.map((c) => c.display.to);
        currentBoundaries.pop();

        const isFullyCovered = (f: number, t: number, brs: BRollTiming[]) => {
          return brs.some((br) => br.display.from <= f + 1 && br.display.to >= t - 1);
        };

        const getClipMoveCost = (
          boundaryIdx: number,
          targetTime: number,
          boundaries: number[],
          brs: BRollTiming[],
          isStart: boolean,
        ) => {
          if (boundaryIdx === 0 || boundaryIdx === boundaries.length + 1) return Infinity;
          let testBoundaries = [0, ...boundaries, segmentEnd];
          let diff = targetTime - testBoundaries[boundaryIdx];

          // RULE 6: No Chain Reaction. We ONLY allow moving ONE boundary.
          // Check if moving this boundary violates visibility for adjacent clips.
          testBoundaries[boundaryIdx] = targetTime;

          const prevF = testBoundaries[boundaryIdx - 1],
            prevT = testBoundaries[boundaryIdx];
          const nextF = testBoundaries[boundaryIdx],
            nextT = testBoundaries[boundaryIdx + 1];

          // RULE 1 & 7: Threshold Visibility (START_SNAP_THRESHOLD before broll, END_SNAP_THRESHOLD after)
          // If a clip is covered, it's exempt (Rule 7).
          const threshold = isStart ? START_SNAP_THRESHOLD : END_SNAP_THRESHOLD;

          if (!isFullyCovered(prevF, prevT, brs) && prevT - prevF < threshold) return Infinity;
          if (!isFullyCovered(nextF, nextT, brs) && nextT - nextF < threshold) return Infinity;

          return Math.abs(diff);
        };

        const snapPoints = [0, ...currentBoundaries, segmentEnd];
        for (let i = 0; i < bRollTimings.length; i++) {
          const br = bRollTimings[i];
          for (let j = 0; j < snapPoints.length; j++) {
            const boundary = snapPoints[j];

            // RULE 3 & 4: Outward Expansion Only (from only left, to only right)
            const startGap = br.display.from - boundary;
            if (startGap > 0 && startGap < START_SNAP_THRESHOLD) {
              // Option A: Move B-Roll 'from' left to boundary (Cost: startGap)
              // Option B: Move clip boundary right to br.display.from (Cost: getClipMoveCost)
              const costA = startGap;
              const costB = getClipMoveCost(
                j,
                br.display.from,
                currentBoundaries,
                bRollTimings,
                true,
              );

              if (costA <= costB) {
                br.display.from = boundary; // Grow B-roll left
              } else if (j > 0 && j < snapPoints.length - 1) {
                currentBoundaries[j - 1] = br.display.from; // Move clip boundary right
                snapPoints[j] = br.display.from;
              }
              br.time = br.display.from;
              br.duration = br.display.to - br.display.from;
            }

            const endGap = boundary - br.display.to;
            if (endGap > 0 && endGap < END_SNAP_THRESHOLD) {
              // Option A: Move B-Roll 'to' right to boundary (Cost: endGap)
              // Option B: Move clip boundary left to br.display.to (Cost: getClipMoveCost)
              const costA = endGap;
              const costB = getClipMoveCost(
                j,
                br.display.to,
                currentBoundaries,
                bRollTimings,
                false,
              );

              if (costA <= costB) {
                br.display.to = boundary; // Grow B-roll right
              } else if (j > 0 && j < snapPoints.length - 1) {
                currentBoundaries[j - 1] = br.display.to; // Move clip boundary left
                snapPoints[j] = br.display.to;
              }
              br.time = br.display.from;
              br.duration = br.display.to - br.display.from;
            }
          }
        }
        // 4. Final Finalize Clips
        const finalizedBoundaries = [0, ...currentBoundaries, segmentEnd];
        // Enforce basic sequentiality and 0ms avoidance (safety only)
        for (let i = 1; i < finalizedBoundaries.length - 1; i++) {
          finalizedBoundaries[i] = Math.max(finalizedBoundaries[i - 1] + 1, finalizedBoundaries[i]);
          finalizedBoundaries[i] = Math.min(finalizedBoundaries[i], segmentEnd - 1);
        }

        const finalClips: ClipTiming[] = [];
        for (let i = 0; i < clipTimings.length; i++) {
          const from = finalizedBoundaries[i],
            to = finalizedBoundaries[i + 1];
          finalClips.push({ display: { from, to }, duration: to - from });
        }

        // 5. Final Schema Injection
        if (seg.shots) {
          finalClips.forEach((clip, i) => {
            if (seg.shots && seg.shots[i]) {
              seg.shots[i].display = { ...clip.display };
              seg.shots[i].duration = clip.duration;
            }
          });
        }
        if (seg.bRolls) {
          bRollTimings.forEach((br) => {
            if (seg.bRolls && seg.bRolls[br.originalBRollIndex]) {
              seg.bRolls[br.originalBRollIndex].display = { ...br.display };
              seg.bRolls[br.originalBRollIndex].duration = br.duration;
            }
          });
        }
        if (seg.textToSpeech) {
          seg.textToSpeech.display = {
            from: startPause,
            to: segmentDurationMs - endPause,
          };
        }
        if (seg.speechToText) {
          seg.speechToText.display = {
            from: startPause,
            to: segmentDurationMs - endPause,
          };
        }

        timings.push({
          id: seg.id,
          clips: finalClips,
          bRolls: bRollTimings,
        });
        globalTotalDuration += durationAllClipsForGlobal;

        await segmentUpdater.updateSegment(seg as any);

        success = true;
      } catch (err) {
        attempts++;
        console.warn(`[TIMINGS] Attempt ${attempts} failed for segment ${seg.id}:`, err);
        if (attempts >= maxAttempts) throw err;
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    const lastSeg = timings[timings.length - 1];
    if (lastSeg) {
      globalTotalDuration += lastSeg.clips.reduce((sum, c) => sum + c.duration, 0);
    }
  }

  await segmentUpdater.finalize();

  return timings;
};

export const calculateSegmentTimingsAI = async (
  context: StepContext,
  mediaMetadata: Record<string, MediaMetadata>,
): Promise<SegmentTiming[]> => {
  const segments = context.scheme.segments;
  const timings: SegmentTiming[] = [];
  const START_SNAP_THRESHOLD = 500; // 0.5s
  const END_SNAP_THRESHOLD = 1000; // 1s
  let globalTotalDuration = 0;

  // 1. Pre-fetch Batch Timings from Gemini
  const batchData = await Promise.all(
    segments.map(async (seg) => {
      const data = mediaMetadata[seg.id];
      if (!data) return null;
      try {
        const resp = await fetch(data.captionUrl);
        const transcript = await resp.json();
        return {
          id: seg.id,
          shots: seg.shots || [],
          bRolls: seg.bRolls || [],
          transcript,
          startPause: data.startPause,
          endPause: data.endPause,
          duration: data.duration,
        };
      } catch (e) {
        return null;
      }
    }),
  );

  const validBatchData = batchData.filter((d): d is NonNullable<typeof d> => d !== null);
  const geminiTimings = await context.services.gemini.getBatchTimings(validBatchData);
  const geminiMap = new Map(geminiTimings.segments.map((s) => [s.segmentId, s]));

  for (const seg of segments) {
    let attempts = 0;
    const maxAttempts = 4;
    let success = false;
    let durationAllClipsForGlobal = 0;

    while (attempts < maxAttempts && !success) {
      try {
        const data = mediaMetadata[seg.id];
        if (!data || !seg.shots) {
          throw new Error(`[TIMINGS] Metadata or shots missing for segment ${seg.id}`);
        }

        const { captionUrl, duration, startPause, endPause } = data;
        const segmentDurationMs = Math.round(duration);
        const segmentGemini = geminiMap.get(seg.id);

        // 2. Calculate Initial Clips (Fidelity to audio)
        let clipTimings: ClipTiming[] = [];
        let currentPos = 0;

        if (segmentGemini && segmentGemini.shots.length === seg.shots.length) {
          // Use Gemini extracted timings
          for (let idx = 0; idx < seg.shots.length; idx++) {
            const geminiShot = segmentGemini.shots[idx];
            let from = currentPos;
            let to =
              convertSecondsToMs(geminiShot.end) + (idx === seg.shots.length - 1 ? endPause : 0);

            // First clip includes startPause
            if (idx === 0) from = 0;

            let durationMs = Math.round(to - from);
            if (idx === seg.shots.length - 1) {
              to = segmentDurationMs;
              durationMs = to - from;
            }

            clipTimings.push({ display: { from, to }, duration: durationMs });
            currentPos = to;
          }
        } else {
          // Fallback to manual parsing
          const netDurationSec = convertMsToSeconds(segmentDurationMs - startPause - endPause);
          const shotDurationsSec = await getShotDurations(captionUrl, seg.shots, netDurationSec, 0);

          for (let idx = 0; idx < seg.shots.length; idx++) {
            let clipDurationMs = convertSecondsToMs(shotDurationsSec[idx]);
            if (idx === 0) clipDurationMs += startPause;
            if (idx === seg.shots.length - 1) clipDurationMs += endPause;
            clipDurationMs = Math.round(clipDurationMs);

            const from = currentPos;
            let to = currentPos + clipDurationMs;
            if (idx === seg.shots.length - 1) {
              to = segmentDurationMs;
              clipDurationMs = to - from;
            }
            clipTimings.push({ display: { from, to }, duration: clipDurationMs });
            currentPos += clipDurationMs;
          }
        }

        durationAllClipsForGlobal = segmentDurationMs;
        const segmentEnd = segmentDurationMs;
        console.log(`[TIMINGS] Initial clips for segment ${seg.id}:`, clipTimings);

        // 3. Calculate B-Rolls
        let bRollTimings: BRollTiming[] = [];
        if (seg.bRolls) {
          for (let i = 0; i < seg.bRolls.length; i++) {
            const bRoll = seg.bRolls[i];
            let from = 0,
              to = 0;

            const geminiBRoll = segmentGemini?.bRolls.find((br) => br.originalIndex === i);
            if (geminiBRoll) {
              from = convertSecondsToMs(geminiBRoll.start);
              to = convertSecondsToMs(geminiBRoll.end);
            } else {
              // Fallback
              const dataTime = await getBRollDisplayTime(bRoll.words || "", captionUrl, startPause);
              if (!dataTime) continue;
              from = dataTime.display.from;
              to = dataTime.display.to;
            }

            // Cap at segment end and preserve duration
            if (to > segmentEnd) {
              const diff = to - segmentEnd;
              to = segmentEnd;
              from = Math.max(0, from - diff);
            }

            bRollTimings.push({
              display: { from, to },
              duration: to - from,
              time: from,
              originalBRollIndex: i,
            });
          }
        }
        // 3. Optimize Boundaries (Strict 7-Rule Pass)
        let currentBoundaries = clipTimings.map((c) => c.display.to);
        currentBoundaries.pop();

        const isFullyCovered = (f: number, t: number, brs: BRollTiming[]) => {
          return brs.some((br) => br.display.from <= f + 1 && br.display.to >= t - 1);
        };

        const getClipMoveCost = (
          boundaryIdx: number,
          targetTime: number,
          boundaries: number[],
          brs: BRollTiming[],
          isStart: boolean,
        ) => {
          if (boundaryIdx === 0 || boundaryIdx === boundaries.length + 1) return Infinity;
          let testBoundaries = [0, ...boundaries, segmentEnd];
          let diff = targetTime - testBoundaries[boundaryIdx];

          // RULE 6: No Chain Reaction. We ONLY allow moving ONE boundary.
          // Check if moving this boundary violates visibility for adjacent clips.
          testBoundaries[boundaryIdx] = targetTime;

          const prevF = testBoundaries[boundaryIdx - 1],
            prevT = testBoundaries[boundaryIdx];
          const nextF = testBoundaries[boundaryIdx],
            nextT = testBoundaries[boundaryIdx + 1];

          // RULE 1 & 7: Threshold Visibility (START_SNAP_THRESHOLD before broll, END_SNAP_THRESHOLD after)
          // If a clip is covered, it's exempt (Rule 7).
          const threshold = isStart ? START_SNAP_THRESHOLD : END_SNAP_THRESHOLD;

          if (!isFullyCovered(prevF, prevT, brs) && prevT - prevF < threshold) return Infinity;
          if (!isFullyCovered(nextF, nextT, brs) && nextT - nextF < threshold) return Infinity;

          return Math.abs(diff);
        };

        const snapPoints = [0, ...currentBoundaries, segmentEnd];
        for (let i = 0; i < bRollTimings.length; i++) {
          const br = bRollTimings[i];
          for (let j = 0; j < snapPoints.length; j++) {
            const boundary = snapPoints[j];

            // RULE 3 & 4: Outward Expansion Only (from only left, to only right)
            const startGap = br.display.from - boundary;
            if (startGap > 0 && startGap < START_SNAP_THRESHOLD) {
              // Option A: Move B-Roll 'from' left to boundary (Cost: startGap)
              // Option B: Move clip boundary right to br.display.from (Cost: getClipMoveCost)
              const costA = startGap;
              const costB = getClipMoveCost(
                j,
                br.display.from,
                currentBoundaries,
                bRollTimings,
                true,
              );

              if (costA <= costB) {
                br.display.from = boundary; // Grow B-roll left
              } else if (j > 0 && j < snapPoints.length - 1) {
                currentBoundaries[j - 1] = br.display.from; // Move clip boundary right
                snapPoints[j] = br.display.from;
              }
              br.time = br.display.from;
              br.duration = br.display.to - br.display.from;
            }

            const endGap = boundary - br.display.to;
            if (endGap > 0 && endGap < END_SNAP_THRESHOLD) {
              // Option A: Move B-Roll 'to' right to boundary (Cost: endGap)
              // Option B: Move clip boundary left to br.display.to (Cost: getClipMoveCost)
              const costA = endGap;
              const costB = getClipMoveCost(
                j,
                br.display.to,
                currentBoundaries,
                bRollTimings,
                false,
              );

              if (costA <= costB) {
                br.display.to = boundary; // Grow B-roll right
              } else if (j > 0 && j < snapPoints.length - 1) {
                currentBoundaries[j - 1] = br.display.to; // Move clip boundary left
                snapPoints[j] = br.display.to;
              }
              br.time = br.display.from;
              br.duration = br.display.to - br.display.from;
            }
          }
        }
        // 4. Final Finalize Clips
        const finalizedBoundaries = [0, ...currentBoundaries, segmentEnd];
        // Enforce basic sequentiality and 0ms avoidance (safety only)
        for (let i = 1; i < finalizedBoundaries.length - 1; i++) {
          finalizedBoundaries[i] = Math.max(finalizedBoundaries[i - 1] + 1, finalizedBoundaries[i]);
          finalizedBoundaries[i] = Math.min(finalizedBoundaries[i], segmentEnd - 1);
        }

        const finalClips: ClipTiming[] = [];
        for (let i = 0; i < clipTimings.length; i++) {
          const from = finalizedBoundaries[i],
            to = finalizedBoundaries[i + 1];
          finalClips.push({ display: { from, to }, duration: to - from });
        }
        console.log(`[TIMINGS] Finalized clips for segment ${seg.id}:`, finalClips, clipTimings);
        timings.push({ id: seg.id, clips: finalClips, bRolls: bRollTimings });
        success = true;
      } catch (err) {
        attempts++;
        console.warn(`[TIMINGS] Attempt ${attempts} failed for segment ${seg.id}:`, err);
        if (attempts >= maxAttempts) throw err;
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    const lastSeg = timings[timings.length - 1];
    globalTotalDuration += lastSeg.clips.reduce((sum, c) => sum + c.duration, 0);
  }

  return timings;
};
