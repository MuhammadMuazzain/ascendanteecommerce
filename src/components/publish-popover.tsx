"use client";

import { useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// =============YOUTUBE====================//
export enum PrivacyStatus {
  PUBLIC = "public",
  PRIVATE = "private",
  UNLISTED = "unlisted",
}

// =============TIK TOK====================//
export enum PrivacyLevel {
  PUBLIC_TO_EVERYONE = "PUBLIC_TO_EVERYONE",
  MUTUAL_FOLLOW_FRIENDS = "MUTUAL_FOLLOW_FRIENDS",
  SELF_ONLY = "SELF_ONLY",
}

export enum TikTokSource {
  FILE_UPLOAD = "FILE_UPLOAD",
  PULL_FROM_URL = "PULL_FROM_URL",
}

// =============INSTAGRAM===================//
export enum IGPublishType {
  REELS = "REELS",
  STORIES = "STORIES",
}

export interface PublishPopoverProps {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  children: React.ReactNode;
  videoUrl: string | null; // <-- video URL passed from parent
}

export function PublishPopover({ open, onOpenChange, children, videoUrl }: PublishPopoverProps) {
  const [platform, setPlatform] = useState<"youtube" | "tiktok" | "instagram" | null>(null);
  const [socials, setSocials] = useState({
    instagram: false,
    tiktok: false,
    youtube: false,
  });

  /* ----------------------- YOUTUBE STATES ----------------------- */
  const [youtubeTitle, setYTTitle] = useState("");
  const [youtubeDescription, setYTDescription] = useState("");
  const [youtubeTags, setYTTags] = useState("");
  const [youtubePrivacy, setYTPrivacy] = useState<PrivacyStatus>(PrivacyStatus.PRIVATE);
  const [youtubeCategory, setYTCategory] = useState("");
  const [youtubeThumb, setYTThumb] = useState("");

  /* ----------------------- TIKTOK STATES ----------------------- */
  const [tiktokTitle, setTTTitle] = useState("");
  const [tiktokPrivacy, setTTPrivacy] = useState<PrivacyLevel>(PrivacyLevel.SELF_ONLY);
  const [disableDuet, setDisableDuet] = useState(false);
  const [disableComment, setDisableComment] = useState(false);
  const [disableStitch, setDisableStitch] = useState(false);
  const [brandContentToggle, setBrandContentToggle] = useState(false);
  const [brandOrganicToggle, setBrandOrganicToggle] = useState(false);
  const [tiktokTimestamp, setTTTimestamp] = useState(1000);

  /* ----------------------- INSTAGRAM STATES ----------------------- */
  const [instagramCaption, setIGCaption] = useState("");
  const [instagramType, setIGType] = useState<IGPublishType>(IGPublishType.REELS);

  useEffect(() => {
    const loadSocials = async () => {
      try {
        const res = await fetch("/api/socials");
        const data = await res.json();
        setSocials(data.socials);
        //console.log({ instagram: false, tiktok: false, youtube: false })
      } catch {}
    };
    loadSocials();
  }, []);

  /* ----------------------------------------------------------------
     SUBMIT HANDLER
     Builds JSON payload depending on selected platform
  ---------------------------------------------------------------- */
  const submit = async () => {
    if (!videoUrl) return; // must have a video URL

    let data: any = {};

    /* ------------------ YouTube Payload ----------------- */
    if (platform === "youtube") {
      data = {
        url: videoUrl, // Source URL of the video file to download and upload
        title: youtubeTitle, // Video headline (max 100 characters)
        description: youtubeDescription || undefined, // Text displayed below the video player (SEO friendly)

        // Search keywords. Converts "tag1, tag2" string into an array of strings.
        tags: youtubeTags ? youtubeTags.split(",").map((t) => t.trim()) : undefined,

        // Visibility: 'public' (everyone), 'private' (only you), or 'unlisted' (accessible via link only)
        privacyStatus: youtubePrivacy,

        // Numeric string ID for genre (e.g., '10'=Music, '20'=Gaming, '28'=Science & Tech). Default is usually '22' or '28'.
        categoryId: youtubeCategory || undefined,

        // Optional: URL for a custom cover image (overrides the auto-generated frame)
        thumbUrl: youtubeThumb || undefined,
      };
    }

    /* ------------------- TikTok Payload ------------------ */
    if (platform === "tiktok") {
      data = {
        url: videoUrl, // Source URL of the video file
        title: tiktokTitle, // Post caption (text, hashtags, and mentions)
        privacyLevel: tiktokPrivacy, // Visibility scope: PUBLIC_TO_EVERYONE, MUTUAL_FOLLOW_FRIENDS, or SELF_ONLY(TEST MODE)

        // Interaction settings (Logic: true = feature is turned OFF)
        // Duet: Split-screen video. If true, users cannot film a side-by-side reaction to this video.
        disableDuet: disableDuet || undefined, // If true, users cannot Duet this video
        disableComment: disableComment || undefined, // If true, comments are disabled
        // Stitch: Clip & Integrate. If true, users cannot clip part of this video to start their own video.
        disableStitch: disableStitch || undefined, // If true, users cannot Stitch this video

        // Commercial content disclosures
        brandContentToggle: brandContentToggle || undefined, // If true, adds "Paid Partnership" label (Ads/Sponsors)
        brandOrganicToggle: brandOrganicToggle || undefined, // If true, marks as organic commercial content (Self-promotion)

        videoCoverTimestampMs: tiktokTimestamp, // Time in milliseconds to select the video thumbnail/cover
      };
    }

    /* ------------------ Instagram Payload ---------------- */
    if (platform === "instagram") {
      data = {
        url: videoUrl,
        caption: instagramCaption || undefined, //desciption video
        type: instagramType,
      };
    }

    /* ------------- Send to backend ------------- */
    await fetch(`/api/socials/${platform}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    // Close modal after sending
    onOpenChange(false);
    setPlatform(null);
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      {/* Trigger comes from parent */}
      <PopoverTrigger asChild>{children}</PopoverTrigger>

      {/* Small Canva-style popup */}
      <PopoverContent className="w-[330px] p-4 space-y-4" align="end">
        {/* If no platform selected, show options */}
        {!platform && (
          <div className="space-y-2">
            <p className="font-semibold text-sm">Select platform</p>
            <Button
              className="w-full"
              disabled={socials?.youtube}
              onClick={() => setPlatform("youtube")}
            >
              YouTube
            </Button>
            <Button
              className="w-full"
              disabled={socials?.tiktok}
              onClick={() => setPlatform("tiktok")}
            >
              TikTok
            </Button>
            <Button
              className="w-full"
              disabled={socials?.instagram}
              onClick={() => setPlatform("instagram")}
            >
              Instagram
            </Button>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* ------------------ YOUTUBE FORM -------------------- */}
        {/* ---------------------------------------------------- */}
        {platform === "youtube" && (
          <div className="space-y-3">
            <Label>Title *</Label>
            <Input value={youtubeTitle} onChange={(e) => setYTTitle(e.target.value)} />

            <Label>Description</Label>
            <Input value={youtubeDescription} onChange={(e) => setYTDescription(e.target.value)} />

            <Label>Tags (comma separated)</Label>
            <Input value={youtubeTags} onChange={(e) => setYTTags(e.target.value)} />

            <Label>Privacy</Label>
            <select
              className="border p-2 rounded w-full"
              value={youtubePrivacy}
              onChange={(e) => setYTPrivacy(e.target.value as PrivacyStatus)}
            >
              <option value="private" className="text-black">
                Private
              </option>
              <option value="public" className="text-black">
                Public
              </option>
              <option value="unlisted" className="text-black">
                Unlisted
              </option>
            </select>

            <Label>Category</Label>
            <Input value={youtubeCategory} onChange={(e) => setYTCategory(e.target.value)} />

            <Label>Thumbnail URL</Label>
            <Input value={youtubeThumb} onChange={(e) => setYTThumb(e.target.value)} />

            <Button className="w-full" onClick={submit}>
              Publish to YouTube
            </Button>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* ------------------- TIKTOK FORM -------------------- */}
        {/* ---------------------------------------------------- */}
        {platform === "tiktok" && (
          <div className="space-y-3">
            <Label>Title *</Label>
            <Input value={tiktokTitle} onChange={(e) => setTTTitle(e.target.value)} />

            <Label>Visibility</Label>
            <select
              className="border p-2 rounded w-full"
              value={tiktokPrivacy}
              onChange={(e) => setTTPrivacy(e.target.value as PrivacyLevel)}
            >
              <option value="SELF_ONLY" className="text-black">
                Self Only
              </option>
              <option value="PUBLIC_TO_EVERYONE" className="text-black">
                Public
              </option>
              <option value="MUTUAL_FOLLOW_FRIENDS" className="text-black">
                Mutual Friends
              </option>
            </select>

            {/* Toggles */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={disableDuet}
                onChange={(e) => setDisableDuet(e.target.checked)}
              />
              <Label>Disable Duet</Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={disableComment}
                onChange={(e) => setDisableComment(e.target.checked)}
              />
              <Label>Disable Comments</Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={disableStitch}
                onChange={(e) => setDisableStitch(e.target.checked)}
              />
              <Label>Disable Stitch</Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={brandContentToggle}
                onChange={(e) => setBrandContentToggle(e.target.checked)}
              />
              <Label>Is sponsored</Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={brandOrganicToggle}
                onChange={(e) => setBrandOrganicToggle(e.target.checked)}
              />
              <Label>Is brand promotion</Label>
            </div>

            <Label>Cover Timestamp (ms)</Label>
            <Input
              type="number"
              value={tiktokTimestamp}
              onChange={(e) => setTTTimestamp(Number(e.target.value))}
            />

            <Button className="w-full" onClick={submit}>
              Publish to TikTok
            </Button>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* ---------------- INSTAGRAM FORM -------------------- */}
        {/* ---------------------------------------------------- */}
        {platform === "instagram" && (
          <div className="space-y-3">
            <Label>Description</Label>
            <Input value={instagramCaption} onChange={(e) => setIGCaption(e.target.value)} />

            <Label>Type</Label>
            <select
              className="border p-2 rounded w-full"
              value={instagramType}
              onChange={(e) => setIGType(e.target.value as IGPublishType)}
            >
              <option value="REELS" className="text-black">
                Reels
              </option>
              <option value="STORIES" className="text-black">
                Stories
              </option>
            </select>

            <Button className="w-full" onClick={submit}>
              Publish to Instagram
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
