import { create } from "zustand";

export interface AvatarParams {
  prompt: string;
  aspectRatio: "1:1" | "4:3" | "16:9" | "9:16";
  resolution: "1K" | "2K" | "4K";
  outputFormat: "png" | "jpg" | "webp";
}

export interface GeneratedAvatar {
  id: string;
  url: string;
  prompt: string;
  aspectRatio: string;
  createdAt: Date;
}

interface AvatarState {
  prompt: string;
  params: AvatarParams;
  generatedAvatars: GeneratedAvatar[];
  currentAvatar: GeneratedAvatar | null;
  isGenerating: boolean;
  error: string | null;

  // Actions
  setPrompt: (prompt: string) => void;
  setParams: (params: Partial<AvatarParams>) => void;
  addGeneratedAvatar: (avatar: GeneratedAvatar) => void;
  setCurrentAvatar: (avatar: GeneratedAvatar | null) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  setError: (error: string | null) => void;
  fetchAvatars: () => Promise<void>;
  saveAvatar: (avatar: {
    url: string;
    prompt: string;
    aspectRatio: string;
  }) => Promise<GeneratedAvatar | null>;
  deleteAvatar: (id: string) => Promise<boolean>;
  reset: () => void;
}

const initialState = {
  prompt: "",
  params: {
    prompt: "",
    aspectRatio: "9:16" as const,
    resolution: "2K" as const,
    outputFormat: "png" as const,
  },
  generatedAvatars: [],
  currentAvatar: null,
  isGenerating: false,
  error: null,
};

export const useAvatarStore = create<AvatarState>((set, get) => ({
  ...initialState,

  setPrompt: (prompt) =>
    set((state) => ({
      prompt,
      params: { ...state.params, prompt },
    })),

  setParams: (params) =>
    set((state) => ({
      params: { ...state.params, ...params },
    })),

  addGeneratedAvatar: (avatar) =>
    set((state) => ({
      generatedAvatars: [avatar, ...state.generatedAvatars],
      currentAvatar: avatar,
    })),

  setCurrentAvatar: (avatar) => set({ currentAvatar: avatar }),

  setIsGenerating: (isGenerating) => set({ isGenerating }),

  setError: (error) => set({ error }),

  fetchAvatars: async () => {
    try {
      set({ isGenerating: true });
      const response = await fetch("/api/avatar");
      if (!response.ok) throw new Error("Failed to fetch avatars");
      const data = await response.json();
      const avatars = data.avatars.map((a: any) => ({
        id: a.id,
        url: a.public_url,
        prompt: a.metadata?.prompt || "",
        aspectRatio: a.metadata?.aspectRatio || "9:16",
        createdAt: new Date(a.created_at),
      }));
      set({ generatedAvatars: avatars });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isGenerating: false });
    }
  },

  saveAvatar: async (avatarData) => {
    try {
      const response = await fetch("/api/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(avatarData),
      });
      if (!response.ok) throw new Error("Failed to save avatar");
      const { asset } = await response.json();

      const newAvatar: GeneratedAvatar = {
        id: asset.id,
        url: asset.public_url,
        prompt: asset.metadata?.prompt || "",
        aspectRatio: asset.metadata?.aspectRatio || "9:16",
        createdAt: new Date(asset.created_at),
      };

      set((state) => ({
        generatedAvatars: [newAvatar, ...state.generatedAvatars],
      }));
      return newAvatar;
    } catch (error: any) {
      set({ error: error.message });
      return null;
    }
  },

  deleteAvatar: async (id) => {
    try {
      const response = await fetch(`/api/avatar?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete avatar");
      set((state) => ({
        generatedAvatars: state.generatedAvatars.filter((avatar) => avatar.id !== id),
      }));
      return true;
    } catch (error: any) {
      set({ error: error.message });
      return false;
    }
  },

  reset: () => set(initialState),
}));
