"use client";
import { useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import AutosizeInput from "../ui/autosize-input";
import { useSchemaStore } from "@/stores/schema-store";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function Header() {
  const { schema, isGenerating } = useSchemaStore();
  const [title, setTitle] = useState(schema?.title || "Untitled video");
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  return (
    <header className="relative flex h-[52px] w-full shrink-0 items-center justify-between px-4 bg-card z-10 border-b">
      {/* Left Section */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" asChild className="h-8 w-8 shrink-0">
          <Link href="/projects">
            <ChevronLeft className="h-5 w-5 text-muted-foreground" />
          </Link>
        </Button>

        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/projects">Projects</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <AutosizeInput
                name="title"
                value={title}
                onChange={handleTitleChange}
                width={200}
                inputClassName="border-none text-foreground outline-none px-0 text-sm font-medium bg-transparent focus-visible:ring-0"
              />
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      {/* Right Section */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          className="gap-2 rounded-full"
          disabled={isGenerating || !schema}
          asChild={!!schema && !isGenerating}
        >
          {schema && !isGenerating ? (
            <Link href={`/edit/${schema.id}`}>Customize</Link>
          ) : (
            <span>Customize</span>
          )}
        </Button>
      </div>
    </header>
  );
}
