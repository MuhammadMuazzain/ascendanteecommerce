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
import { toast } from "sonner";
import { Loader2, Download, ImageIcon, RefreshCw, Plus, Trash2 } from "lucide-react";

export default function ImageGenerationPlayground() {
  const [prompt, setPrompt] = useState("");
  const [imageInputs, setImageInputs] = useState<string[]>([]);
  const [newImageInput, setNewImageInput] = useState("");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [resolution, setResolution] = useState("1K");
  const [outputFormat, setOutputFormat] = useState("png");
  const [isGenerating, setIsGenerating] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim() && imageInputs.length === 0) {
      toast.error("Please enter a prompt or add at least one reference image");
      return;
    }

    setIsGenerating(true);
    setResultImage(null);
    setTaskId(null);
    setStatus("Submitting task...");

    try {
      const response = await fetch("/api/kie/image-generation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          image_input: imageInputs,
          aspect_ratio: aspectRatio,
          resolution,
          output_format: outputFormat,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.msg || "Generation failed");
      }

      const newTaskId = data.data.taskId;
      setTaskId(newTaskId);
      toast.success("Generation started!");
      pollStatus(newTaskId);
    } catch (error: any) {
      console.error("Error generating image:", error);
      toast.error(error.message || "Failed to start generation");
      setIsGenerating(false);
      setStatus(null);
    }
  };

  const pollStatus = async (id: string) => {
    setStatus("Generating image...");
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/kie/status?taskId=${id}&type=image`);
        const result = await response.json();

        if (!response.ok) {
          clearInterval(interval);
          setIsGenerating(false);
          setStatus("Failed");
          toast.error(result.msg || "Status check failed");
          return;
        }

        const { state, resultJson, failMsg } = result.data;

        if (state === "success") {
          clearInterval(interval);
          setIsGenerating(false);
          setStatus("Success");
          const results = JSON.parse(resultJson);
          setResultImage(results.resultUrls[0]);
          toast.success("Image generated successfully!");
        } else if (state === "fail") {
          clearInterval(interval);
          setIsGenerating(false);
          setStatus("Failed");
          toast.error(failMsg || "Generation failed");
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 3000);
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Image Generation Playground</h1>
        <p className="text-muted-foreground">
          Generate stunning images using Kie Nano Banana Pro model
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Generation Settings</CardTitle>
            <CardDescription>
              Describe the image you want to create and choose your preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="image-input">Reference Images (Optional - URL)</Label>
                <div className="flex gap-2">
                  <Input
                    id="image-input"
                    placeholder="https://example.com/product.jpg"
                    value={newImageInput}
                    onChange={(e) => setNewImageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (newImageInput.trim()) {
                          setImageInputs([...imageInputs, newImageInput.trim()]);
                          setNewImageInput("");
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    onClick={() => {
                      if (newImageInput.trim()) {
                        setImageInputs([...imageInputs, newImageInput.trim()]);
                        setNewImageInput("");
                      }
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {imageInputs.length > 0 && (
                  <div className="space-y-2 mt-2">
                    {imageInputs.map((url, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-muted rounded text-xs border"
                      >
                        <span className="truncate flex-1 mr-2">{url}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setImageInputs(imageInputs.filter((_, i) => i !== index))}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground">
                  Add up to 8 images to use as reference for style or composition.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="prompt">Prompt</Label>
                <Textarea
                  id="prompt"
                  placeholder="Use this image and generate an image of a person holding this product..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Aspect Ratio</Label>
                <Select value={aspectRatio} onValueChange={setAspectRatio}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select ratio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1:1">1:1 (Square)</SelectItem>
                    <SelectItem value="16:9">16:9 (Widescreen)</SelectItem>
                    <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                    <SelectItem value="4:3">4:3 (Classic)</SelectItem>
                    <SelectItem value="3:2">3:2 (Camera)</SelectItem>
                    <SelectItem value="21:9">21:9 (Ultrawide)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Resolution</Label>
                <Select value={resolution} onValueChange={setResolution}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select resolution" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1K">1K</SelectItem>
                    <SelectItem value="2K">2K</SelectItem>
                    <SelectItem value="4K">4K</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Format</Label>
              <Select value={outputFormat} onValueChange={setOutputFormat}>
                <SelectTrigger>
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="png">PNG</SelectItem>
                  <SelectItem value="jpg">JPG</SelectItem>
                </SelectContent>
              </Select>
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
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Generate Image
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="min-h-[400px] flex flex-col">
          <CardHeader>
            <CardTitle>Result</CardTitle>
            <CardDescription>{status || "Generated image will appear here"}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex items-center justify-center p-0 relative">
            {resultImage ? (
              <div className="w-full h-full flex flex-col p-6">
                <div className="relative group flex-1 bg-muted rounded-lg overflow-hidden border">
                  <img src={resultImage} alt="Generated" className="w-full h-full object-contain" />
                  <div className="absolute inset-x-0 bottom-0 p-4 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <a href={resultImage} download="generated-image.png" target="_blank">
                        <Download className="mr-2 h-4 w-4" />
                        Download Image
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            ) : isGenerating ? (
              <div className="text-center space-y-4">
                <div className="relative h-20 w-20 mx-auto">
                  <RefreshCw className="h-20 w-20 animate-spin text-muted-foreground opacity-20" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="font-medium">{status}</p>
                  <p className="text-xs text-muted-foreground">It usually takes 30-60 seconds</p>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <ImageIcon className="h-20 w-20 mx-auto opacity-10 mb-4" />
                <p>No image generated yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
