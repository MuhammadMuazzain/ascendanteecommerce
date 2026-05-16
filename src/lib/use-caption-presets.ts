"use client";

import { useCallback, useEffect, useState } from "react";
import type { ICaptionsControlProps } from "@/components/editor/interface/captions";
import { BUILTIN_CAPTION_PRESETS } from "@/components/editor/constant/caption";
import { getAllCaptionPresets } from "@/lib/caption-presets";

/** Built-in + saved presets; loads localStorage only after mount. */
export function useCaptionPresetsList() {
  const [presets, setPresets] = useState<ICaptionsControlProps[]>(BUILTIN_CAPTION_PRESETS);

  useEffect(() => {
    setPresets(getAllCaptionPresets());
  }, []);

  const reloadPresets = useCallback(() => {
    setPresets(getAllCaptionPresets());
  }, []);

  return { presets, reloadPresets };
}
