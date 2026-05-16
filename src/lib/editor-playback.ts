import { core, projectStore } from "@/lib/project";
import { useStudioStore } from "@/stores/studio-store";

/**
 * Studio drives preview/audio; core store drives the timeline UI.
 * Do not call core.play() while studio is playing — that starts a second RAF loop.
 */
let playbackCommandGuard = false;

function setStorePlaying(isPlaying: boolean) {
  if (projectStore.getState().isPlaying === isPlaying) return;
  if (playbackCommandGuard) return;

  playbackCommandGuard = true;
  try {
    projectStore.getState().setIsPlaying(isPlaying);
  } finally {
    playbackCommandGuard = false;
  }
}

export async function startEditorPlayback(): Promise<void> {
  const { studio } = useStudioStore.getState();
  if (!studio) return;

  core.pause();
  await studio.ready;
  await studio.play();
  setStorePlaying(true);
}

export function stopEditorPlayback(): void {
  const { studio } = useStudioStore.getState();
  studio?.pause();
  core.pause();
}

export async function toggleEditorPlayback(): Promise<void> {
  if (projectStore.getState().isPlaying) {
    stopEditorPlayback();
  } else {
    await startEditorPlayback();
  }
}

export async function seekEditor(timeUs: number): Promise<void> {
  if (projectStore.getState().isPlaying) {
    stopEditorPlayback();
  }

  const { studio } = useStudioStore.getState();
  core.seek(timeUs);
  if (studio) {
    await studio.ready;
    await studio.seek(timeUs);
  }
}

/** Pause preview when tab is hidden — reduces WebCodecs "Codec reclaimed due to inactivity" errors. */
export function registerEditorInactivityHandler(): () => void {
  if (typeof document === "undefined") return () => {};

  const onVisibility = () => {
    if (document.hidden) {
      stopEditorPlayback();
    }
  };

  document.addEventListener("visibilitychange", onVisibility);
  return () => document.removeEventListener("visibilitychange", onVisibility);
}
