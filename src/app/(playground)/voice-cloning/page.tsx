"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Upload, Trash2, Play, Pause, Download, Edit2, Check, X } from "lucide-react";
import { toast } from "sonner";

interface Voice {
  voice_id: string;
  name: string;
  description?: string;
  preview_url?: string;
  category?: string;
  labels?: Record<string, string>;
}

interface VoiceDetails extends Voice {
  samples?: Array<{
    sample_id: string;
    file_name: string;
    mime_type: string;
    size_bytes: number;
  }>;
  settings?: any;
}

export default function VoiceCloningPlayground() {
  const [activeTab, setActiveTab] = useState<"clone" | "manage" | "test">("clone");

  // Clone voice state
  const [voiceName, setVoiceName] = useState("");
  const [voiceDescription, setVoiceDescription] = useState("");
  const [audioFiles, setAudioFiles] = useState<File[]>([]);
  const [labels, setLabels] = useState({
    accent: "",
    age: "",
    gender: "",
    use_case: "",
  });
  const [isCloning, setIsCloning] = useState(false);

  // Manage voices state
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<VoiceDetails | null>(null);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [editingVoice, setEditingVoice] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "" });

  // Test voice state
  const [testText, setTestText] = useState("Hello! This is a test of my cloned voice.");
  const [testVoiceId, setTestVoiceId] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + audioFiles.length > 25) {
      toast.error("Maximum 25 audio files allowed");
      return;
    }
    setAudioFiles([...audioFiles, ...files]);
  };

  // Remove file
  const removeFile = (index: number) => {
    setAudioFiles(audioFiles.filter((_, i) => i !== index));
  };

  // Clone voice
  const handleCloneVoice = async () => {
    if (!voiceName.trim()) {
      toast.error("Voice name is required");
      return;
    }
    if (audioFiles.length === 0) {
      toast.error("At least one audio file is required");
      return;
    }

    setIsCloning(true);
    try {
      // 1. Get presigned URLs for all files
      toast.loading("Preparing upload...", { id: "cloning" });

      const presignResponse = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "voice-cloning", // Or get actual userId if available
          fileNames: audioFiles.map((f) => f.name),
          contentTypes: audioFiles.map((f) => f.type),
        }),
      });

      if (!presignResponse.ok) {
        const error = await presignResponse.json();
        throw new Error(error.error || "Failed to get upload URLs");
      }

      const { uploads } = await presignResponse.json();

      // 2. Upload files to R2 via PUT
      toast.loading(`Uploading ${audioFiles.length} file(s)...`, {
        id: "cloning",
      });

      const publicUrls = await Promise.all(
        uploads.map(async (uploadData: any, index: number) => {
          const file = audioFiles[index];
          const putResponse = await fetch(uploadData.presignedUrl, {
            method: "PUT",
            headers: { "Content-Type": file.type },
            body: file,
          });

          if (!putResponse.ok) {
            throw new Error(`Failed to upload ${file.name}`);
          }

          return uploadData.url;
        }),
      );

      // 3. Call voice cloning API with public URLs
      toast.loading("Cloning voice (this may take a minute)...", {
        id: "cloning",
      });

      const filledLabels = Object.fromEntries(
        Object.entries(labels).filter(([_, value]) => value.trim() !== ""),
      );

      const cloneResponse = await fetch("/api/voice-cloning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: voiceName,
          description: voiceDescription || undefined,
          fileUrls: publicUrls,
          labels: Object.keys(filledLabels).length > 0 ? filledLabels : undefined,
        }),
      });

      if (!cloneResponse.ok) {
        const error = await cloneResponse.json();
        throw new Error(error.error || "Failed to clone voice");
      }

      const data = await cloneResponse.json();
      toast.success(`Voice "${data.name}" cloned successfully!`, {
        id: "cloning",
      });

      // Reset form
      setVoiceName("");
      setVoiceDescription("");
      setAudioFiles([]);
      setLabels({ accent: "", age: "", gender: "", use_case: "" });

      // Switch to manage tab and refresh voices
      setActiveTab("manage");
      fetchVoices();
    } catch (error) {
      console.error("Error cloning voice:", error);
      toast.error(error instanceof Error ? error.message : "Failed to clone voice", {
        id: "cloning",
      });
    } finally {
      setIsCloning(false);
    }
  };

  // Fetch voices
  const fetchVoices = async () => {
    setIsLoadingVoices(true);
    try {
      const response = await fetch("/api/voice-cloning");
      if (!response.ok) throw new Error("Failed to fetch voices");

      const data = await response.json();
      setVoices(data.voices || []);
    } catch (error) {
      console.error("Error fetching voices:", error);
      toast.error("Failed to load voices");
    } finally {
      setIsLoadingVoices(false);
    }
  };

  // Fetch voice details
  const fetchVoiceDetails = async (voiceId: string) => {
    try {
      const response = await fetch(`/api/voice-cloning/${voiceId}`);
      if (!response.ok) throw new Error("Failed to fetch voice details");

      const data = await response.json();
      setSelectedVoice(data);
    } catch (error) {
      console.error("Error fetching voice details:", error);
      toast.error("Failed to load voice details");
    }
  };

  // Delete voice
  const handleDeleteVoice = async (voiceId: string, voiceName: string) => {
    if (!confirm(`Are you sure you want to delete "${voiceName}"?`)) return;

    try {
      const response = await fetch(`/api/voice-cloning/${voiceId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete voice");

      toast.success(`Voice "${voiceName}" deleted successfully`);
      setVoices(voices.filter((v) => v.voice_id !== voiceId));
      if (selectedVoice?.voice_id === voiceId) {
        setSelectedVoice(null);
      }
    } catch (error) {
      console.error("Error deleting voice:", error);
      toast.error("Failed to delete voice");
    }
  };

  // Start editing voice
  const startEditVoice = (voice: Voice) => {
    setEditingVoice(voice.voice_id);
    setEditForm({
      name: voice.name,
      description: voice.description || "",
    });
  };

  // Save voice edits
  const handleSaveEdit = async (voiceId: string) => {
    try {
      const response = await fetch(`/api/voice-cloning/${voiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) throw new Error("Failed to update voice");

      const updatedVoice = await response.json();
      toast.success("Voice updated successfully");

      setVoices(voices.map((v) => (v.voice_id === voiceId ? updatedVoice : v)));
      if (selectedVoice?.voice_id === voiceId) {
        setSelectedVoice({ ...selectedVoice, ...updatedVoice });
      }
      setEditingVoice(null);
    } catch (error) {
      console.error("Error updating voice:", error);
      toast.error("Failed to update voice");
    }
  };

  // Generate speech
  const handleGenerateSpeech = async () => {
    if (!testText.trim()) {
      toast.error("Please enter text to convert");
      return;
    }
    if (!testVoiceId) {
      toast.error("Please select a voice");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/text-to-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: testText,
          voiceId: testVoiceId,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate speech");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      toast.success("Speech generated successfully!");
    } catch (error) {
      console.error("Error generating speech:", error);
      toast.error("Failed to generate speech");
    } finally {
      setIsGenerating(false);
    }
  };

  // Play/pause audio
  const togglePlayback = () => {
    if (!audioUrl) return;

    if (!audioElement) {
      const audio = new Audio(audioUrl);
      audio.onended = () => setIsPlaying(false);
      setAudioElement(audio);
      audio.play();
      setIsPlaying(true);
    } else {
      if (isPlaying) {
        audioElement.pause();
        setIsPlaying(false);
      } else {
        audioElement.play();
        setIsPlaying(true);
      }
    }
  };

  // Download audio
  const downloadAudio = () => {
    if (!audioUrl) return;
    const a = document.createElement("a");
    a.href = audioUrl;
    a.download = "generated-speech.mp3";
    a.click();
  };

  // Load voices when switching to manage tab
  const handleTabChange = (value: string) => {
    setActiveTab(value as "clone" | "manage" | "test");
    if (value === "manage" && voices.length === 0) {
      fetchVoices();
    }
    if (value === "test" && voices.length === 0) {
      fetchVoices();
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Voice Cloning Playground</h1>
        <p className="text-muted-foreground">
          Clone voices, manage your voice library, and test text-to-speech
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="clone">Clone Voice</TabsTrigger>
          <TabsTrigger value="manage">Manage Voices</TabsTrigger>
          <TabsTrigger value="test">Test TTS</TabsTrigger>
        </TabsList>

        {/* Clone Voice Tab */}
        <TabsContent value="clone" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Clone a New Voice</CardTitle>
              <CardDescription>
                Upload 3-10 audio samples (30s-2min each) for best results
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="voice-name">Voice Name *</Label>
                <Input
                  id="voice-name"
                  placeholder="My Custom Voice"
                  value={voiceName}
                  onChange={(e) => setVoiceName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="voice-description">Description</Label>
                <Textarea
                  id="voice-description"
                  placeholder="A professional voice for narration..."
                  value={voiceDescription}
                  onChange={(e) => setVoiceDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Labels (Optional)</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="accent" className="text-xs text-muted-foreground">
                      Accent
                    </Label>
                    <Input
                      id="accent"
                      placeholder="e.g., american"
                      value={labels.accent}
                      onChange={(e) => setLabels({ ...labels, accent: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="age" className="text-xs text-muted-foreground">
                      Age
                    </Label>
                    <Input
                      id="age"
                      placeholder="e.g., middle-aged"
                      value={labels.age}
                      onChange={(e) => setLabels({ ...labels, age: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="gender" className="text-xs text-muted-foreground">
                      Gender
                    </Label>
                    <Input
                      id="gender"
                      placeholder="e.g., male"
                      value={labels.gender}
                      onChange={(e) => setLabels({ ...labels, gender: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="use_case" className="text-xs text-muted-foreground">
                      Use Case
                    </Label>
                    <Input
                      id="use_case"
                      placeholder="e.g., narration"
                      value={labels.use_case}
                      onChange={(e) => setLabels({ ...labels, use_case: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Audio Files * (1-25 files)</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept="audio/*"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                    id="audio-upload"
                  />
                  <label htmlFor="audio-upload" className="cursor-pointer">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      MP3, WAV, M4A, FLAC (max 25 files)
                    </p>
                  </label>
                </div>

                {audioFiles.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <p className="text-sm font-medium">{audioFiles.length} file(s) selected:</p>
                    {audioFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-muted rounded"
                      >
                        <span className="text-sm truncate flex-1">{file.name}</span>
                        <span className="text-xs text-muted-foreground mx-2">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                        <Button variant="ghost" size="sm" onClick={() => removeFile(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button
                onClick={handleCloneVoice}
                disabled={isCloning || !voiceName || audioFiles.length === 0}
                className="w-full"
                size="lg"
              >
                {isCloning ? "Cloning Voice..." : "Clone Voice"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manage Voices Tab */}
        <TabsContent value="manage" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Your Cloned Voices</h2>
            <Button onClick={fetchVoices} disabled={isLoadingVoices} variant="outline">
              {isLoadingVoices ? "Loading..." : "Refresh"}
            </Button>
          </div>

          {voices.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  No cloned voices yet. Clone your first voice!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {voices.map((voice) => (
                <Card key={voice.voice_id}>
                  <CardContent className="p-6">
                    {editingVoice === voice.voice_id ? (
                      <div className="space-y-4">
                        <Input
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          placeholder="Voice name"
                        />
                        <Textarea
                          value={editForm.description}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              description: e.target.value,
                            })
                          }
                          placeholder="Description"
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <Button onClick={() => handleSaveEdit(voice.voice_id)} size="sm">
                            <Check className="h-4 w-4 mr-1" /> Save
                          </Button>
                          <Button onClick={() => setEditingVoice(null)} variant="outline" size="sm">
                            <X className="h-4 w-4 mr-1" /> Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{voice.name}</h3>
                            {voice.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {voice.description}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => startEditVoice(voice)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteVoice(voice.voice_id, voice.name)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mt-3">
                          {voice.category && <Badge variant="secondary">{voice.category}</Badge>}
                          {voice.labels &&
                            Object.entries(voice.labels).map(([key, value]) => (
                              <Badge key={key} variant="outline">
                                {key}: {value}
                              </Badge>
                            ))}
                        </div>

                        <div className="mt-4 flex gap-2">
                          {voice.preview_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const audio = new Audio(voice.preview_url);
                                audio.play();
                              }}
                            >
                              <Play className="h-4 w-4 mr-1" /> Preview
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fetchVoiceDetails(voice.voice_id)}
                          >
                            View Details
                          </Button>
                        </div>

                        {selectedVoice?.voice_id === voice.voice_id && (
                          <div className="mt-4 p-4 bg-muted rounded-lg">
                            <h4 className="font-medium mb-2">Voice Details</h4>
                            <div className="space-y-2 text-sm">
                              <p>
                                <span className="font-medium">ID:</span> {selectedVoice.voice_id}
                              </p>
                              {selectedVoice.samples && selectedVoice.samples.length > 0 && (
                                <div>
                                  <p className="font-medium mb-1">
                                    Samples ({selectedVoice.samples.length}):
                                  </p>
                                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                    {selectedVoice.samples.map((sample) => (
                                      <li key={sample.sample_id}>
                                        {sample.file_name} ({(sample.size_bytes / 1024).toFixed(1)}{" "}
                                        KB)
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Test TTS Tab */}
        <TabsContent value="test" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Test Text-to-Speech</CardTitle>
              <CardDescription>Generate speech using your cloned voices</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="test-voice">Select Voice</Label>
                <select
                  id="test-voice"
                  className="w-full p-2 border rounded-md bg-background"
                  value={testVoiceId}
                  onChange={(e) => setTestVoiceId(e.target.value)}
                >
                  <option value="">Choose a voice...</option>
                  {voices.map((voice) => (
                    <option key={voice.voice_id} value={voice.voice_id}>
                      {voice.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="test-text">Text to Convert</Label>
                <Textarea
                  id="test-text"
                  placeholder="Enter text to convert to speech..."
                  value={testText}
                  onChange={(e) => setTestText(e.target.value)}
                  rows={5}
                />
              </div>

              <Button
                onClick={handleGenerateSpeech}
                disabled={isGenerating || !testText || !testVoiceId}
                className="w-full"
                size="lg"
              >
                {isGenerating ? "Generating..." : "Generate Speech"}
              </Button>

              {audioUrl && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-medium mb-4">Generated Audio</h3>
                    <div className="flex gap-2">
                      <Button onClick={togglePlayback} variant="outline">
                        {isPlaying ? (
                          <>
                            <Pause className="h-4 w-4 mr-2" /> Pause
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" /> Play
                          </>
                        )}
                      </Button>
                      <Button onClick={downloadAudio} variant="outline">
                        <Download className="h-4 w-4 mr-2" /> Download
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
