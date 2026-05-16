"use client";

import { useState, useEffect } from "react";
import { SelectableCard } from "@/components/ui/selectable-card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchIcon, Play, Pause, Loader2 } from "lucide-react";
import { Voice } from "@/types/video-generation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VoiceAccordionProps {
  selectedVoice: string;
  onVoiceChange: (voiceId: string) => void;
  voices: Voice[];
  isLoadingVoices: boolean;
}

export function VoiceAccordion({
  selectedVoice,
  onVoiceChange,
  voices,
  isLoadingVoices,
}: VoiceAccordionProps) {
  const [voiceLanguage, setVoiceLanguage] = useState("all");
  const [voiceGender, setVoiceGender] = useState("all");
  const [voiceSearch, setVoiceSearch] = useState("");

  // Auto-select first voice if none selected and voices are available
  useEffect(() => {
    if (voices.length > 0 && !selectedVoice) {
      onVoiceChange(voices[0].id);
    }
  }, [voices, selectedVoice, onVoiceChange]);

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <div className="flex gap-2">
        <Select value={voiceLanguage} onValueChange={setVoiceLanguage}>
          <SelectTrigger className="w-24 h-9 bg-background border-border text-foreground shadow-none rounded-md">
            <SelectValue placeholder="Lang" />
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
          <SelectTrigger className="w-24 h-9 bg-background border-border text-foreground shadow-none rounded-md">
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

        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
          <Input
            placeholder="Search"
            value={voiceSearch}
            onChange={(e) => setVoiceSearch(e.target.value)}
            className="pl-9 h-9 bg-background border-border text-foreground placeholder:text-muted-foreground/40 shadow-none rounded-md"
          />
        </div>
      </div>

      {/* Voice List */}
      <div className="space-y-2 max-h-75 overflow-y-auto">
        {isLoadingVoices ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground opacity-20" />
            <div className="text-muted-foreground text-xs font-medium">Loading voices...</div>
          </div>
        ) : voices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="text-muted-foreground text-xs font-medium">No voices available</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 pb-2">
            {voices
              .filter((voice) => {
                const matchesLanguage =
                  voiceLanguage === "all" ||
                  voice.language === voiceLanguage ||
                  voice.supportedLanguages?.includes(voiceLanguage);
                const matchesGender = voiceGender === "all" || voice.gender === voiceGender;
                const matchesSearch =
                  voiceSearch === "" ||
                  voice.name.toLowerCase().includes(voiceSearch.toLowerCase()) ||
                  (voice.accent && voice.accent.toLowerCase().includes(voiceSearch.toLowerCase()));
                return matchesLanguage && matchesGender && matchesSearch;
              })
              .map((voice) => (
                <SelectableCard
                  key={voice.id}
                  isSelected={selectedVoice === voice.id}
                  onClick={() => onVoiceChange(voice.id)}
                  className={cn(
                    "flex items-start gap-4 p-3 rounded-lg cursor-pointer transition-all border shadow-none",
                    selectedVoice === voice.id
                      ? "bg-secondary/40 border-primary ring-1 ring-primary"
                      : "bg-background border-border hover:bg-muted/50 hover:border-border-muted",
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-sm truncate text-foreground">{voice.name}</h3>
                      <Badge
                        variant="secondary"
                        className="px-2 py-0 h-4 text-[9px] font-bold tracking-wider uppercase rounded-sm border-none bg-muted text-muted-foreground"
                      >
                        {voice.quality === "High Quality" ? "Elite" : "Pro"}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-[11px] line-clamp-2 leading-relaxed mb-2">
                      {voice.description}
                    </p>
                    <div className="flex gap-1.5 flex-wrap">
                      <Badge
                        variant="outline"
                        className="px-1.5 py-0 h-4 text-[9px] font-bold bg-background border-border text-muted-foreground uppercase"
                      >
                        {voice.gender}
                      </Badge>
                      {voice.accent && (
                        <Badge
                          variant="outline"
                          className="px-1.5 py-0 h-4 text-[9px] font-bold bg-background border-border text-muted-foreground uppercase"
                        >
                          {voice.accent}
                        </Badge>
                      )}
                    </div>
                  </div>
                </SelectableCard>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
