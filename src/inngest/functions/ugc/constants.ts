export const UGC_TASK_KEYS = {
  ANALYSIS: "analysis",
  ASSETS: "assets",
  SHOTS: "shots",
  SCHEMA: "schema",
  RENDERING: "rendering",
  WAVES: "waves",
  VOICES: "voices",
  VOICEALIGN: "voicealign",
  FINALIZING: "finalizing",
} as const;

export const UGC_TASKS = [
  { key: UGC_TASK_KEYS.ANALYSIS, label: "Analyzing script and instructions..." },
  { key: UGC_TASK_KEYS.ASSETS, label: "Preparing product assets..." },
  { key: UGC_TASK_KEYS.SHOTS, label: "Generating creative shots..." },
  { key: UGC_TASK_KEYS.SCHEMA, label: "Finalizing scene structures..." },
  { key: UGC_TASK_KEYS.RENDERING, label: "Building rendering plan..." },
  { key: UGC_TASK_KEYS.WAVES, label: "Rendering scenes..." },
  { key: UGC_TASK_KEYS.VOICES, label: "Analyzing primary voices..." },
  { key: UGC_TASK_KEYS.VOICEALIGN, label: "Aligning voiceover to actors..." },
  { key: UGC_TASK_KEYS.FINALIZING, label: "Finalizing project..." },
];
