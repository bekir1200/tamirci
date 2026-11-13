import { NextRequest, NextResponse } from "next/server";
import { clientIp, consumeRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const base = "https://gettechapi.github.io/TechAPI/v1/smartphones";
type IndexEntry = { slug: string; name: string };
let indexCache: { entries: unknown[]; expiresAt: number } | undefined;

export async function GET(request: NextRequest) {
  const brand = (request.nextUrl.searchParams.get("brand") ?? "").trim();
  const search = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (brand.length < 2 || brand.length > 50 || search.length < 2 || search.length > 60) return NextResponse.json({ models: [] });
  // Dış kaynağı korumak için IP başına dakikada en fazla 60 arama.
  try {
    if (!(await consumeRateLimit(`phone:${clientIp(request)}`, 60, 1))) {
      return NextResponse.json({ models: [] }, { status: 429 });
    }
  } catch {
    return NextResponse.json({ models: [] }, { status: 503 });
  }
  try {
    if (!indexCache || indexCache.expiresAt <= Date.now()) {
      const response = await fetch(`${base}/index.json`, { cache: "no-store" });
      if (!response.ok) throw new Error("Catalog unavailable");
      const data: unknown = await response.json();
      if (!data || typeof data !== "object" || !Array.isArray((data as { results?: unknown }).results)) throw new Error("Invalid catalog");
      indexCache = { entries: (data as { results: unknown[] }).results, expiresAt: Date.now() + 86400000 };
    }
    const normalizedBrand = brand.toLocaleLowerCase("en-US");
    const needle = search.toLocaleLowerCase("en-US");
    const slugBrand = normalizedBrand.replace(/[^a-z0-9]+/g, "-");
    const matches = indexCache.entries.filter((item): item is IndexEntry => {
      if (!item || typeof item !== "object") return false;
      const entry = item as Record<string, unknown>;
      return typeof entry.slug === "string" && /^[a-z0-9-]{1,180}$/.test(entry.slug) && typeof entry.name === "string" && entry.name.toLocaleLowerCase("en-US").includes(needle);
    });
    matches.sort ( (a, b) => Number(b.slug.startsWith(`${slugBrand}-`)) - Number(a.slug.startsWith(`${slugBrand}-`)) );
    const entries = await Promise.all(matches.slice(0, 20).map(async (entry) => {
      try {
        const detail = await fetch(`${base}/${entry.slug}/index.json`, { next: { revalidate: 86400 } });
        if (!detail.ok) return null;
        const value: unknown = await detail.json();
        if (!value || typeof value !== "object") return null;
        const item = value as { name?: unknown; brand?: { name?: unknown } };
        return typeof item.name === "string" && typeof item.brand?.name === "string" && item.brand.name.toLocaleLowerCase("en-US") === normalizedBrand ? item.name : null;
      } catch { return null; }
    }));
    return NextResponse.json({ models: [...new Set(entries.filter((entry): entry is string => Boolean(entry)))].slice(0, 15) });
  } catch {
    return NextResponse.json({ models: [] }, { status: 503 });
  }
}
