import { create } from "zustand";
import { ScriptBlock } from "@/types/video-generation";

interface ScriptState {
  script: string;
  title: string;
  isEnhancing: boolean;
  setScript: (script: string) => void;
  setTitle: (title: string) => void;
  setIsEnhancing: (isEnhancing: boolean) => void;
  clearScript: () => void;
}

export const useScriptStore = create<ScriptState>((set, get) => ({
  script: "",
  title: "",
  isEnhancing: false,
  setScript: (script) => set({ script }),
  setTitle: (title) => set({ title }),
  setIsEnhancing: (isEnhancing) => set({ isEnhancing }),
  clearScript: () => set({ script: "", title: "" }),
}));
