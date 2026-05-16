"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AspectRatioConfig } from "./aspect-ratio-config";
import { VisualsConfig } from "./visuals-config";
import { VoiceModal } from "./voice-modal";
import { MusicModal } from "./music-modal";
import { CaptionsConfig } from "./captions-config";
import type { AspectRatio, Voice } from "@/types/video-generation";
import type { Schema } from "@/lib/schema-generator/types";
import { VideoType, FrameStyle } from "@/utils/enum";
import { Separator } from "@/components/ui/separator";
import { ScriptEditing } from "./script-editing";
import {
  NARRATIVE_VIDEO_STYLES,
  CHARACTER_DRIVEN_VIDEO_STYLES,
  PRODUCT_IMAGE_VIDEO_STYLES,
  PRODUCT_VIDEO_STYLES,
  VIDEO_STYLES,
} from "@/constants/video-styles";
import { AssetsConfig } from "./assets-config";
import { ProductConfig } from "./product-config";
import { AvatarConfig } from "./avatar-config";
import { defaultGenerationParams } from "@/lib/generation/constants";

type CaptionState = NonNullable<Schema["caption"]>;
const DEFAULT_CAPTION: CaptionState = defaultGenerationParams().caption as CaptionState;
const DEFAULT_VOICE_ID = defaultGenerationParams().voice?.id ?? "CwhRBWXzGAHq8TQ4Fs17";

type FlowMode =
  | "narrative-video"
  | "product-video-ad"
  | "product-image-ad"
  | "ugc-video-ad"
  | "fake-ugc-video-ad"
  | "character-driven-ad";

function isEmptyProduct(product?: Schema["product"]): boolean {
  return !product?.name?.trim() && !product?.description?.trim();
}

interface VideoCustomizationProps {
  generationParams: Partial<Schema>;
  setGenerationParams: (
    updates: Partial<Schema> | ((prev: Schema | null) => Partial<Schema>),
  ) => void;
  /** URL mode — used before schema.type is set so UGC sections still render */
  mode?: FlowMode | null;
}

