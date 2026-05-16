"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Video } from "lucide-react";
import { toast } from "sonner";
import {
  generateWanAction,
  generatePixVerseAction,
  generateHailuoAction,
  generateVeoLocalAction,
  generateRunwayAction,
} from "../actions";

// Note: Update version to force reload
export default function VideoPlayground() {
  const [activeTab, setActiveTab] = useState("pixverse");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [params, setParams] = useState({
    prompt: "A cinematic drone shot of a mountain",
    firstFrameUrl: "",
    duration: 5,
    style: "cinematic",
    resolution: "720p",
    aspectRatio: "16:9",
  });

  const handleGenerate = async () => {
    setLoading(true);
    setResult(null);

    try {
      let response: any;
      const payload = { ...params };
      // Note: VideoGenerator methods expect `imageUrl` for img2video.
      // If user doesn't provide URL, it might fail for Wan/Hailuo/PixVerse depending on implementation.

      if (!payload.firstFrameUrl) {
        toast.error("Image URL is required for these models");
        setLoading(false);
        return;
      }

      if (activeTab === "wan") {
        response = await generateWanAction(payload);
      } else if (activeTab === "pixverse") {
        response = await generatePixVerseAction(payload);
      } else if (activeTab === "hailuo") {
        response = await generateHailuoAction(payload);
      } else if (activeTab === "veo") {
        response = await generateVeoLocalAction(payload);
      } else if (activeTab === "runway") {
        response = await generateRunwayAction(payload);
      }

      if (response && response.success && response.url) {
        setResult(response.url);
        toast.success("Video Generated!");
      } else {
        toast.error(response?.error || "Failed");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <h1 className="text-3xl font-bold mb-6">Service Video Generation Playground</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="pixverse">PixVerse</TabsTrigger>
          <TabsTrigger value="wan">Wan 2.1</TabsTrigger>
          <TabsTrigger value="hailuo">Hailuo</TabsTrigger>
          <TabsTrigger value="veo">Veo 3.1</TabsTrigger>
          <TabsTrigger value="runway">Runway</TabsTrigger>
        </TabsList>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Settings (Image-to-Video)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Source Image URL</Label>
                <Input
                  value={params.firstFrameUrl}
                  onChange={(e) => setParams({ ...params, firstFrameUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <Label>Prompt</Label>
                <Textarea
                  value={params.prompt}
                  onChange={(e) => setParams({ ...params, prompt: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Duration (s)</Label>
                {activeTab === "veo" || activeTab === "runway" ? (
                  <Select
                    value={params.duration.toString()}
                    onValueChange={(v) => setParams({ ...params, duration: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {activeTab === "veo" ? (
                        <>
                          <SelectItem value="4">4s</SelectItem>
                          <SelectItem value="6">6s</SelectItem>
                          <SelectItem value="8">8s</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="5">5s</SelectItem>
                          <SelectItem value="8">8s</SelectItem>
                          <SelectItem value="10">10s</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type="number"
                    value={params.duration}
                    onChange={(e) =>
                      setParams({
                        ...params,
                        duration: parseInt(e.target.value),
                      })
                    }
                  />
                )}
              </div>

              {(activeTab === "pixverse" || activeTab === "runway") && (
                <div className="space-y-2">
                  <Label>Aspect Ratio</Label>
                  <Select
                    value={params.aspectRatio}
                    onValueChange={(v) => setParams({ ...params, aspectRatio: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="16:9">16:9</SelectItem>
                      <SelectItem value="9:16">9:16</SelectItem>
                      <SelectItem value="1:1">1:1</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Resolution</Label>
                {activeTab === "pixverse" || activeTab === "veo" || activeTab === "runway" ? (
                  <Select
                    value={params.resolution}
                    onValueChange={(v) => setParams({ ...params, resolution: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="720p">720p</SelectItem>
                      <SelectItem value="1080p">1080p</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input disabled value={activeTab === "hailuo" ? "1080p" : "720p"} />
                )}
              </div>

              <Button className="w-full" onClick={handleGenerate} disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Video className="mr-2 h-4 w-4" />
                )}
                Generate
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Result</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center min-h-[300px] bg-muted/20 p-4 space-y-4">
              {loading && <Loader2 className="h-8 w-8 animate-spin" />}
              {result && !loading && (
                <video src={result} controls className="max-w-full h-auto rounded-md" />
              )}
              {!result && !loading && <span className="text-muted-foreground">No output</span>}
            </CardContent>
          </Card>
        </div>
      </Tabs>
    </div>
  );
}
