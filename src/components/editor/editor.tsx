"use client";
import { useState, useEffect } from "react";
import { MediaPanel } from "@/components/editor/media-panel";
import { CanvasPanel } from "@/components/editor/canvas-panel";
import Timeline from "@/components/editor/timeline";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { usePanelStore } from "@/stores/panel-store";
import Header from "@/components/editor/header";
import { Loading } from "@/components/editor/loading";
import FloatingControl from "@/components/editor/floating-controls/floating-control";
import { Compositor } from "@openvideo/engine-pixi";
import { WebCodecsUnsupportedModal } from "@/components/editor/webcodecs-unsupported-modal";
import Assistant from "./assistant/assistant";
import { Design } from "@/types/editor";
import { core } from "@/lib/project";
import { prepareDesignForEditor } from "@/lib/design-tracks";
import { registerEditorInactivityHandler } from "@/lib/editor-playback";
import { useStudioStore } from "@/stores/studio-store";

export default function Editor({
  initialDesign,
}: {
  isDataLoading?: boolean;
  initialDesign?: Design;
}) {
  const {
    toolsPanel,
    copilotPanel,
    mainContent,
    timeline,
    setToolsPanel,
    setCopilotPanel,
    setMainContent,
    setTimeline,
    isCopilotVisible,
  } = usePanelStore();

  const [isReady, setIsReady] = useState(false);
  const [isWebCodecsSupported, setIsWebCodecsSupported] = useState(true);
  const studio = useStudioStore((s) => s.studio);

  // Import only after Studio + Pixi renderer exist (captions/images need setRenderer).
  useEffect(() => {
    if (!isReady || !initialDesign || !studio) return;

    let cancelled = false;

    const load = async () => {
      await studio.ready;
      if (cancelled) return;
      core.project.import(prepareDesignForEditor(initialDesign));
      core.store.getState().recalculateDuration();
      await studio.seek(core.store.getState().currentTime);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [isReady, initialDesign, studio]);

  useEffect(() => {
    const checkSupport = async () => {
      const isSupported = await Compositor.isSupported();
      setIsWebCodecsSupported(isSupported);
    };
    checkSupport();
  }, []);

  useEffect(() => registerEditorInactivityHandler(), []);

  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden">
      {!isReady && (
        <div className="absolute inset-0 z-100">
          <Loading />
        </div>
      )}
      <Header />
      <div className="flex-1 min-h-0 min-w-0">
        <ResizablePanelGroup direction="horizontal" className="h-full w-full gap-0">
          {/* Left Column: Media Panel */}
          <ResizablePanel
            defaultSize={toolsPanel}
            minSize={15}
            maxSize={40}
            onResize={setToolsPanel}
            className="max-w-7xl relative overflow-visible! bg-card min-w-0"
          >
            <MediaPanel />
            <FloatingControl />
          </ResizablePanel>

          <ResizableHandle className="bg-border/90" />

          {/* Middle Column: Preview + Timeline */}
          <ResizablePanel
            defaultSize={isCopilotVisible ? 100 - copilotPanel - toolsPanel : 100 - toolsPanel}
            minSize={40}
            className="min-w-0 min-h-0"
          >
            <ResizablePanelGroup direction="vertical" className="h-full w-full gap-0">
              {/* Canvas Panel */}
              <ResizablePanel
                defaultSize={mainContent}
                minSize={30}
                maxSize={85}
                onResize={setMainContent}
                className="min-h-0"
              >
                <CanvasPanel
                  onReady={() => {
                    setIsReady(true);
                  }}
                />
              </ResizablePanel>

              <ResizableHandle className="bg-border/90" />

              {/* Timeline Panel */}
              <ResizablePanel
                defaultSize={timeline}
                minSize={15}
                maxSize={70}
                onResize={setTimeline}
                className="min-h-0"
              >
                <Timeline />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
          {isCopilotVisible && (
            <>
              <ResizableHandle className="bg-border/90" />
              {/* Right Column: Chat Copilot */}
              <ResizablePanel
                defaultSize={copilotPanel}
                minSize={15}
                maxSize={40}
                onResize={setCopilotPanel}
                className="max-w-4xl min-w-[360px] relative overflow-visible! bg-card min-w-0"
              >
                {/* Chat copilot */}
                <Assistant />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>

      {/* WebCodecs Support Check Modal */}
      <WebCodecsUnsupportedModal open={!isWebCodecsSupported} />
    </div>
  );
}
