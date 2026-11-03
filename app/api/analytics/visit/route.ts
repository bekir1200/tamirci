import { NextResponse } from "next/server";
import { recordDailyMetric } from "@/lib/analytics";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host")?.split(",")[0].trim() ?? request.headers.get("host");
  if (!origin || !host) return NextResponse.json({ error: "İstek doğrulanamadı." }, { status: 403 });
  try {
    if (new URL(origin).host !== host) return NextResponse.json({ error: "İstek doğrulanamadı." }, { status: 403 });
  } catch {
    return NextResponse.json({ error: "İstek doğrulanamadı." }, { status: 403 });
  }

  try {
    await recordDailyMetric("visits");
    return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Ziyaret kaydedilemedi." }, { status: 503 });
  }
}
