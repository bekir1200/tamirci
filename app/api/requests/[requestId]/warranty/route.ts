import { NextResponse } from "next/server";
import { AuthenticationRequiredError, getCurrentUser, PermissionDeniedError } from "@/lib/authorization";
import { withTransaction } from "@/lib/db";

export const runtime = "nodejs";
type Context = { params: Promise<{ requestId: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await getCurrentUser(["admin", "staff"]);
    const { requestId } = await context.params;
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Garanti bilgisi geçersiz." }, { status: 400 });
    const { status, expiresOn } = body as Record<string, unknown>;
    if (status !== "in_warranty" && status !== "out_of_warranty" && status !== "unknown") return NextResponse.json({ error: "Garanti durumu seç." }, { status: 400 });
    if (expiresOn !== null && expiresOn !== "" && (typeof expiresOn !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(expiresOn) || Number.isNaN(Date.parse(`${expiresOn}T00:00:00Z`)) || new Date(`${expiresOn}T00:00:00Z`).toISOString().slice(0, 10) !== expiresOn)) return NextResponse.json({ error: "Geçerli bir tarih gir." }, { status: 400 });
    const result = await withTransaction(async (client) => {
      const updated = await client.query(`UPDATE repair_requests SET warranty_status = $1, warranty_expires_on = $2, warranty_checked_at = now(), warranty_checked_by = $3, updated_at = now() WHERE id = $4 RETURNING warranty_status, warranty_expires_on, warranty_checked_at`, [status, expiresOn || null, actor.id, requestId]);
      if (!updated.rowCount) return null;
      await client.query(`INSERT INTO repair_events (request_id, actor_id, event_type, details) VALUES ($1, $2, 'warranty_checked', $3::jsonb)`, [requestId, actor.id, JSON.stringify({ status, source: "manual" })]);
      return updated.rows[0];
    });
    if (!result) return NextResponse.json({ error: "Talep bulunamadı." }, { status: 404 });
    return NextResponse.json({ warranty: result });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: "Giriş yapman gerekiyor." }, { status: 401 });
    if (error instanceof PermissionDeniedError) return NextResponse.json({ error: "Bu işlem için yetkin yok." }, { status: 403 });
    return NextResponse.json({ error: "Garanti bilgisi kaydedilemedi." }, { status: 500 });
  }
}
