"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Check, Video, AudioLines } from "lucide-react";
//import { lipSyncAction } from '../actions';
import { toast } from "sonner";

export default function LipSyncPlayground() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [audioUrl, setAudioUrl] = useState("");

  const handleGenerate = async () => {
    if (!videoUrl || !audioUrl) {
      toast.error("Please provide both video and audio URLs");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      //const response = await lipSyncAction({  videoUrl,  audioUrl,});
      const response: any = null;

      if (response.success && response.url) {
        setResult(response.url);
        toast.success("Lip Sync generated!");
      } else {
        toast.error(response.error || "Failed to generate lip sync");
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Lip Sync Playground</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>Provide video/image and audio URLs to sync</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Video className="h-4 w-4" />
                Target Video/Image URL
              </Label>
              <Input
                placeholder="https://example.com/video.mp4"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <AudioLines className="h-4 w-4" />
                Audio URL
              </Label>
              <Input
                placeholder="https://example.com/audio.mp3"
                value={audioUrl}
                onChange={(e) => setAudioUrl(e.target.value)}
              />
            </div>

            <Button className="w-full" onClick={handleGenerate} disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Generate Lip Sync
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center min-h-[300px] bg-muted/20 rounded-md">
            {loading && (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm text-muted-foreground italic">
                  Polling API (can take up to 5 mins)...
                </p>
              </div>
            )}
            {result && !loading && (
              <video src={result} controls className="max-w-full h-auto rounded-md shadow-lg" />
            )}
            {!result && !loading && (
              <span className="text-muted-foreground">No output generated</span>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
