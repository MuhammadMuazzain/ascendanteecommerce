import { Core, CoreConfig, BrowserMetadataProvider } from "@openvideo/core";
import { useProjectStore } from "@/stores/project-store";
import type { Design } from "@/types/editor";
import {
  patchProjectStoreTrackSafety,
  prepareDesignForEditor,
  sanitizeTracksArray,
} from "@/lib/design-tracks";

// Initialize browser metadata provider for core
CoreConfig.setMetadataProvider(new BrowserMetadataProvider());

const { canvasSize, fps } = useProjectStore.getState();

export const core = new Core({
  settings: {
    width: canvasSize.width,
    height: canvasSize.height,
    fps,
    duration: 30_000_000,
  },
});

// Legacy alias — remove once all consumers migrate
export const engine = core;
export const projectStore = core.store;
export const playbackController = core.playback;

patchProjectStoreTrackSafety(projectStore);

const originalProjectImport = core.project.import.bind(core.project);
core.project.import = (json: Design | Record<string, unknown>) => {
  originalProjectImport(prepareDesignForEditor(json as Design));
  const state = projectStore.getState();
  const safeTracks = sanitizeTracksArray(state.tracks, state.clips);
  if (safeTracks.length !== (Array.isArray(state.tracks) ? state.tracks.length : 0)) {
    projectStore.setState({ tracks: safeTracks });
  }
};

if (typeof window !== "undefined") {
  (window as any).core = core;
  (window as any).engine = core;
}