export function VideoCustomization({
  generationParams,
  setGenerationParams,
  mode = null,
}: VideoCustomizationProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const flowType = (generationParams.type ?? mode) as FlowMode | undefined;
  const isRealUGC = flowType === "ugc-video-ad";
  const isFakeUGC = flowType === "fake-ugc-video-ad";
  const isProduct = flowType === "product-video-ad" || flowType === "product-image-ad";
  const isCharacterAd = flowType === "character-driven-ad";
  const isNarrative = !isRealUGC && !isFakeUGC && !isProduct && !isCharacterAd;
  const isProductImageAd = flowType === "product-image-ad";

  const patchSchema = useCallback(
    (updates: Partial<Schema>) => {
      setGenerationParams((prev) => ({ ...(prev ?? {}), ...updates }) as Partial<Schema>);
    },
    [setGenerationParams],
  );

  const styleFromParams = generationParams.visuals?.style;
  const matchedStyle = VIDEO_STYLES.find((s) => s.id === styleFromParams);
  const selectedStyleId =
    (matchedStyle?.id as FrameStyle) ||
    (styleFromParams as FrameStyle) ||
    FrameStyle.Realism;
  const selectedDescription =
    matchedStyle?.description ||
    (typeof styleFromParams === "string" && !matchedStyle ? styleFromParams : "") ||
    VIDEO_STYLES.find((s) => s.id === selectedStyleId)?.description ||
    "";

  const aspectRatio = (generationParams.aspectRatio as AspectRatio) || "9:16";
  const selectedVisualType = generationParams.visuals?.type || VideoType.AI_IMAGES;
  const selectedScriptTone = generationParams.scriptTone || "";
  const selectedVoice =
    generationParams.voice?.id || generationParams.voice?.url || DEFAULT_VOICE_ID;
  const selectedMusic = generationParams.music;
  const caption = useMemo((): CaptionState => {
    const fromSchema = generationParams.caption as CaptionState | undefined;
    if (!fromSchema) return DEFAULT_CAPTION;
    return {
      id: fromSchema.id ?? DEFAULT_CAPTION.id,
      name: fromSchema.name ?? DEFAULT_CAPTION.name,
      position: fromSchema.position ?? DEFAULT_CAPTION.position,
      size: fromSchema.size ?? DEFAULT_CAPTION.size,
    };
  }, [
    generationParams.caption?.id,
    generationParams.caption?.name,
    generationParams.caption?.position,
    generationParams.caption?.size,
  ]);

  const assets = generationParams.assets || [];
  const product = useMemo(
    () => ({
      name: generationParams.product?.name ?? "",
      description: generationParams.product?.description ?? "",
    }),
    [generationParams.product?.name, generationParams.product?.description],
  );
  const avatar = generationParams.avatar;

  // Available Visual Styles
  let availableStyles = NARRATIVE_VIDEO_STYLES;
  if (isCharacterAd) {
    availableStyles = CHARACTER_DRIVEN_VIDEO_STYLES;
  } else if (flowType === "product-image-ad") {
    availableStyles = PRODUCT_IMAGE_VIDEO_STYLES;
  } else if (flowType === "product-video-ad") {
    availableStyles = PRODUCT_VIDEO_STYLES;
  }

  const [voices, setVoices] = useState<Voice[]>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(true);

  useEffect(() => {
    if (!isProductImageAd) return;
    if (generationParams.visuals?.type === VideoType.AI_IMAGES) return;

    patchSchema({
      visuals: {
        type: VideoType.AI_IMAGES,
        style: (generationParams.visuals?.style as string) || selectedStyleId,
      },
    });
  }, [
    isProductImageAd,
    generationParams.visuals?.type,
    generationParams.visuals?.style,
    selectedStyleId,
    patchSchema,
  ]);

  const transformVoices = useCallback((voicesList: any[]): Voice[] => {
    return voicesList.map((voice: any) => {
      const supportedLanguages: string[] = Array.from(
        new Set(
          (voice.verifiedLanguages || []).map((vl: any) => vl.language as string).filter(Boolean),
        ),
      );
      const verifiedLanguages = (voice.verifiedLanguages || [])
        .map((vl: any) => ({
          language: vl.language,
          previewUrl: vl.previewUrl,
          accent: vl.accent,
          locale: vl.locale,
        }))
        .filter((vl: any) => vl.language && vl.previewUrl);
      return {
        id: voice.voiceId,
        name: voice.name,
        language: voice.labels?.language || voice.fineTuning?.language || "en",
        gender: voice.labels?.gender || "unknown",
        accent: voice.labels?.accent || voice.labels?.age || "",
        previewUrl: voice.previewUrl,
        supportedLanguages: supportedLanguages.length > 0 ? supportedLanguages : undefined,
        verifiedLanguages: verifiedLanguages.length > 0 ? verifiedLanguages : undefined,
        quality: voice.highQualityBaseModelIds?.length > 0 ? "High Quality" : "Standard",
        description: voice.description,
      };
    });
  }, []);

  useEffect(() => {
    const fetchVoices = async () => {
      try {
        setIsLoadingVoices(true);
        const response = await fetch("/api/voices", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch voices: ${response.status} ${errorText}`);
        }
        const data = await response.json();
        if (!data || typeof data !== "object") throw new Error("Invalid API response format");
        const voicesList = data.voices || [];
        if (!Array.isArray(voicesList)) throw new Error("Voices data is not an array");
        setVoices(transformVoices(voicesList));
      } catch (error) {
        console.error("Error fetching voices:", error);
      } finally {
        setIsLoadingVoices(false);
      }
    };
    fetchVoices();
  }, [transformVoices]);

  const handleAspectRatioChange = useCallback(
    (ratio: AspectRatio) => patchSchema({ aspectRatio: ratio }),
    [patchSchema],
  );

  const handleCaptionChange = useCallback(
    (updated: CaptionState) => {
      if (
        updated.id === caption.id &&
        updated.name === caption.name &&
        updated.position === caption.position &&
        updated.size === caption.size
      ) {
        return;
      }
      patchSchema({ caption: updated });
    },
    [patchSchema, caption.id, caption.name, caption.position, caption.size],
  );

  const handleAssetsChange = useCallback(
    (next: Schema["assets"]) => patchSchema({ assets: next }),
    [patchSchema],
  );

  const handleProductChange = useCallback(
    (next: { name: string; description: string }) => {
      patchSchema({ product: isEmptyProduct(next) ? undefined : next });
    },
    [patchSchema],
  );

  const handleAvatarChange = useCallback(
    (next: Schema["avatar"]) => patchSchema({ avatar: next }),
    [patchSchema],
  );

  const handleVisualTypeChange = useCallback(
    (type: VideoType) => {
      patchSchema({ visuals: { type, style: selectedStyleId } });
    },
    [patchSchema, selectedStyleId],
  );

  const handleStyleIdChange = useCallback(
    (styleId: FrameStyle) => {
      patchSchema({ visuals: { type: selectedVisualType, style: styleId } });
    },
    [patchSchema, selectedVisualType],
  );

  const handleStyleDescriptionChange = useCallback(
    (_description: string) => {
      patchSchema({ visuals: { type: selectedVisualType, style: selectedStyleId } });
    },
    [patchSchema, selectedVisualType, selectedStyleId],
  );

  const handleScriptToneChange = useCallback(
    (tone: string) => patchSchema({ scriptTone: tone }),
    [patchSchema],
  );

  const handleVoiceChange = (voiceId: string) => {
    if (voiceId.startsWith("http") || voiceId.startsWith("blob:")) {
      patchSchema({
        voice: {
          name: "Custom Voice",
          url: voiceId,
        },
      });
      return;
    }

    const selectedVoiceObj = voices.find((voice) => voice.id === voiceId);
    if (selectedVoiceObj) {
      patchSchema({
        voice: {
          id: selectedVoiceObj.id,
          name: selectedVoiceObj.name,
        },
      });
    }
  };

  const handleMusicChange = (music: { id: string; url: string }) => {
    patchSchema({ music });
  };

  return (
    <div className="flex-1 flex flex-col w-full bg-card">
      <div className="relative flex h-full w-full">
        <ScrollArea
          ref={scrollAreaRef}
          className="w-full h-[calc(100vh-64px)] md:h-[calc(100vh-64px)]"
        >
          <div className="text-sm">
            <ScriptEditing />
            <Separator />

            <AspectRatioConfig
              aspectRatio={aspectRatio}
              onAspectRatioChange={handleAspectRatioChange}
            />
            <Separator />

            {(isRealUGC || isFakeUGC || isProduct || isCharacterAd) && (
              <>
                <AssetsConfig assets={assets} onAssetsChange={handleAssetsChange} />
                <Separator />
              </>
            )}

            {(isRealUGC || isFakeUGC || isProduct || isCharacterAd) && (
              <>
                <ProductConfig product={product} onProductChange={handleProductChange} />
                <Separator />
              </>
            )}

            {isRealUGC && (
              <>
                <AvatarConfig
                  selectedAvatar={avatar}
                  onAvatarChange={handleAvatarChange}
                  aspectRatio={aspectRatio}
                />
                <Separator />
              </>
            )}

            {(isNarrative || isCharacterAd || isProduct) && (
              <>
                <VisualsConfig
                  selectedVisualType={selectedVisualType}
                  onVisualTypeChange={handleVisualTypeChange}
                  selectedStyle={selectedDescription}
                  onStyleChange={handleStyleDescriptionChange}
                  selectedStyleId={selectedStyleId}
                  onStyleIdChange={handleStyleIdChange}
                  scriptTone={selectedScriptTone}
                  onScriptToneChange={handleScriptToneChange}
                  availableStyles={availableStyles}
                  freezeVisualType={isProductImageAd ? VideoType.AI_IMAGES : undefined}
                />
                <Separator />
              </>
            )}

            {(isNarrative || isProduct || isFakeUGC || isRealUGC) && (
              <>
                <VoiceModal
                  selectedVoice={selectedVoice}
                  onVoiceChange={handleVoiceChange}
                  voices={voices}
                  isLoadingVoices={isLoadingVoices}
                />
                <Separator />
                <MusicModal selectedMusic={selectedMusic} onMusicChange={handleMusicChange} />
                <Separator />
              </>
            )}

            <CaptionsConfig caption={caption} onCaptionChange={handleCaptionChange} />
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
