"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Image as ImageIcon, Video as VideoIcon, Loader2 } from "lucide-react";
import { uploadFile } from "@/lib/upload-utils";
import type { GenerateScriptParams } from "@/lib/generation/constants";
import { authClient } from "@/lib/auth-client";

interface AssetsConfigProps {
  assets: GenerateScriptParams["assets"];
  onAssetsChange: (assets: GenerateScriptParams["assets"]) => void;
}

export function AssetsConfig({ assets = [], onAssetsChange }: AssetsConfigProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { data: session } = authClient.useSession();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const userId = session?.user?.id;
    if (!userId) {
      console.error("User not authenticated");
      return;
    }

    setIsUploading(true);
    const newAssets = [...(assets || [])];

    try {
      for (const file of Array.from(files)) {
        const type = file.type.startsWith("video/") ? "video" : "image";
        const result = await uploadFile(file, userId);

        newAssets.push({
          id: crypto.randomUUID(),
          name: file.name,
          url: result.url,
          type: type as "image" | "video",
        });
      }
      onAssetsChange(newAssets);
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeAsset = (id: string) => {
    onAssetsChange(assets?.filter((a) => a.id !== id));
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm text-foreground">Assets</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="h-9 text-[11px] font-bold gap-1.5 border-border bg-background hover:bg-muted shadow-none rounded-md"
        >
          {isUploading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Upload className="h-3 w-3" />
          )}
          {isUploading ? "Uploading..." : "Upload"}
        </Button>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*,video/*"
          multiple
          onChange={handleFileUpload}
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        {assets?.map((asset) => (
          <div
            key={asset.id}
            className="group relative aspect-square rounded-lg border border-border bg-background overflow-hidden transition-all hover:border-primary/50"
          >
            {asset.type === "image" ? (
              <img src={asset.url} alt={asset.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-black/5">
                <VideoIcon className="h-6 w-6 text-muted-foreground" />
              </div>
            )}

            <button
              type="button"
              onClick={() => removeAsset(asset.id)}
              className="absolute right-1 top-1 rounded-sm bg-black/70 p-1 text-white hover:bg-destructive/90"
              title="Remove asset"
              aria-label={`Remove ${asset.name}`}
            >
              <X className="h-3 w-3" />
            </button>

            <div className="absolute inset-x-0 bottom-0 bg-black/40 px-1 py-0.5 text-[8px] text-white truncate opacity-0 group-hover:opacity-100 transition-opacity">
              {asset.name}
            </div>
          </div>
        ))}

        {!assets?.length && !isUploading && (
          <div className="col-span-3 py-8 flex flex-col items-center justify-center border border-dashed border-border/60 rounded-xl bg-muted/5">
            <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">
              No assets
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
