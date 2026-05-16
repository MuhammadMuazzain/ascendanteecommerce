"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MusicIcon,
  SearchIcon,
  Play,
  Pause,
  ChevronDown,
  UploadCloud,
  Loader2,
} from "lucide-react";
import { MUSIC } from "@/constants/music";
import type { MusicGenre } from "@/types/video-generation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { uploadFile } from "@/lib/upload-utils";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Music {
  id: string;
  url: string;
}

interface MusicModalProps {
  selectedMusic?: Music;
  onMusicChange: (music: Music) => void;
}

function MusicUpload({
  onSelectCustomMusic,
}: {
  onSelectCustomMusic: (url: string, name: string) => void;
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
      onSelectCustomMusic(result.url, file.name);
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to upload music");
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
      <h3 className="text-lg font-bold mb-2 text-foreground">Upload Music File</h3>
      <p className="text-sm text-muted-foreground text-center mb-6 max-w-sm">
        Upload your own music track or an existing audio file to use as the background music.
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

export function MusicModal({ selectedMusic, onMusicChange }: MusicModalProps) {
  const [musicStyle, setMusicStyle] = useState<MusicGenre>("all");
  const [musicSearch, setMusicSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [localSelectedMusic, setLocalSelectedMusic] = useState<Music | undefined>(selectedMusic);
  const [playingMusicId, setPlayingMusicId] = useState<string | null>(null);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);

  // Sync local state with prop changes
  useEffect(() => {
    setLocalSelectedMusic(selectedMusic);
  }, [selectedMusic]);

  const filteredMusic = MUSIC.filter((music) => {
    const matchesStyle = musicStyle === "all" || music.genre === musicStyle;
    const matchesSearch =
      musicSearch === "" ||
      music.name.toLowerCase().includes(musicSearch.toLowerCase()) ||
      music.author.toLowerCase().includes(musicSearch.toLowerCase()) ||
      music.genre.toLowerCase().includes(musicSearch.toLowerCase());
    return matchesStyle && matchesSearch;
  });

  const handleMusicSelect = useCallback(
    (musicId: string, customName?: string) => {
      if (musicId.startsWith("http") || musicId.startsWith("blob:")) {
        const music: Music = {
          id: "Custom Music",
          url: musicId,
        };
        setLocalSelectedMusic(music);
        onMusicChange(music);
        setIsModalOpen(false);
        return;
      }

      const musicObj = MUSIC.find((music) => music.id === musicId);
      if (musicObj) {
        const music: Music = {
          id: musicObj.id,
          url: musicObj.url,
        };
        setLocalSelectedMusic(music);
        onMusicChange(music);
        setIsModalOpen(false);
      }
    },
    [onMusicChange],
  );

  const handlePreview = useCallback(
    (e: React.MouseEvent, musicId: string, musicUrl: string) => {
      e.stopPropagation(); // Prevent card selection when clicking preview

      // Stop current audio if playing
      if (audioRef) {
        audioRef.pause();
        audioRef.currentTime = 0;
      }

      if (playingMusicId === musicId) {
        // If clicking the same music, stop it
        setPlayingMusicId(null);
        setAudioRef(null);
      } else {
        // Play new music
        const audio = new Audio(musicUrl);
        audio.play();
        setPlayingMusicId(musicId);
        setAudioRef(audio);

        // Clean up when audio ends
        audio.onended = () => {
          setPlayingMusicId(null);
          setAudioRef(null);
        };
      }
    },
    [playingMusicId, audioRef],
  );

  // Cleanup audio when modal closes
  useEffect(() => {
    if (!isModalOpen && audioRef) {
      audioRef.pause();
      audioRef.currentTime = 0;
      setPlayingMusicId(null);
      setAudioRef(null);
    }
  }, [isModalOpen, audioRef]);

  const selectedMusicObj = MUSIC.find((music) => music.id === localSelectedMusic?.id);

  const isCustomMusic = !!localSelectedMusic && !selectedMusicObj;

  // Use custom music id as name, else library name, else Placeholder
  const displayMusicName = selectedMusicObj
    ? selectedMusicObj.name
    : isCustomMusic
      ? localSelectedMusic.id
      : "Select music";

  return (
    <div className="px-6 py-6 grid grid-cols-1 md:grid-cols-[1fr_240px] items-center gap-2">
      <div className="space-y-1">
        <div className="text-sm font-medium text-foreground">Music</div>
        <div className="text-xs text-muted-foreground">
          Choose the background music you want to use
        </div>
      </div>
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between h-10 bg-secondary/50 border-border hover:border-border/80 transition-all text-sm group"
          >
            <span className="flex items-center gap-2 truncate text-foreground">
              {displayMusicName}
              {selectedMusicObj && (
                <span className="px-1.5 py-0.5 rounded-full bg-zinc-800 text-[10px] text-muted-foreground capitalize">
                  {selectedMusicObj.genre}
                </span>
              )}
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground/50 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </Button>
        </DialogTrigger>
        <DialogContent className="md:max-w-3xl w-full flex flex-col p-0 space-y-0 gap-0 border-border bg-background shadow-xl overflow-hidden rounded-xl">
          <DialogHeader className="shrink-0 px-6 py-5 border-b border-border bg-card">
            <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
              Choose Music
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="library" className="flex flex-col gap-0 w-full">
            <div className="px-6 py-4 border-b border-border bg-muted/20">
              <TabsList className="grid w-full grid-cols-2 bg-muted p-1 rounded-lg border border-border">
                <TabsTrigger
                  value="library"
                  className="rounded-md text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all text-sm font-bold h-9"
                >
                  Library
                </TabsTrigger>
                <TabsTrigger
                  value="upload"
                  className="rounded-md text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all text-sm font-bold h-9"
                >
                  Upload
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="library" className="m-0 border-none p-0 focus-visible:ring-0">
              <div className="flex flex-col gap-0">
                {/* Filters and Search */}
                <div className="space-y-4 p-6 bg-card">
                  <div className="flex items-center gap-3">
                    <Select value={musicStyle} onValueChange={setMusicStyle}>
                      <SelectTrigger className="w-40 h-10 bg-background border-border shadow-none rounded-md">
                        <SelectValue placeholder="Style" />
                      </SelectTrigger>
                      <SelectContent className="rounded-md">
                        <SelectItem value="all">All Styles</SelectItem>
                        {Array.from(new Set(MUSIC.map((m) => m.genre)))
                          .sort()
                          .map((genre) => (
                            <SelectItem key={genre} value={genre}>
                              {genre.charAt(0).toUpperCase() + genre.slice(1)}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>

                    <div className="relative flex-1">
                      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                      <Input
                        placeholder="Search music..."
                        value={musicSearch}
                        onChange={(e) => setMusicSearch(e.target.value)}
                        className="pl-10 h-10 bg-background border-border shadow-none rounded-md"
                      />
                    </div>
                  </div>
                </div>

                {/* Music List */}
                <ScrollArea className="h-112.5 px-6 pb-6">
                  <div className="space-y-3 pt-4 border-t border-border/50">
                    {filteredMusic.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                        <MusicIcon className="h-10 w-10 mb-3 opacity-20" />
                        <p className="text-sm">No music found</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-8 px-4"
                          onClick={() => {
                            setMusicSearch("");
                            setMusicStyle("all");
                          }}
                        >
                          Clear filters
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2 pb-4">
                        {filteredMusic.slice(0, 50).map((music) => (
                          <div
                            key={music.id}
                            onClick={() => handleMusicSelect(music.id)}
                            className={cn(
                              "group flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-all border shadow-none",
                              localSelectedMusic?.id === music.id
                                ? "bg-secondary/40 border-primary ring-1 ring-primary"
                                : "bg-background border-border hover:bg-muted/50 hover:border-border-muted",
                            )}
                          >
                            <div
                              className={cn(
                                "w-10 h-10 rounded-md flex items-center justify-center shrink-0 transition-colors",
                                localSelectedMusic?.id === music.id
                                  ? "bg-primary/20 text-primary"
                                  : "bg-muted text-muted-foreground",
                              )}
                            >
                              <MusicIcon className="h-5 w-5" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <h3 className="font-bold text-sm truncate text-foreground">
                                  {music.name}
                                </h3>
                                <Badge
                                  variant="secondary"
                                  className="px-2 py-0 h-4 text-[9px] font-bold tracking-wider uppercase rounded-sm border-none bg-muted text-muted-foreground"
                                >
                                  {music.genre}
                                </Badge>
                              </div>
                              <p className="text-muted-foreground text-xs truncate">
                                {music.author} • {Math.floor(music.duration / 60)}:
                                {(music.duration % 60).toString().padStart(2, "0")}
                              </p>
                            </div>

                            <Button
                              variant="outline"
                              size="icon"
                              className={cn(
                                "rounded-full size-8 shrink-0 transition-all",
                                playingMusicId === music.id
                                  ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                                  : "bg-background border-border text-foreground hover:bg-muted",
                              )}
                              onClick={(e) => handlePreview(e, music.id, music.url)}
                            >
                              {playingMusicId === music.id ? (
                                <Pause className="size-3.5 fill-current" />
                              ) : (
                                <Play className="size-3.5 fill-current ml-0.5" />
                              )}
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>

            <TabsContent value="upload" className="m-0 border-none p-0 focus-visible:ring-0">
              <MusicUpload onSelectCustomMusic={handleMusicSelect} />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
