import type { ICaptionsControlProps } from "@/components/editor/interface/captions";
import { BUILTIN_CAPTION_PRESETS } from "@/components/editor/constant/caption";

export const CAPTION_PRESET_TIKTOK_MEDIUM_ID = "caption-tiktok-medium";
export const CUSTOM_CAPTION_PRESETS_STORAGE_KEY = "ascendante.custom-caption-presets";

export type SavedCaptionPreset = ICaptionsControlProps & {
  label: string;
  savedAt: number;
};

export function getCaptionPresetLabel(preset: ICaptionsControlProps): string {
  if (preset.label?.trim()) return preset.label.trim();
  return preset.id
    .replace("caption-", "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

export function getCustomCaptionPresets(): SavedCaptionPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_CAPTION_PRESETS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedCaptionPreset[];
    return Array.isArray(parsed) ? parsed.filter((p) => p?.id && p?.label) : [];
  } catch {
    return [];
  }
}

export function saveCustomCaptionPreset(preset: Omit<SavedCaptionPreset, "savedAt" | "isCustom">) {
  const existing = getCustomCaptionPresets().filter((p) => p.id !== preset.id);
  const next: SavedCaptionPreset[] = [
    {
      ...preset,
      isCustom: true,
      savedAt: Date.now(),
    },
    ...existing,
  ];
  localStorage.setItem(CUSTOM_CAPTION_PRESETS_STORAGE_KEY, JSON.stringify(next));
}

export function deleteCustomCaptionPreset(id: string) {
  const next = getCustomCaptionPresets().filter((p) => p.id !== id);
  localStorage.setItem(CUSTOM_CAPTION_PRESETS_STORAGE_KEY, JSON.stringify(next));
}

export function getAllCaptionPresets(): ICaptionsControlProps[] {
  return [...BUILTIN_CAPTION_PRESETS, ...getCustomCaptionPresets()];
}

export function resolveCaptionPresetById(id: string): ICaptionsControlProps | undefined {
  return getAllCaptionPresets().find((p) => p.id === id);
}
