import { useState, useEffect } from "react";
import { useSchemaStore, GeneratedAsset } from "@/stores/schema-store";
import { nanoid } from "nanoid";
import { Segment } from "@/lib/schema-generator/types";

export function useStoryboardEditor() {
  const {
    schema,
    setSchema,
    frames,
    videos,
    updateFrame,
    updateVideo,
    updateShot,
    deleteSegmentAsset,
    deleteSegment,
    updateSchema,
    updateSegment,
  } = useSchemaStore();

  const [editMode, setEditMode] = useState(false);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);

  // Ensure all segments and shots have unique IDs
  useEffect(() => {
    if (!schema?.segments) return;
    let changed = false;

    const updatedSegments = schema.segments.map((s, idx) => {
      let segmentChanged = false;
      const segmentId = s.id || `seg-${idx}-${nanoid(5)}`;
      if (segmentId !== s.id) segmentChanged = true;

      const updatedShots = s.shots?.map((shot, sIdx) => {
        const shotId = shot.id || `shot-${idx}-${sIdx}-${nanoid(5)}`;
        if (shotId !== shot.id) {
          segmentChanged = true;
          return { ...shot, id: shotId };
        }
        return shot;
      });

      if (segmentChanged) {
        changed = true;
        return { ...s, id: segmentId, shots: updatedShots };
      }
      return s;
    });

    if (changed) {
      setSchema({ ...schema, segments: updatedSegments });
    }
  }, [schema?.segments, setSchema, schema]);

  // Auto-select first segment
  useEffect(() => {
    if (schema?.segments?.length && !selectedSegmentId) {
      setSelectedSegmentId(schema.segments[0].id);
    }
  }, [schema?.segments, selectedSegmentId]);

  const handleSelectSegment = (id: string) => setSelectedSegmentId(id);

  const handleDeleteSegment = async (id: string) => {
    await deleteSegment(id);
    if (selectedSegmentId === id) {
      const remaining = schema?.segments?.filter((s) => s.id !== id) || [];
      setSelectedSegmentId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const handleDeleteAsset = async (asset: GeneratedAsset) => {
    if (!selectedSegmentId) return;
    await deleteSegmentAsset(selectedSegmentId, asset.id);
  };

  const handleSegmentUpdate = (updates: Partial<Segment>) => {
    if (!schema?.segments || !selectedSegmentId) return;
    const newSegments = schema.segments.map((seg) =>
      seg.id === selectedSegmentId ? { ...seg, ...updates } : seg,
    );
    setSchema({ ...schema, segments: newSegments });
  };

  const selectedSegment = schema?.segments?.find((s) => s.id === selectedSegmentId);
  const selectedFrame =
    selectedSegmentId && frames && frames[selectedSegmentId]
      ? frames[selectedSegmentId]
      : selectedSegment?.shots?.find((s) => s.imageUrl)?.imageUrl
        ? {
            segmentId: selectedSegmentId!,
            url: selectedSegment.shots.find((s) => s.imageUrl)!.imageUrl!,
            prompt: "",
          }
        : undefined;

  const selectedVideo =
    selectedSegmentId && videos && videos[selectedSegmentId]
      ? videos[selectedSegmentId]
      : selectedSegment?.shots?.find((s) => s.videoUrl)?.videoUrl
        ? {
            segmentId: selectedSegmentId!,
            url: selectedSegment.shots.find((s) => s.videoUrl)!.videoUrl!,
            prompt: "",
          }
        : undefined;

  return {
    schema,
    frames,
    videos,
    selectedSegmentId,
    selectedSegment,
    selectedFrame,
    selectedVideo,
    editMode,
    setEditMode,
    handleSelectSegment,
    handleDeleteSegment,
    handleDeleteAsset,
    handleSegmentUpdate,
    updateFrame,
    updateVideo,
    updateShot,
    updateSchema,
    updateSegment,
  };
}
