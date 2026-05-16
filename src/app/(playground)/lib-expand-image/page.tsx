"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Check } from "lucide-react";
import { expandImageAction } from "../actions";
import { toast } from "sonner";

export default function ExpandImagePlayground() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [params, setParams] = useState({
    prompt: "Expand the background seamlessly",
    left: 100,
    right: 100,
    top: 100,
    bottom: 100,
  });

  const handleGenerate = async () => {
    if (!imageFile) {
      toast.error("Please upload an image first");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.readAsDataURL(imageFile);
      reader.onload = async () => {
        const base64 = reader.result as string;

        const response = await expandImageAction({
          image: base64,
          ...params,
        });

        if (response.success && response.url) {
          setResult(response.url);
          toast.success("Image expanded!");
        } else {
          toast.error(response.error || "Failed to expand image");
        }
        setLoading(false);
      };
    } catch (error) {
      toast.error("Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Expand Image Playground</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>Upload an image and set expansion parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Source Image</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              />
            </div>

            <div className="space-y-2">
              <Label>Prompt</Label>
              <Input
                value={params.prompt}
                onChange={(e) => setParams({ ...params, prompt: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Left (px)</Label>
                <Input
                  type="number"
                  value={params.left}
                  onChange={(e) => setParams({ ...params, left: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Right (px)</Label>
                <Input
                  type="number"
                  value={params.right}
                  onChange={(e) => setParams({ ...params, right: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Top (px)</Label>
                <Input
                  type="number"
                  value={params.top}
                  onChange={(e) => setParams({ ...params, top: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Bottom (px)</Label>
                <Input
                  type="number"
                  value={params.bottom}
                  onChange={(e) => setParams({ ...params, bottom: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <Button className="w-full" onClick={handleGenerate} disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Expand Image
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
              <img src={result} alt="Expanded" className="max-w-full h-auto rounded-md" />
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
