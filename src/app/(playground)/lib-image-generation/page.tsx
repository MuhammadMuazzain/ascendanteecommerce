"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import {
  generateSeedreamAction,
  generateGeminiAction,
  generateGeminiV3Action,
  generateGeminiV2Action,
} from "../actions";

export default function ImagePlayground() {
  const [activeTab, setActiveTab] = useState("seedream");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [params, setParams] = useState({
    prompt: "A futuristic city with neon lights",
    aspectRatio: "9:16",
    style: "cinematic",
    numberOfImages: 1,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setResult(null);

    try {
      let response;
      if (activeTab === "seedream") {
        response = await generateSeedreamAction(params);
        if (response.success && response.url) setResult(response.url);
      } else if (activeTab === "gemini") {
        response = await generateGeminiAction(params);
        if (response.success) setResult(`data:image/png;base64,${response.base64}`);
      } else if (activeTab === "gemini-v3") {
        // For simplicity in playground, let's process file to dataURI
        let imageUrls: string[] = [];
        if (imageFile) {
          const reader = new FileReader();
          await new Promise((resolve) => {
            reader.onload = () => {
              imageUrls.push(reader.result as string);
              resolve(true);
            };
            reader.readAsDataURL(imageFile);
          });
        }

        response = await generateGeminiV3Action({
          ...params,
          imageUrls,
        });

        if (response.success && response.base64) setResult(response.base64);
      } else if (activeTab === "gemini-v2") {
        let imageUrls: string[] = [];
        if (imageFile) {
          const reader = new FileReader();
          await new Promise((resolve) => {
            reader.onload = () => {
              imageUrls.push(reader.result as string);
              resolve(true);
            };
            reader.readAsDataURL(imageFile);
          });
        }

        response = await generateGeminiV2Action({
          ...params,
          imageUrls,
        });

        if (response.success && response.base64) setResult(response.base64);
      }

      if (response && !response.success) {
        toast.error(response.error);
      } else {
        toast.success("Generated!");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <h1 className="text-3xl font-bold mb-6">Service Image Generation Playground</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="seedream">Seedream</TabsTrigger>
          <TabsTrigger value="gemini">Gemini</TabsTrigger>
          <TabsTrigger value="gemini-v3">Gemini V3 (Multimodal)</TabsTrigger>
          <TabsTrigger value="gemini-v2">Gemini V2.5 (Multimodal)</TabsTrigger>
        </TabsList>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Prompt</Label>
                <Textarea
                  value={params.prompt}
                  onChange={(e) => setParams({ ...params, prompt: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                      <SelectItem value="1:1">1:1</SelectItem>
                      <SelectItem value="16:9">16:9</SelectItem>
                      <SelectItem value="9:16">9:16</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Style</Label>
                  <Input
                    value={params.style}
                    onChange={(e) => setParams({ ...params, style: e.target.value })}
                  />
                </div>
              </div>

              {(activeTab === "gemini-v3" || activeTab === "gemini-v2") && (
                <div className="space-y-2">
                  <Label>Reference Image</Label>
                  <Input type="file" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                </div>
              )}

              <Button className="w-full" onClick={handleGenerate} disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ImageIcon className="mr-2 h-4 w-4" />
                )}
                Generate
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Result</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center min-h-[300px] bg-muted/20">
              {loading && <Loader2 className="h-8 w-8 animate-spin" />}
              {result && !loading && (
                <img src={result} alt="Result" className="max-w-full h-auto rounded-md" />
              )}
              {!result && !loading && <span className="text-muted-foreground">No output</span>}
            </CardContent>
          </Card>
        </div>
      </Tabs>
    </div>
  );
}
