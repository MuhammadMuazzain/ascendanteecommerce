"use client";

import type { ICaptionsControlProps } from "@/components/editor/interface/captions";
import { getCaptionPresetLabel } from "@/lib/caption-presets";

export function CaptionPresetPreview({ preset }: { preset: ICaptionsControlProps }) {
  if (preset.previewUrlDynamic) {
    return (
      <video
        src={preset.previewUrlDynamic}
        autoPlay
        loop
        muted
        playsInline
        className="h-full w-full object-cover"
      />
    );
  }

  if (preset.previewUrlStatic) {
    return <img src={preset.previewUrlStatic} alt={preset.id} className="h-full w-full object-cover" />;
  }

  const stroke = preset.borderWidth ?? 6;
  const fontSize = Math.min(22, (preset.fontSize ?? 64) / 3);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-zinc-900 px-2">
      <span
        className="text-center font-semibold leading-none"
        style={{
          color: preset.color ?? "#ffffff",
          fontSize,
          WebkitTextStroke: `${stroke}px ${preset.borderColor ?? "#000000"}`,
          paintOrder: "stroke fill",
          textTransform: (preset.textTransform as React.CSSProperties["textTransform"]) ?? "none",
        }}
      >
        Aa
      </span>
      <span className="max-w-full truncate text-[8px] font-medium uppercase tracking-wide text-white/70">
        {getCaptionPresetLabel(preset)}
      </span>
    </div>
  );
}
