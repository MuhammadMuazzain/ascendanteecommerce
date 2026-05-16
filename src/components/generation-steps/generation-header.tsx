"use client";

import { ChevronLeftIcon } from "lucide-react";
import { Button } from "../ui/button";
import { useRouter } from "next/navigation";

interface GenerationHeaderProps {
  handleGenerate: () => void;
}

export function GenerationHeader({ handleGenerate }: GenerationHeaderProps) {
  const router = useRouter();

  return (
    <div className="h-16 overflow-hidden w-full relative border-b border-border  flex-none flex items-center justify-between px-3">
      <div className="flex items-center gap-2 ">
        <Button
          variant={"secondary"}
          className="rounded-full"
          size={"icon"}
          onClick={() => router.back()}
        >
          <ChevronLeftIcon />
        </Button>
        Edit video
      </div>
      <div>
        <Button className="rounded-full" onClick={handleGenerate}>
          Generate
        </Button>
      </div>
    </div>
  );
}
