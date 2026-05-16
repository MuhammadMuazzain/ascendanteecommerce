"use client";
import Editor from "@/components/editor/editor";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function EditorPage() {
  useEffect(() => {
    Sentry.setTag("page_name", "editor-main");
  }, []);

  return <Editor />;
}
