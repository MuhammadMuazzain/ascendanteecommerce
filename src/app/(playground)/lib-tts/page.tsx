"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Mic, Play } from "lucide-react";
import { toast } from "sonner";
import { synthesizeSpeechAction, getVoicesAction } from "../actions";
import { useEffect } from "react";

export default function TtsPlayground() {
  const [text, setText] = useState("Hello, welcome to Scenify.");
  const [voices, setVoices] = useState<any[]>([]);
  const [selectedVoice, setSelectedVoice] = useState("");
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    loadVoices();
  }, []);

  const loadVoices = async () => {
    try {
      const result = await getVoicesAction();
      if (result.success) {
        setVoices(result.data || []);
        if (result.data && result.data.length > 0) {
          setSelectedVoice(result.data[0].id);
        }
      } else {
        toast.error("Failed to load voices");
      }
    } catch (error) {
      toast.error("Failed to load voices");
    }
  };

  const handleSynthesize = async () => {
    if (!text || !selectedVoice) return;
    setLoading(true);
    setAudioUrl(null);

    try {
      const result = await synthesizeSpeechAction(text, selectedVoice);
      if (result.success && result.audioBase64) {
        const audioSrc = `data:audio/mpeg;base64,${result.audioBase64}`;
        setAudioUrl(audioSrc);
        toast.success("Speech synthesized!");
      } else {
        toast.error(result.error || "Failed");
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">TTS Playground (ElevenLabs)</h1>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Voice</Label>
              <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a voice" />
                </SelectTrigger>
                <SelectContent>
                  {voices.map((voice) => (
                    <SelectItem key={voice.id} value={voice.id}>
                      {voice.name} ({voice.category})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Text</Label>
              <Input value={text} onChange={(e) => setText(e.target.value)} />
            </div>

            <Button onClick={handleSynthesize} disabled={loading || !selectedVoice}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Mic className="mr-2 h-4 w-4" />
              )}
              Synthesize
            </Button>
          </CardContent>
        </Card>

        {audioUrl && (
          <Card>
            <CardHeader>
              <CardTitle>Result</CardTitle>
            </CardHeader>
            <CardContent>
              <audio controls src={audioUrl} className="w-full" autoPlay />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
