import { NextResponse } from "next/server";
import { AuthenticationRequiredError, getCurrentUser, PermissionDeniedError } from "@/lib/authorization";
import { withTransaction } from "@/lib/db";

type Context = { params: Promise<{ requestId: string }> };
export const runtime = "nodejs";

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await getCurrentUser(["admin", "staff"]);
    const { requestId } = await context.params;
    const body: unknown = await request.json();
    const address = body && typeof body === "object" && typeof (body as Record<string, unknown>).address === "string" ? ((body as Record<string, unknown>).address as string).trim() : "";
    if (address.length < 5 || address.length > 300) return NextResponse.json({ error: "Adres 5–300 karakter olmalı." }, { status: 400 });
    const result = await withTransaction(async (client) => {
      const selected = await client.query(`SELECT status FROM repair_requests WHERE id = $1 FOR UPDATE`, [requestId]);
      if (!selected.rowCount) return { error: "Talep bulunamadı.", status: 404 } as const;
      if (["completed", "cancelled"].includes(selected.rows[0].status)) return { error: "Tamamlanan veya iptal edilen talebin adresi değiştirilemez.", status: 409 } as const;
      await client.query(`UPDATE repair_requests SET delivery_address = $1, updated_at = now() WHERE id = $2`, [address, requestId]);
      await client.query(`INSERT INTO repair_events (request_id, actor_id, event_type) VALUES ($1, $2, 'delivery_address_updated')`, [requestId, actor.id]);
      return { address } as const;
    });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: "Giriş yapman gerekiyor." }, { status: 401 });
    if (error instanceof PermissionDeniedError) return NextResponse.json({ error: "Bu işlem için yetkin yok." }, { status: 403 });
    return NextResponse.json({ error: "Adres kaydedilemedi." }, { status: 500 });
  }
}
