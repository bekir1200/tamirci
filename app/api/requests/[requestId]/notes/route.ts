import { NextResponse } from "next/server";
import { AuthenticationRequiredError, getCurrentUser, PermissionDeniedError } from "@/lib/authorization";
import { withTransaction } from "@/lib/db";

type Context = { params: Promise<{ requestId: string }> };
export const runtime = "nodejs";

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await getCurrentUser(["admin", "technician"]);
    const { requestId } = await context.params;
    const body: unknown = await request.json();
    const note = body && typeof body === "object" && typeof (body as Record<string, unknown>).note === "string" ? ((body as Record<string, unknown>).note as string).trim() : "";
    if (note.length < 3 || note.length > 1000) return NextResponse.json({ error: "İşlem notu 3–1000 karakter olmalı." }, { status: 400 });
    const result = await withTransaction(async (client) => {
      const selected = await client.query(`SELECT assigned_technician_id, status FROM repair_requests WHERE id = $1 FOR UPDATE`, [requestId]);
      const repair = selected.rows[0];
      if (!repair || (actor.role === "technician" && repair.assigned_technician_id !== actor.id)) return { error: "Talep bulunamadı.", status: 404 } as const;
      if (!["assigned", "in_repair", "waiting_parts"].includes(repair.status)) return { error: "Bu aşamada işlem notu değiştirilemez.", status: 409 } as const;
      await client.query(`UPDATE repair_requests SET repair_notes = $1, updated_at = now() WHERE id = $2`, [note, requestId]);
      await client.query(`INSERT INTO repair_events (request_id, actor_id, event_type) VALUES ($1, $2, 'repair_note_updated')`, [requestId, actor.id]);
      return { note } as const;
    });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: "Giriş yapman gerekiyor." }, { status: 401 });
    if (error instanceof PermissionDeniedError) return NextResponse.json({ error: "Bu işlem için yetkin yok." }, { status: 403 });
    return NextResponse.json({ error: "İşlem notu kaydedilemedi." }, { status: 500 });
  }
}
