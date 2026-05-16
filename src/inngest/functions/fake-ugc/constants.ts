export const FAKE_UGC_TASK_KEYS = {
  ANALYSIS: "analysis",
  ASSETS: "assets",
  AUDIO: "audio",
  TIMINGS: "timings",
  MEDIA: "media",
  VFX: "vfx",
  ASSEMBLING: "assembling",
  LIPSYNC: "lipsync",
  FINALIZING: "finalizing",
} as const;

export const FAKE_UGC_TASKS = [
  { key: FAKE_UGC_TASK_KEYS.ANALYSIS, label: "Analyzing script and instructions..." },
  { key: FAKE_UGC_TASK_KEYS.ASSETS, label: "Preparing product assets..." },
  { key: FAKE_UGC_TASK_KEYS.AUDIO, label: "Generating voiceover and captions..." },
  { key: FAKE_UGC_TASK_KEYS.TIMINGS, label: "Planning scene timings..." },
  { key: FAKE_UGC_TASK_KEYS.MEDIA, label: "Generating visual elements and main scenes..." },
  { key: FAKE_UGC_TASK_KEYS.VFX, label: "Generating cinematic B-roll layers..." },
  { key: FAKE_UGC_TASK_KEYS.ASSEMBLING, label: "Assembling final video..." },
  { key: FAKE_UGC_TASK_KEYS.LIPSYNC, label: "Applying avatar lip-sync..." },
  { key: FAKE_UGC_TASK_KEYS.FINALIZING, label: "Finalizing project..." },
];
