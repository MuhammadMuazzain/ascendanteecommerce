import { create } from "zustand";
import { Clip, Schema, Segment, VisualShot } from "@/lib/schema-generator/types";

export type UGCClip = Clip;

export type GeneratedAsset = UGCClip;

export interface GeneratedFrame {
  segmentId: string;
  url: string;
  prompt: string;
}

export interface GeneratedVideo {
  segmentId: string;
  url: string;
  prompt: string;
}

interface SchemaState {
  // Schema
  schema: Schema | null;
  schemaJson: string;

  // Assets
  avatarUrl: string | null;
  productUrls: string[];

  // Generated assets
  frames: Record<string, GeneratedFrame>;
  videos: Record<string, GeneratedVideo>;
  generatingShots: Record<string, string | boolean>;

  // Generation history
  frameHistory: Record<string, GeneratedFrame[]>;
  videoHistory: Record<string, GeneratedVideo[]>;

  isGenerating: boolean;
  generationProgress: number;
  error: string | null;

  // Actions
  setSchema: (schema: Schema) => void;
  updateSchema: (updates: Partial<Schema> | ((prev: Schema | null) => Partial<Schema>)) => void;
  setSchemaJson: (json: string) => void;
  setAvatarUrl: (url: string | null) => void;
  addProductUrl: (url: string) => void;
  removeProductUrl: (url: string) => void;
  setProductUrls: (urls: string[]) => void;
  updateFrame: (segmentId: string, frame: GeneratedFrame) => Promise<void>;
  setFrames: (frames: Record<string, GeneratedFrame>) => void;
  updateVideo: (segmentId: string, video: GeneratedVideo) => Promise<void>;
  setVideos: (videos: Record<string, GeneratedVideo>) => void;
  addSegmentAsset: (segmentId: string, asset: UGCClip) => Promise<void>;
  updateSegmentAsset: (
    segmentId: string,
    assetId: string,
    updates: Partial<UGCClip>,
  ) => Promise<void>;
  deleteSegmentAsset: (segmentId: string, assetId: string) => Promise<void>;
  addFrameToHistory: (segmentId: string, frame: GeneratedFrame) => void;
  addVideoToHistory: (segmentId: string, video: GeneratedVideo) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  setGenerationProgress: (progress: number) => void;
  setError: (error: string | null) => void;
  updateSegment: (segmentId: string, updates: Partial<Segment>) => void;
  updateShot: (segmentId: string, shotIndex: number, updates: Partial<VisualShot>) => void;
  deleteSegment: (segmentId: string) => Promise<void>;
  setGeneratingShots: (
    updater:
      | Record<string, string | boolean>
      | ((prev: Record<string, string | boolean>) => Record<string, string | boolean>),
  ) => void;
  reset: () => void;
}

const initialState = {
  schema: null,
  schemaJson: "{}",
  avatarUrl: null,
  productUrls: [],
  frames: {},
  videos: {},
  generatingShots: {},
  frameHistory: {},
  videoHistory: {},
  isGenerating: false,
  generationProgress: 0,
  error: null,
};

