"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Video, Download, Upload, Trash2, Maximize } from "lucide-react";

export default function VideoGenerationPlayground() {
  const [activeTab, setActiveTab] = useState<"text-to-video" | "image-to-video">("text-to-video");
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("veo3");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  // Image to Video specific
  const [imageUrl, setImageUrl] = useState("");

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    if (activeTab === "image-to-video" && !imageUrl.trim()) {
      toast.error("Please enter an image URL");
      return;
    }

    setIsGenerating(true);
    setVideoUrls([]);
    setTaskId(null);
    setStatus("Submitting task...");

    try {
      const endpoint =
        activeTab === "text-to-video" ? "/api/kie/text-to-video" : "/api/kie/image-to-video";

      const payload: any = {
        prompt,
        model,
        aspect_ratio: aspectRatio,
      };

      if (activeTab === "image-to-video") {
        payload.imageUrls = [imageUrl];
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.msg || "Generation failed");
      }

      const newTaskId = data.data.taskId;
      setTaskId(newTaskId);
      toast.success("Video generation started!");
      pollStatus(newTaskId);
    } catch (error: any) {
      console.error("Error generating video:", error);
      toast.error(error.message || "Failed to start generation");
      setIsGenerating(false);
      setStatus(null);
    }
  };

  const pollStatus = async (id: string) => {
    setStatus("Generating video (this usually takes 2-5 minutes)...");
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/kie/status?taskId=${id}&type=veo`);
        const result = await response.json();

        if (!response.ok) {
          clearInterval(interval);
          setIsGenerating(false);
          setStatus("Failed");
          toast.error(result.msg || "Status check failed");
          return;
        }

        const { successFlag, resultUrls } = result.data;

        // successFlag: 0=Generating, 1=Success, 2=Failed, 3=Generation Failed
        if (successFlag === 1) {
          clearInterval(interval);
          setIsGenerating(false);
          setStatus("Success");
          setVideoUrls(JSON.parse(resultUrls));
          toast.success("Video generated successfully!");
        } else if (successFlag === 2 || successFlag === 3) {
          clearInterval(interval);
          setIsGenerating(false);
          setStatus("Failed");
          toast.error("Generation failed");
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 15000); // Poll every 15 seconds for video as it takes longer
  };

  const handleGetHD = async () => {
    if (!taskId) return;

    toast.info("Requesting HD version...");
    try {
      const response = await fetch(`/api/kie/hd?taskId=${taskId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.msg || "Failed to get HD video");
      }

      toast.success("HD video is being processed. Check back in a few minutes.");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Video Generation Playground</h1>
        <p className="text-muted-foreground">Create high-quality AI videos using Kie Veo3 model</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-6">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="text-to-video">Text to Video</TabsTrigger>
              <TabsTrigger value="image-to-video">Image to Video</TabsTrigger>
            </TabsList>

            <Card className="mt-4">
              <CardHeader>
                <CardTitle>
                  {activeTab === "text-to-video" ? "Video from Text" : "Video from Image"}
                </CardTitle>
                <CardDescription>
                  {activeTab === "text-to-video"
                    ? "Use a descriptive prompt to generate a 8-second video"
                    : "Bring a static image to life with AI animation"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {activeTab === "image-to-video" && (
                  <div className="space-y-2">
                    <Label htmlFor="imageUrl">Image URL</Label>
                    <Input
                      id="imageUrl"
                      placeholder="https://example.com/image.jpg"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Ensure the image URL is publicly accessible
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="prompt">Prompt</Label>
                  <Textarea
                    id="prompt"
                    placeholder={
                      activeTab === "text-to-video"
                        ? "A cinematic shot of a sunset over the ocean, waves crashing on rocks, 4k..."
                        : "Make the person in the image wave their hand and smile..."
                    }
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Model</Label>
                    <Select value={model} onValueChange={setModel}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="veo3">Veo3 (Quality)</SelectItem>
                        <SelectItem value="veo3_fast">Veo3 Fast (Speed)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Aspect Ratio</Label>
                    <Select value={aspectRatio} onValueChange={setAspectRatio}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="16:9">16:9</SelectItem>
                        <SelectItem value="9:16">9:16 (Coming Soon)</SelectItem>
                        <SelectItem value="1:1">1:1 (Coming Soon)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  disabled={isGenerating || !prompt}
                  onClick={handleGenerate}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Video className="mr-2 h-4 w-4" />
                      Generate Video
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </Tabs>
        </div>

        <div className="lg:col-span-7">
          <Card className="h-full min-h-[500px] flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Result</CardTitle>
                <CardDescription>{status || "Generated video will appear here"}</CardDescription>
              </div>
              {status === "Success" && taskId && (
                <Button variant="outline" size="sm" onClick={handleGetHD}>
                  <Maximize className="mr-2 h-4 w-4" />
                  Request 1080P
                </Button>
              )}
            </CardHeader>
            <CardContent className="flex-1 flex items-center justify-center bg-black/5 dark:bg-white/5 m-6 rounded-lg border overflow-hidden relative">
              {videoUrls.length > 0 ? (
                <div className="w-full h-full flex flex-col p-4 space-y-4">
                  {videoUrls.map((url, index) => (
                    <div
                      key={index}
                      className="relative group rounded-lg overflow-hidden flex-1 bg-black"
                    >
                      <video src={url} controls className="w-full h-full" loop autoPlay muted />
                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="secondary" asChild>
                          <a href={url} download={`video-${index}.mp4`} target="_blank">
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : isGenerating ? (
                <div className="text-center space-y-4">
                  <div className="relative h-20 w-20 mx-auto">
                    <Loader2 className="h-20 w-20 animate-spin text-primary opacity-20" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Video className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">Generating your video...</p>
                    <p className="text-xs text-muted-foreground">
                      It usually takes 2-5 minutes. You can stay here or check back later.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                  <Video className="h-20 w-20 mx-auto opacity-10 mb-4" />
                  <p>No video generated yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
