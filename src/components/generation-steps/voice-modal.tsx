"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { SelectableCard } from "@/components/ui/selectable-card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pause, Play, SearchIcon, ChevronDown, UploadCloud, Mic, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Voice } from "@/types/video-generation";
import { uploadFile } from "@/lib/upload-utils";

// --- Subcomponents ---

function VoiceFilters({
  voiceLanguage,
  setVoiceLanguage,
  voiceGender,
  setVoiceGender,
  voiceSearch,
  setVoiceSearch,
  voices,
}: {
  voiceLanguage: string;
  setVoiceLanguage: (val: string) => void;
  voiceGender: string;
  setVoiceGender: (val: string) => void;
  voiceSearch: string;
  setVoiceSearch: (val: string) => void;
  voices: Voice[];
}) {
  return (
    <div className="space-y-4 p-6 bg-card">
      <div className="grid grid-cols-2 gap-3">
        <Select value={voiceLanguage} onValueChange={setVoiceLanguage}>
          <SelectTrigger className="w-full h-10 bg-background border-border shadow-none rounded-md">
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent className="rounded-md">
            <SelectItem value="all">All Languages</SelectItem>
            {Array.from(
              new Set(voices.flatMap((v) => [v.language, ...(v.supportedLanguages || [])])),
            )
              .sort()
              .map((lang) => (
                <SelectItem key={lang} value={lang}>
                  {lang.toUpperCase()}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        <Select value={voiceGender} onValueChange={setVoiceGender}>
          <SelectTrigger className="w-full h-10 bg-background border-border shadow-none rounded-md">
            <SelectValue placeholder="Gender" />
          </SelectTrigger>
          <SelectContent className="rounded-md">
            <SelectItem value="all">All Genders</SelectItem>
            {Array.from(new Set(voices.map((v) => v.gender)))
              .sort()
              .map((gender) => (
                <SelectItem key={gender} value={gender}>
                  {gender.charAt(0).toUpperCase() + gender.slice(1)}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      <div className="relative flex-1">
        <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search voices..."
          value={voiceSearch}
          onChange={(e) => setVoiceSearch(e.target.value)}
          className="pl-10 h-10 bg-background border-border shadow-none rounded-md"
        />
      </div>
    </div>
  );
}

function VoiceListItem({
  voice,
  selectedVoice,
  onSelect,
  isPlaying,
  onPlayPreview,
  voiceLanguage,
}: {
  voice: Voice;
  selectedVoice: string;
  onSelect: (id: string) => void;
  isPlaying: boolean;
  onPlayPreview: (e: React.MouseEvent) => void;
  voiceLanguage: string;
}) {
  const isSelected = selectedVoice === voice.id;
  return (
    <SelectableCard
      isSelected={isSelected}
      onClick={() => onSelect(voice.id)}
      className={cn(
        "flex items-start gap-4 p-4 rounded-lg cursor-pointer transition-all border shadow-none",
        isSelected
          ? "bg-secondary/40 border-primary ring-1 ring-primary"
          : "bg-background border-border hover:bg-muted/50 hover:border-border-muted",
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="min-w-0">
            <h3 className="font-bold text-sm truncate mb-0.5 text-foreground">{voice.name}</h3>
            <p className="text-xs line-clamp-1 text-muted-foreground">{voice.description}</p>
          </div>
          <Button
            variant="outline"
            size="icon"
            className={cn(
              "rounded-full size-8 shrink-0 transition-all",
              isPlaying
                ? "bg-primary border-primary hover:bg-primary/90"
                : "bg-background border-border hover:bg-muted",
            )}
            onClick={onPlayPreview}
          >
            {isPlaying ? (
              <Pause className="size-3.5 fill-current" />
            ) : (
              <Play className="size-3.5 fill-current ml-0.5" />
            )}
          </Button>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <Badge
            variant="secondary"
            className="px-2 py-0 h-4 text-[9px] font-bold tracking-wider uppercase rounded-sm border-none bg-muted text-muted-foreground"
          >
            {voice.gender}
          </Badge>
          {voice.accent && (
            <Badge
              variant="outline"
              className="px-2 py-0 h-4 text-[9px] font-bold tracking-wider uppercase rounded-sm border-border/50 text-muted-foreground"
            >
              {voice.accent}
            </Badge>
          )}
          {voiceLanguage !== "all" && voice.supportedLanguages?.includes(voiceLanguage) && (
            <Badge className="px-2 py-0 h-4 text-[9px] font-bold tracking-wider uppercase rounded-sm bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary transition-colors border-none">
              {voiceLanguage.toUpperCase()}
            </Badge>
          )}
        </div>
      </div>
    </SelectableCard>
  );
}

function VoiceUpload({
  onSelectCustomVoice,
}: {
  onSelectCustomVoice: (url: string, name: string) => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("audio/")) {
      alert("Please upload an audio file");
      return;
    }

    try {
      setIsUploading(true);
      const result = await uploadFile(file);
      onSelectCustomVoice(result.url, file.name);
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to upload audio");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-100 px-6 border-2 border-dashed border-border rounded-lg m-6 bg-muted/30 group">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="audio/*"
        className="hidden"
      />
      <div className="w-16 h-16 rounded-full bg-background flex items-center justify-center mb-4 border border-border group-hover:border-primary transition-colors">
        {isUploading ? (
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        ) : (
          <UploadCloud className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
        )}
      </div>
      <h3 className="text-lg font-bold mb-2 text-foreground">Upload Audio File</h3>
      <p className="text-sm text-muted-foreground text-center mb-6 max-w-sm">
        Upload your own voice or an existing audio file to use as the voiceover.
      </p>
      <Button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="rounded-full px-8 h-10 font-bold"
      >
        {isUploading ? "Uploading..." : "Select File"}
      </Button>
    </div>
  );
}

function VoiceRecord({
  onSelectCustomVoice,
}: {
  onSelectCustomVoice: (url: string, name: string) => void;
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });

        const file = new File([blob], "recording.webm", {
          type: "audio/webm",
        });
        try {
          setIsUploading(true);
          const result = await uploadFile(file);
          onSelectCustomVoice(result.url, "My Recording");
        } catch (error) {
          console.error("Upload recorded audio failed", error);
          alert("Failed to upload recording");
        } finally {
          setIsUploading(false);
        }

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone", error);
      alert("Could not access microphone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-100 px-6 m-6 bg-muted/30 rounded-lg border border-dashed border-border">
      <div
        className={cn(
          "w-24 h-24 rounded-full flex items-center justify-center mb-6 transition-all duration-300 border",
          isRecording
            ? "bg-destructive/10 border-destructive shadow-sm"
            : "bg-background border-border",
          isUploading ? "opacity-50" : "",
        )}
      >
        {isUploading ? (
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        ) : isRecording ? (
          <div className="w-8 h-8 rounded-sm bg-destructive animate-pulse" />
        ) : (
          <Mic className="w-10 h-10 text-muted-foreground" />
        )}
      </div>

      <div
        className={cn(
          "text-4xl font-mono mb-8 tracking-wider font-bold text-foreground",
          isRecording && "text-destructive",
        )}
      >
        {formatTime(recordingTime)}
      </div>

      <Button
        variant={isRecording ? "destructive" : "default"}
        size="lg"
        className="rounded-full w-52 h-12 font-bold shadow-sm"
        disabled={isUploading}
        onClick={isRecording ? stopRecording : startRecording}
      >
        {isUploading ? "Processing..." : isRecording ? "Stop Recording" : "Start Recording"}
      </Button>
    </div>
  );
}

// --- Main Component ---

interface VoiceModalProps {
  selectedVoice: string;
  onVoiceChange: (voiceId: string) => void;
  voices: Voice[];
  isLoadingVoices: boolean;
}

export function VoiceModal({
  selectedVoice,
  onVoiceChange,
  voices,
  isLoadingVoices,
}: VoiceModalProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [voiceLanguage, setVoiceLanguage] = useState("all");
  const [voiceGender, setVoiceGender] = useState("all");
  const [voiceSearch, setVoiceSearch] = useState("");
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Auto-select first voice
  useEffect(() => {
    if (voices.length > 0 && !selectedVoice) {
      onVoiceChange(voices[0].id);
    }
  }, [voices, selectedVoice, onVoiceChange]);

  // Audio playback logic
  const stopCurrentPreview = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setPlayingVoiceId(null);
  }, []);

  useEffect(
    () => () => {
      stopCurrentPreview();
    },
    [stopCurrentPreview],
  );

  useEffect(() => {
    if (!isModalOpen) {
      stopCurrentPreview();
    }
  }, [isModalOpen, stopCurrentPreview]);

  const resolvePreviewUrl = useCallback(
    (voice: Voice) => {
      if (
        voiceLanguage !== "all" &&
        voice.verifiedLanguages &&
        voice.verifiedLanguages.length > 0
      ) {
        const match = voice.verifiedLanguages.find((lang) => lang.language === voiceLanguage);
        if (match?.previewUrl) return match.previewUrl;
      }
      return (
        voice.previewUrl ||
        voice.verifiedLanguages?.find((lang) => Boolean(lang.previewUrl))?.previewUrl ||
        null
      );
    },
    [voiceLanguage],
  );

  const playVoicePreview = useCallback(
    (voice: Voice) => {
      const previewUrl = resolvePreviewUrl(voice);
      if (!previewUrl) {
        console.warn("No preview available for voice", voice.id);
        return;
      }

      if (playingVoiceId === voice.id) {
        stopCurrentPreview();
        return;
      }

      stopCurrentPreview();

      const audioEl = new Audio(previewUrl);
      audioRef.current = audioEl;
      setPlayingVoiceId(voice.id);

      const cleanup = () => {
        if (audioRef.current === audioEl) {
          audioRef.current = null;
        }
        setPlayingVoiceId(null);
        audioEl.removeEventListener("ended", cleanup);
        audioEl.removeEventListener("error", cleanup);
      };

      audioEl.addEventListener("ended", cleanup);
      audioEl.addEventListener("error", cleanup);

      audioEl.play().catch((err) => {
        console.error("Failed to play voice preview", err);
        cleanup();
      });
    },
    [playingVoiceId, resolvePreviewUrl, stopCurrentPreview],
  );

  const handleVoiceSelect = useCallback(
    (voiceId: string) => {
      onVoiceChange(voiceId);
      setIsModalOpen(false);
    },
    [onVoiceChange],
  );

  const filteredVoices = voices.filter((voice) => {
    const matchesLanguage =
      voiceLanguage === "all" ||
      voice.language === voiceLanguage ||
      voice.supportedLanguages?.includes(voiceLanguage);
    const matchesGender = voiceGender === "all" || voice.gender === voiceGender;
    const matchesSearch =
      voiceSearch === "" ||
      voice.name.toLowerCase().includes(voiceSearch.toLowerCase()) ||
      voice.accent?.toLowerCase().includes(voiceSearch.toLowerCase());
    return matchesLanguage && matchesGender && matchesSearch;
  });

  const selectedVoiceObj = voices.find((v) => v.id === selectedVoice);
  const isCustomVoice = selectedVoice?.startsWith("http") || selectedVoice?.startsWith("blob:");
  const displayVoiceName = selectedVoiceObj
    ? selectedVoiceObj.name
    : isCustomVoice
      ? "Custom Voice"
      : "Select voice";

  return (
    <div className="px-6 py-6 grid grid-cols-1 md:grid-cols-[1fr_240px] items-center gap-4">
      <div className="space-y-1">
        <div className="text-sm font-medium text-foreground">Voice</div>
        <div className="text-xs text-muted-foreground">Choose the voice you want to use</div>
      </div>
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between h-10 bg-secondary/50 border-border hover:border-border/80 transition-all text-sm group"
          >
            <span className="flex items-center gap-2 truncate text-foreground">
              {displayVoiceName}
              {selectedVoiceObj && (
                <span className="px-1.5 py-0.5 rounded-full bg-muted border border-border text-[10px] text-muted-foreground capitalize">
                  {selectedVoiceObj.gender}
                </span>
              )}
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground/50 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </Button>
        </DialogTrigger>
        <DialogContent className="md:max-w-3xl w-full flex flex-col p-0 space-y-0 gap-0 border-border bg-background shadow-xl overflow-hidden rounded-xl">
          <DialogHeader className="shrink-0 px-6 py-5 border-b border-border bg-card">
            <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
              Choose Voice
            </DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="library" className="flex flex-col gap-0 w-full">
            <div className="px-6 py-4 border-b border-border bg-muted/20">
              <TabsList className="grid w-full grid-cols-3 bg-muted p-1 rounded-lg border border-border">
                <TabsTrigger
                  value="library"
                  className="rounded-md text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all text-xs font-bold"
                >
                  Library
                </TabsTrigger>
                <TabsTrigger
                  value="upload"
                  className="rounded-md text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all text-xs font-bold"
                >
                  Upload
                </TabsTrigger>
                <TabsTrigger
                  value="record"
                  className="rounded-md text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all text-xs font-bold"
                >
                  Record
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="library" className="m-0 border-none p-0 focus-visible:ring-0">
              <div className="flex flex-col gap-0">
                <VoiceFilters
                  voiceLanguage={voiceLanguage}
                  setVoiceLanguage={setVoiceLanguage}
                  voiceGender={voiceGender}
                  setVoiceGender={setVoiceGender}
                  voiceSearch={voiceSearch}
                  setVoiceSearch={setVoiceSearch}
                  voices={voices}
                />

                <ScrollArea className="h-112.5 px-6 pb-6">
                  <div className="space-y-4 pt-4 border-t border-border/50">
                    {isLoadingVoices ? (
                      <div className="flex flex-col items-center justify-center py-20 gap-3 opacity-70">
                        <Loader2 className="w-6 h-6 text-primary animate-spin" />
                        <span className="text-sm font-medium text-muted-foreground">
                          Loading voices...
                        </span>
                      </div>
                    ) : filteredVoices.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                        <SearchIcon className="w-8 h-8 opacity-20" />
                        <span className="text-sm">No voices found</span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-8 px-4"
                          onClick={() => {
                            setVoiceSearch("");
                            setVoiceLanguage("all");
                            setVoiceGender("all");
                          }}
                        >
                          Clear filters
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-4">
                        {filteredVoices.map((voice) => (
                          <VoiceListItem
                            key={voice.id}
                            voice={voice}
                            selectedVoice={selectedVoice}
                            onSelect={handleVoiceSelect}
                            isPlaying={playingVoiceId === voice.id}
                            onPlayPreview={(e) => {
                              e.stopPropagation();
                              playVoicePreview(voice);
                            }}
                            voiceLanguage={voiceLanguage}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>

            <TabsContent value="upload" className="m-0 border-none p-0 focus-visible:ring-0">
              <VoiceUpload onSelectCustomVoice={handleVoiceSelect} />
            </TabsContent>

            <TabsContent value="record" className="m-0 border-none p-0 focus-visible:ring-0">
              <VoiceRecord onSelectCustomVoice={handleVoiceSelect} />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
