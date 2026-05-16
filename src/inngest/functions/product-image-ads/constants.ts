export const PRODUCT_TASK_KEYS = {
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

export const PRODUCT_TASKS = [
  { key: PRODUCT_TASK_KEYS.ANALYSIS, label: "Analyzing script and instructions..." },
  { key: PRODUCT_TASK_KEYS.ASSETS, label: "Preparing product assets..." },
  { key: PRODUCT_TASK_KEYS.AUDIO, label: "Generating voiceover and captions..." },
  { key: PRODUCT_TASK_KEYS.TIMINGS, label: "Planning scene timings..." },
  { key: PRODUCT_TASK_KEYS.MEDIA, label: "Generating visual elements and main scenes..." },
  { key: PRODUCT_TASK_KEYS.VFX, label: "Generating cinematic B-roll layers..." },
  { key: PRODUCT_TASK_KEYS.ASSEMBLING, label: "Assembling final video..." },
  { key: PRODUCT_TASK_KEYS.LIPSYNC, label: "Applying avatar lip-sync..." },
  { key: PRODUCT_TASK_KEYS.FINALIZING, label: "Finalizing project..." },
];
