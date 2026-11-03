import type { MetadataRoute } from "next";
import { LEGAL_PATHS, SITE_URL } from "@/lib/legal";
import { TOWNS } from "@/lib/towns";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/moving-help`, changeFrequency: "monthly", priority: 0.8 },
    ...TOWNS.map((t) => ({
      url: `${SITE_URL}/moving-help/${t.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...LEGAL_PATHS.map((p) => ({ url: `${SITE_URL}${p}`, changeFrequency: "yearly" as const, priority: 0.2 })),
  ];
}
