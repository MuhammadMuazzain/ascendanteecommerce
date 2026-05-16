"use client";

import { create } from "zustand";

type RenderStatus = "pending" | "processing" | "complete" | "error";

export interface RenderJob {
  id: string;
  progress: number;
  message: string;
  status: RenderStatus;
  publicUrl?: string;
  createdAt: number;
}

interface StartRenderParams {
  design: unknown;
  size: { width: number; height: number };
  exportSettings: { quality: string; fps: number };
}

interface RenderStoreState {
  renders: RenderJob[];
  currentRenderId: string | null;
  isRendering: boolean;
  renderProgress: number;
  renderMessage: string;
  startRender: (params: StartRenderParams) => Promise<string | null>;
  setRenderProgress: (id: string, progress: number, message?: string) => void;
  completeRender: (options: { id: string; publicUrl?: string }) => void;
  failRender: (options: { id: string; message?: string }) => void;
  setCurrentRenderId: (id: string | null) => void;
  addRenderMessage: (message: string) => void;
}

export const useRenderStore = create<RenderStoreState>((set, get) => ({
  renders: [],
  currentRenderId: null,
  isRendering: false,
  renderProgress: 0,
  renderMessage: "",

  startRender: async ({ design, size, exportSettings }: StartRenderParams) => {
    try {
      set({
        isRendering: true,
        renderProgress: 0,
        renderMessage: "Starting render...",
      });

      const response = await fetch("/api/render", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          design,
          size,
          exportSettings,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit export request.");
      }

      const jobInfo = await response.json();
      const renderId: string | undefined = jobInfo?.renderId;

      if (!renderId) {
        throw new Error("Render ID missing in response.");
      }

      const job: RenderJob = {
        id: renderId,
        progress: 0,
        message: "Preparing render...",
        status: "pending",
        createdAt: Date.now(),
      };

      set((state) => ({
        renders: [job, ...state.renders],
        currentRenderId: renderId,
      }));

      return renderId;
    } catch (error) {
      console.error("Render error:", error);
      set({
        isRendering: false,
        renderProgress: 0,
        renderMessage: "Failed to start render",
      });
      return null;
    }
  },

  setRenderProgress: (id, progress, message) => {
    set((state) => ({
      renderProgress: state.currentRenderId === id ? progress : state.renderProgress,
      renderMessage:
        state.currentRenderId === id ? (message ?? state.renderMessage) : state.renderMessage,
      renders: state.renders.map((render) =>
        render.id === id
          ? {
              ...render,
              progress,
              message: message ?? render.message,
              status: "processing",
            }
          : render,
      ),
    }));
  },

  completeRender: ({ id, publicUrl }) => {
    set((state) => ({
      isRendering: false,
      renderProgress: 100,
      renderMessage: "Render complete",
      currentRenderId: state.currentRenderId === id ? null : state.currentRenderId,
      renders: state.renders.map((render) =>
        render.id === id
          ? {
              ...render,
              progress: 100,
              message: "Render complete",
              status: "complete",
              publicUrl: publicUrl ?? render.publicUrl,
            }
          : render,
      ),
    }));
  },

  failRender: ({ id, message }) => {
    set((state) => ({
      isRendering: false,
      renderMessage: message ?? "Render failed",
      currentRenderId: state.currentRenderId === id ? null : state.currentRenderId,
      renders: state.renders.map((render) =>
        render.id === id
          ? {
              ...render,
              status: "error",
              message: message ?? "Render failed",
            }
          : render,
      ),
    }));
  },

  setCurrentRenderId: (id) => {
    set({ currentRenderId: id });
  },

  addRenderMessage: (message) => {
    set({ renderMessage: message });
  },
}));
