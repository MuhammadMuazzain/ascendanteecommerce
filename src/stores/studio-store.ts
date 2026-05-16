import { create } from "zustand";
import { Studio } from "@openvideo/engine-pixi";

type IClip = any;
interface StudioState {
  studio: Studio | null;
  setStudio: (studio: Studio | null) => void;
  selectedClips: IClip[];
  setSelectedClips: (clips: IClip[]) => void;
}

export const useStudioStore = create<StudioState>((set) => ({
  studio: null,
  setStudio: (studio) => set({ studio }),
  selectedClips: [],
  setSelectedClips: (clips) => set({ selectedClips: clips }),
}));
