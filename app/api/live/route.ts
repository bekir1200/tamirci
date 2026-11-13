import { NextResponse } from "next/server";
import { AuthenticationRequiredError, getCurrentUser } from "@/lib/authorization";
import { query } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Hafif değişim işareti: talep, teslimat, teklif, olay ve kullanıcı tablolarındaki en son hareket.
// İstemci yalnızca bu değer değiştiğinde asıl verileri yeniden çeker.
export async function GET() {
  try {
    await getCurrentUser();
    const result = await query<{ stamp: string }>(
      `SELECT concat_ws('|',
         (SELECT max(updated_at)::text FROM repair_requests),
         (SELECT max(updated_at)::text FROM repair_deliveries),
         (SELECT max(COALESCE(responded_at, created_at))::text FROM repair_offers),
         (SELECT max(created_at)::text FROM repair_events),
         (SELECT max(updated_at)::text FROM users)
       ) AS stamp`,
    );
    return NextResponse.json({ stamp: result.rows[0]?.stamp ?? "" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: "Giriş yapman gerekiyor." }, { status: 401 });
    return NextResponse.json({ error: "Güncelleme bilgisi alınamadı." }, { status: 500 });
  }
}
