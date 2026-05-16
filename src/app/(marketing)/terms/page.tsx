"use client";

import { Header } from "@/components/header";
import Content from "./content.mdx";

export default function Page() {
  return (
    <div className="w-full">
      <Header />

      <div className="max-w-3xl mx-auto p-6">
        <Content />
      </div>
    </div>
  );
}
