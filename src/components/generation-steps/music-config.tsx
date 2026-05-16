"use client";

import { useState } from "react";
import { SelectableCard } from "@/components/ui/selectable-card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MusicIcon, SearchIcon } from "lucide-react";
import { MUSIC } from "@/constants/music";
import { MusicGenre } from "@/types/video-generation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MusicConfigProps {
  selectedMusic: string;
  onMusicChange: (musicId: string) => void;
}

export function MusicConfig({ selectedMusic, onMusicChange }: MusicConfigProps) {
  const [musicStyle, setMusicStyle] = useState<MusicGenre>("all");
  const [musicSearch, setMusicSearch] = useState("");

  return (
    <div className="items-center justify-between px-4 font-medium py-6 space-y-4">
      <div className="flex items-center">Music</div>
      <div className="space-y-4">
        {/* Filters and Search */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <Select value={musicStyle} onValueChange={setMusicStyle}>
              <SelectTrigger className="w-24 h-9 bg-background border-border text-foreground shadow-none rounded-md">
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
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
              <Input
                placeholder="Search"
                value={musicSearch}
                onChange={(e) => setMusicSearch(e.target.value)}
                className="pl-9 h-9 bg-background border-border text-foreground placeholder:text-muted-foreground/40 shadow-none rounded-md"
              />
            </div>
          </div>
        </div>

        {/* Music List */}
        <div className="space-y-2 max-h-75 overflow-y-auto pr-2">
          {MUSIC.filter((music) => {
            const matchesStyle = musicStyle === "all" || music.genre === musicStyle;
            const matchesSearch =
              musicSearch === "" ||
              music.name.toLowerCase().includes(musicSearch.toLowerCase()) ||
              music.author.toLowerCase().includes(musicSearch.toLowerCase()) ||
              music.genre.toLowerCase().includes(musicSearch.toLowerCase());
            return matchesStyle && matchesSearch;
          })
            .slice(0, 20) // Limit to first 20 for performance
            .map((music) => (
              <SelectableCard
                key={music.id}
                isSelected={selectedMusic === music.id}
                onClick={() => onMusicChange(music.id)}
                className={cn(
                  "flex items-start gap-4 p-3 rounded-lg cursor-pointer transition-all border shadow-none",
                  selectedMusic === music.id
                    ? "bg-secondary/40 border-primary ring-1 ring-primary"
                    : "bg-background border-border hover:bg-muted/50 hover:border-border-muted",
                )}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-md flex items-center justify-center shrink-0 transition-colors",
                    selectedMusic === music.id
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <MusicIcon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-bold text-sm truncate text-foreground">{music.name}</h3>
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
              </SelectableCard>
            ))}
        </div>
      </div>
    </div>
  );
}
