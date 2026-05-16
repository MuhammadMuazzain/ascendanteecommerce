"use client";
import { Player } from "@/components/player";
import { Header } from "@/components/preview-video/header";
import { Button } from "@/components/ui/button";
import { convertSchemaToDesign } from "@/utils/schema-converter";
import { Compositor, Studio } from "@openvideo/engine-pixi";
import { Pause, Play } from "lucide-react";
import { useState, useEffect, useRef, use } from "react";
import { ExportModal } from "@/components/preview-video/export-modal";
import { useStudioStore } from "@/stores/studio-store";
import * as Sentry from "@sentry/nextjs";
import { usePostHog } from "posthog-js/react";

const defaultSize = {
  width: 1080,
  height: 1920,
};

export default function PlayerPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<Studio | null>(null);
  const { setStudio } = useStudioStore();
  const posthog = usePostHog();

  useEffect(() => {
    Sentry.setTag("page_name", "player-view");
  }, []);
  const [exportOpen, setExportOpen] = useState(false);
  const [generationId, setGenerationId] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentLabel, setCurrentLabel] = useState("0:00");
  const [totalLabel, setTotalLabel] = useState("0:00");

  // Initialize Studio
  useEffect(() => {
    if (!previewCanvasRef.current) return;

    (async () => {
      if (!(await Compositor.isSupported())) {
        console.error("Your browser does not support WebCodecs");
      }
    })();

    previewRef.current = new Studio({
      width: defaultSize.width,
      height: defaultSize.height,
      fps: 30,
      bgColor: "#1C161D",
      canvas: previewCanvasRef.current,
      interactivity: true,
    });

    const onTimeUpdate = (data: { currentTime: number }) => {
      setCurrentLabel(formatTime(data.currentTime));
    };

    const onPlay = (data: { isPlaying: boolean }) => {
      setIsPlaying(data.isPlaying);
    };

    const onPause = (data: { isPlaying: boolean }) => {
      setIsPlaying(data.isPlaying);
    };

    previewRef.current.on("currentTime", onTimeUpdate);
    previewRef.current.on("play", onPlay);
    previewRef.current.on("pause", onPause);

    setStudio(previewRef.current);

    return () => {
      if (previewRef.current) {
        previewRef.current.off("currentTime", onTimeUpdate);
        previewRef.current.off("play", onPlay);
        previewRef.current.off("pause", onPause);
        previewRef.current.destroy();
        previewRef.current = null;
      }
    };
  }, []);

  function formatTime(microseconds: number): string {
    if (!isFinite(microseconds) || microseconds < 0) {
      return "0:00";
    }
    const seconds = microseconds / 1e6;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  const togglePlay = async () => {
    if (!previewRef.current) return;
    if (isPlaying) {
      previewRef.current.pause();
    } else {
      posthog.capture("player_play_clicked", { projectId });
      await previewRef.current.play();
    }
  };

  const loadSchema = async (id: string) => {
    try {
      const response = await fetch(`/api/projects/${id}`);
      if (!response.ok) throw new Error("Failed to fetch project");
      const { project } = await response.json();
      setGenerationId(project.generation_id);

      if (project.generation_output) {
        let scheme = project.generation_output;
        if (typeof scheme === "string") {
          scheme = JSON.parse(scheme);
        }
        const sceneJson = await convertSchemaToDesign(scheme);

        if (previewRef.current) {
          // Filter out clips with empty sources before loading
          const validClips = sceneJson.clips.filter((clipJSON: any) => {
            if (clipJSON.type === "Text" || clipJSON.type === "Caption") {
              return true;
            }
            return clipJSON.src && clipJSON.src.trim() !== "";
          });

          const validJson = { ...sceneJson, clips: validClips };
          await previewRef.current.loadFromJSON(validJson);
          const duration = previewRef.current.getMaxDuration();
          setTotalLabel(formatTime(duration));
        }
      } else {
        console.warn("No scheme found in generation output");
      }
    } catch (error) {
      console.error("Error loading schema:", error);
    }
  };

  useEffect(() => {
    if (projectId) {
      loadSchema(projectId);
    }
  }, [projectId]);

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <Header
        projectId={projectId}
        generationId={generationId}
        onExport={() => setExportOpen(true)}
      />
      <Player canvasRef={previewCanvasRef} />
      <ExportModal open={exportOpen} onOpenChange={setExportOpen} />

      <div className="flex items-center gap-2 h-12 flex-none justify-center bg-background">
        <Button
          variant="ghost"
          size="icon"
          onClick={togglePlay}
          className="hover:bg-primary/10 hover:text-foreground transition-colors"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
        </Button>
        <div className="text-sm font-medium tabular-nums ml-2">
          <span className="text-foreground">{currentLabel}</span>
          <span className="px-1 text-muted-foreground">/</span>
          <span className="text-muted-foreground">{totalLabel}</span>
        </div>
      </div>
    </div>
  );
}
