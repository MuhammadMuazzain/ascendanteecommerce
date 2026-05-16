import { create } from "zustand";
import { defaultGenerationParams, type GenerateScriptParams } from "@/lib/generation/constants";

type VideoConfig = Partial<GenerateScriptParams>;

export type VideoConfigUpdater = VideoConfig | ((prev: VideoConfig) => VideoConfig);

interface VideoConfigState {
  params: VideoConfig;
  setParams: (updater: VideoConfigUpdater) => void;
  resetParams: (script?: string) => void;
}

export const useVideoConfigStore = create<VideoConfigState>((set) => ({
  params: defaultGenerationParams(),
  setParams: (updater) =>
    set((state) => {
      const nextParams = typeof updater === "function" ? updater(state.params) : updater;

      return {
        params: {
          ...state.params,
          ...nextParams,
        },
      };
    }),
  resetParams: (script) =>
    set({
      params: defaultGenerationParams({ script }),
    }),
}));
