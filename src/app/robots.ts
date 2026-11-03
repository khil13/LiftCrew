import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/legal";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/auth/",
        "/admin",
        "/home",
        "/jobs",
        "/messages",
        "/notifications",
        "/settings",
        "/billing",
        "/earnings",
        "/favorites",
        "/onboarding",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
