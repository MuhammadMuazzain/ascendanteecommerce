export interface VerifiedLanguage {
  language: string;
  previewUrl: string;
  accent?: string;
  locale?: string;
}

export interface Voice {
  id: string;
  name: string;
  language: string;
  gender: string;
  accent?: string;
  previewUrl?: string;
  supportedLanguages?: string[];
  verifiedLanguages?: VerifiedLanguage[];
  quality?: string;
  description?: string;
}

export interface VideoStyle {
  id: string;
  previewUrl: string;
  name: string;
}

export interface CaptionStyle {
  id: string;
  name: string;
  font: string;
  preview: string;
  position: string;
}

export interface ScriptBlock {
  id: string;
  scene: number;
  narrator: string;
  visuals: string;
}

export type AspectRatio = "16:9" | "9:16" | "1:1";
export type VisualType = "ai-images" | "ai-videos";
export type CaptionPosition = "auto" | "top" | "center" | "bottom";
export type CaptionSize = "small" | "medium" | "large";
export type MusicGenre = string;
