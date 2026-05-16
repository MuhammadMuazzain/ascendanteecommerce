import type { MetadataRoute } from "next";
import { baseUrl } from "@/utils/metadata";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/home", "/account", "/p/", "/g/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
