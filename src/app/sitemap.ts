import type { MetadataRoute } from "next";
import { baseUrl } from "@/utils/metadata";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 1,
    },
    {
      url: `${baseUrl}/home`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    // Add more static routes here
  ];
}
