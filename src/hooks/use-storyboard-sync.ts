import { useEffect } from "react";
import { core } from "@/lib/project";
import { Segment } from "@/lib/schema-generator/types";

interface UseStoryboardSyncOptions {
  schema: any;
  selectedSegment: Segment | null;
  activeView: "editor" | "storyboard";
}

export function useStoryboardSync({
  schema,
  selectedSegment,
  activeView,
}: UseStoryboardSyncOptions) {
  useEffect(() => {
    // Only sync seek position when in storyboard mode
    if (activeView !== "storyboard") return;
    if (!selectedSegment || !schema?.segments) return;

    const segments: any[] = schema.segments;
    const selectedIndex = segments.findIndex(
      (s: any) => s === selectedSegment || s.id === selectedSegment.id,
    );

    if (selectedIndex < 0) return;

    if (selectedIndex === 0) {
      core.seek(0);
      return;
    }

    let cumulativeUs = 0;
    for (let i = 0; i < selectedIndex; i++) {
      const seg = segments[i];
      const shots: any[] = seg.shots ?? [];
      for (const shot of shots) {
        if (shot.display?.from != null && shot.display?.to != null) {
          cumulativeUs += (shot.display.to - shot.display.from) * 1000;
        } else if (shot.duration != null) {
          cumulativeUs += shot.duration * 1_000_000;
        }
      }
    }

    core.seek(cumulativeUs);
  }, [selectedSegment, schema, activeView]);
}