export const useSchemaStore = create<SchemaState>((set, get) => ({
  ...initialState,

  setSchema: (schema) =>
    set({
      schema,
      schemaJson: JSON.stringify(schema, null, 2),
    }),

  updateSchema: (updater) =>
    set((state) => {
      const nextParams = typeof updater === "function" ? updater(state.schema) : updater;

      const newSchema = {
        ...(state.schema || {}),
        ...nextParams,
      } as Schema;
      return {
        schema: newSchema,
        schemaJson: JSON.stringify(newSchema, null, 2),
      };
    }),

  setSchemaJson: (json) => {
    try {
      const schema = JSON.parse(json);
      set({ schemaJson: json, schema, error: null });
    } catch (e) {
      set({ schemaJson: json, error: "Invalid JSON schema" });
    }
  },

  setAvatarUrl: (url) => set({ avatarUrl: url }),

  addProductUrl: (url) =>
    set((state) => ({
      productUrls: [...state.productUrls, url],
    })),

  removeProductUrl: (url) =>
    set((state) => ({
      productUrls: state.productUrls.filter((u) => u !== url),
    })),

  setProductUrls: (urls) => set({ productUrls: urls }),

  updateFrame: async (segmentId, frame) => {
    const { schema } = get();
    if (!schema?.id) return;

    let updatedAssets: GeneratedAsset[] = [];
    let updatedClips: UGCClip[] = [];

    set((state) => {
      if (!state.schema || !state.schema.segments) return state;
      const currentHistory = state.frameHistory[segmentId] || [];
      const isNew = !currentHistory.some((f) => f.url === frame.url);

      const segments = state.schema.segments.map((s) => {
        if (s.id === segmentId) {
          updatedAssets = (s.assets || []).map((a) => ({
            ...a,
            active: a.type === "image" ? a.url === frame.url : a.active,
          }));
          updatedClips = updatedAssets.filter((a) => a.active);

          return { ...s, assets: updatedAssets, clips: updatedClips };
        }
        return s;
      });

      const newSchema = { ...state.schema, segments };

      return {
        schema: newSchema,
        schemaJson: JSON.stringify(newSchema, null, 2),
        frames: {
          ...state.frames,
          [segmentId]: frame,
        },
        frameHistory: isNew
          ? {
              ...state.frameHistory,
              [segmentId]: [frame, ...currentHistory],
            }
          : state.frameHistory,
      };
    });

    // Persist to DB
    try {
      await fetch(`/api/scheme/${schema.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segments: [
            {
              id: segmentId,
              assets: updatedAssets,
              clips: updatedClips,
            },
          ],
        }),
      });
    } catch (error) {
      console.error("Failed to persist frame selection:", error);
      set({ error: "Failed to persist frame selection" });
    }
  },

  setFrames: (frames) => set({ frames }),

  updateVideo: async (segmentId, video) => {
    const { schema } = get();
    if (!schema?.id) return;

    let updatedAssets: GeneratedAsset[] = [];
    let updatedClips: UGCClip[] = [];

    set((state) => {
      if (!state.schema || !state.schema.segments) return state;
      const currentHistory = state.videoHistory[segmentId] || [];
      const isNew = !currentHistory.some((v) => v.url === video.url);

      const segments = state.schema.segments.map((s) => {
        if (s.id === segmentId) {
          updatedAssets = (s.assets || []).map((a) => ({
            ...a,
            active: a.type === "video" ? a.url === video.url : a.active,
          }));
          updatedClips = updatedAssets.filter((a) => a.active);

          return { ...s, assets: updatedAssets, clips: updatedClips };
        }
        return s;
      });

      const newSchema = { ...state.schema, segments };

      return {
        schema: newSchema,
        schemaJson: JSON.stringify(newSchema, null, 2),
        videos: {
          ...state.videos,
          [segmentId]: video,
        },
        videoHistory: isNew
          ? {
              ...state.videoHistory,
              [segmentId]: [video, ...currentHistory],
            }
          : state.videoHistory,
      };
    });

    // Persist to DB
    try {
      await fetch(`/api/scheme/${schema.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segments: [
            {
              id: segmentId,
              assets: updatedAssets,
              clips: updatedClips,
            },
          ],
        }),
      });
    } catch (error) {
      console.error("Failed to persist video selection:", error);
      set({ error: "Failed to persist video selection" });
    }
  },

  setVideos: (videos) => set({ videos }),

  addSegmentAsset: async (segmentId, asset) => {
    const { schema } = get();
    if (!schema?.id) return;

    let updatedAssets: GeneratedAsset[] = [];
    let updatedClips: UGCClip[] = [];

    set((state) => {
      if (!state.schema || !state.schema.segments) return state;
      const segments = state.schema.segments.map((s) => {
        if (s.id === segmentId) {
          // History grows
          updatedAssets = [...(s.assets || []), asset];

          // Re-evaluate clips based on active state (or newly added if first)
          const sameTypeAssets = updatedAssets.filter((a) => a.type === asset.type);
          if (sameTypeAssets.length === 1) {
            asset.active = true;
          }
          updatedClips = updatedAssets.filter((a) => a.active);

          return {
            ...s,
            assets: updatedAssets,
            clips: updatedClips,
          };
        }
        return s;
      });
      const newSchema = { ...state.schema, segments };
      return {
        schema: newSchema,
        schemaJson: JSON.stringify(newSchema, null, 2),
      };
    });

    // Persist to DB
    try {
      await fetch(`/api/scheme/${schema.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segments: [
            {
              id: segmentId,
              assets: updatedAssets,
              clips: updatedClips,
            },
          ],
        }),
      });
    } catch (error) {
      console.error("Failed to persist asset addition:", error);
      set({ error: "Failed to persist asset addition" });
    }
  },

  updateSegmentAsset: async (segmentId, assetId, updates) => {
    const { schema } = get();
    if (!schema?.id) return;

    let updatedAssets: GeneratedAsset[] = [];
    let updatedClips: UGCClip[] = [];

    set((state) => {
      if (!state.schema || !state.schema.segments) return state;
      const segments = state.schema.segments.map((s) => {
        if (s.id === segmentId) {
          updatedAssets = (s.assets || []).map((a) =>
            a.id === assetId ? { ...a, ...updates } : a,
          );
          updatedClips = updatedAssets.filter((a) => a.active);
          return { ...s, assets: updatedAssets, clips: updatedClips };
        }
        return s;
      });
      const newSchema = { ...state.schema, segments };
      return {
        schema: newSchema,
        schemaJson: JSON.stringify(newSchema, null, 2),
      };
    });

    // Persist to DB
    try {
      await fetch(`/api/scheme/${schema.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segments: [
            {
              id: segmentId,
              assets: updatedAssets,
              clips: updatedClips,
            },
          ],
        }),
      });
    } catch (error) {
      console.error("Failed to persist asset update:", error);
      set({ error: "Failed to persist asset update" });
    }
  },

  deleteSegmentAsset: async (segmentId, assetId) => {
    const { schema } = get();
    if (!schema?.id) return;

    let updatedAssets: GeneratedAsset[] = [];
    let updatedClips: UGCClip[] = [];

    set((state) => {
      if (!state.schema || !state.schema.segments) return state;
      const segments = state.schema.segments.map((s) => {
        if (s.id === segmentId) {
          updatedAssets = (s.assets || []).filter((a) => a.id !== assetId);
          updatedClips = updatedAssets.filter((a) => a.active);
          return { ...s, assets: updatedAssets, clips: updatedClips };
        }
        return s;
      });
      const newSchema = { ...state.schema, segments };
      return {
        schema: newSchema,
        schemaJson: JSON.stringify(newSchema, null, 2),
      };
    });

    // Persist to DB
    try {
      await fetch(`/api/scheme/${schema.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segments: [
            {
              id: segmentId,
              assets: updatedAssets,
              clips: updatedClips,
            },
          ],
        }),
      });
    } catch (error) {
      console.error("Failed to persist asset deletion:", error);
      set({ error: "Failed to persist asset deletion" });
    }
  },

  addFrameToHistory: (segmentId, frame) =>
    set((state) => ({
      frameHistory: {
        ...state.frameHistory,
        [segmentId]: [frame, ...(state.frameHistory[segmentId] || [])],
      },
    })),

  addVideoToHistory: (segmentId, video) =>
    set((state) => ({
      videoHistory: {
        ...state.videoHistory,
        [segmentId]: [video, ...(state.videoHistory[segmentId] || [])],
      },
    })),

  setIsGenerating: (isGenerating) => set({ isGenerating }),

  setGenerationProgress: (progress) => set({ generationProgress: progress }),

  setError: (error: string | null) => set({ error }),

  updateSegment: (segmentId, updates) =>
    set((state) => {
      if (!state.schema || !state.schema.segments) return state;
      const segments = state.schema.segments.map((s) =>
        s.id === segmentId ? { ...s, ...updates } : s,
      );
      const newSchema = { ...state.schema, segments };
      return {
        schema: newSchema,
        schemaJson: JSON.stringify(newSchema, null, 2),
      };
    }),

  updateShot: (segmentId, shotIndex, updates) =>
    set((state) => {
      if (!state.schema || !state.schema.segments) return state;
      const segments = state.schema.segments.map((s) => {
        if (s.id === segmentId) {
          const shots = [...(s.shots || [])];
          if (shots[shotIndex]) {
            shots[shotIndex] = { ...shots[shotIndex], ...updates };
          }
          return { ...s, shots };
        }
        return s;
      });
      console.log("updated shots: in segmet", segments);
      const newSchema = { ...state.schema, segments };
      return {
        schema: newSchema,
        schemaJson: JSON.stringify(newSchema, null, 2),
      };
    }),

  deleteSegment: async (segmentId) => {
    const { schema } = get();
    if (!schema?.id) return;

    set((state) => {
      if (!state.schema || !state.schema.segments) return state;

      const newSegments = state.schema.segments.filter((s) => s.id !== segmentId);
      const newSchema = { ...state.schema, segments: newSegments };

      // Also clean up assets and history
      const newFrames = { ...state.frames };
      delete newFrames[segmentId];

      const newVideos = { ...state.videos };
      delete newVideos[segmentId];

      const newFrameHistory = { ...state.frameHistory };
      delete newFrameHistory[segmentId];

      const newVideoHistory = { ...state.videoHistory };
      delete newVideoHistory[segmentId];

      return {
        schema: newSchema,
        schemaJson: JSON.stringify(newSchema, null, 2),
        frames: newFrames,
        videos: newVideos,
        frameHistory: newFrameHistory,
        videoHistory: newVideoHistory,
      };
    });

    // Persist to DB
    try {
      await fetch(`/api/scheme/${schema.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deletedIds: [segmentId],
        }),
      });
    } catch (error) {
      console.error("Failed to persist segment deletion:", error);
      set({ error: "Failed to persist segment deletion" });
    }
  },

  setGeneratingShots: (updater) =>
    set((state) => ({
      generatingShots: typeof updater === "function" ? updater(state.generatingShots) : updater,
    })),

  reset: () => set(initialState),
}));
