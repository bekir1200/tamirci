import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (!site) return [];
  return [
    { url: site, changeFrequency: "monthly", priority: 1 },
    { url: `${site}/talep`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${site}/kvkk`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
