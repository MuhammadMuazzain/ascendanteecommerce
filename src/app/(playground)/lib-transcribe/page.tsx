"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, FileAudio } from "lucide-react";
import { toast } from "sonner";
import { transcribeUrlAction } from "../actions";

export default function TranscribePlayground() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleTranscribe = async () => {
    if (!url) return;
    setLoading(true);
    setResult(null);

    try {
      const response = await transcribeUrlAction(url);
      if (response.success) {
        setResult(response.data);
        toast.success("Transcription complete!");
      } else {
        toast.error(response.error);
      }
    } catch (error) {
      toast.error("Failed to transcribe");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Transcribe Playground (Deepgram)</h1>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>Enter a public URL to an audio/video file</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Audio URL</Label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/audio.mp3"
              />
            </div>

            <Button onClick={handleTranscribe} disabled={loading || !url}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileAudio className="mr-2 h-4 w-4" />
              )}
              Transcribe
            </Button>
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Result</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-md max-h-[400px] overflow-auto">
                <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
              </div>
              {result.transcript && (
                <div>
                  <h3 className="font-semibold mb-2">Transcript Text</h3>
                  <p className="text-sm text-muted-foreground">
                    {
                      // Extract text from transcript object if possible, otherwise just show json above
                      // The type is 'transcript: Partial<TranscriptObject>'
                      // Based on deepgram types, it usually has words array.
                      JSON.stringify(result.transcript).slice(0, 500) + "..."
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
