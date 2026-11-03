import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { AuthenticationRequiredError, getCurrentUser, PermissionDeniedError } from "@/lib/authorization";
import { query, withTransaction } from "@/lib/db";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ requestId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    await getCurrentUser(["admin", "staff"]);
    const { requestId } = await context.params;
    const result = await query(
      `SELECT o.id, o.status, o.message, o.created_at, o.responded_at,
              u.id AS technician_id, u.full_name AS technician_name
       FROM repair_offers o JOIN users u ON u.id = o.technician_id
       WHERE o.request_id = $1 ORDER BY o.created_at DESC`,
      [requestId],
    );
    return NextResponse.json({ offers: result.rows });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: "Giriş yapman gerekiyor." }, { status: 401 });
    if (error instanceof PermissionDeniedError) return NextResponse.json({ error: "Bu işlem için yetkin yok." }, { status: 403 });
    return NextResponse.json({ error: "Teklif geçmişi yüklenemedi." }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const actor = await getCurrentUser(["admin", "staff"]);
    const { requestId } = await context.params;
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || typeof (body as Record<string, unknown>).technicianId !== "string") {
      return NextResponse.json({ error: "Usta seçimi gerekli." }, { status: 400 });
    }
    const { technicianId, message } = body as { technicianId: string; message?: unknown };
    const note = typeof message === "string" ? message.trim().slice(0, 500) : "";

    const result = await withTransaction(async (client) => {
      const repair = await client.query(
        `SELECT id, reference, status FROM repair_requests WHERE id = $1 FOR UPDATE`,
        [requestId],
      );
      if (!repair.rows[0]) return { error: "Talep bulunamadı.", status: 404 } as const;
      if (!["new", "reviewing", "offered"].includes(repair.rows[0].status)) return { error: "Bu talebe artık teklif gönderilemez.", status: 409 } as const;

      const technician = await client.query(
        `SELECT id FROM users WHERE id = $1 AND role = 'technician' AND is_active = true AND available = true`,
        [technicianId],
      );
      if (!technician.rowCount) return { error: "Usta bulunamadı veya şu anda müsait değil.", status: 409 } as const;

      const offer = await client.query(
        `INSERT INTO repair_offers (id, request_id, technician_id, sent_by, message)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (request_id, technician_id) DO NOTHING
         RETURNING id, status, created_at`,
        [randomUUID(), requestId, technicianId, actor.id, note],
      );
      if (!offer.rowCount) return { error: "Bu ustaya daha önce teklif gönderilmiş.", status: 409 } as const;

      await client.query(
        `UPDATE repair_requests SET status = 'offered', updated_at = now() WHERE id = $1`,
        [requestId],
      );
      await client.query(
        `INSERT INTO repair_events (request_id, actor_id, event_type, from_status, to_status, details)
         VALUES ($1, $2, 'offer_sent', $3, 'offered', $4::jsonb)`,
        [requestId, actor.id, repair.rows[0].status, JSON.stringify({ technicianId })],
      );
      return { offer: offer.rows[0] } as const;
    });

    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ offer: result.offer }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: "Giriş yapman gerekiyor." }, { status: 401 });
    if (error instanceof PermissionDeniedError) return NextResponse.json({ error: "Bu işlem için yetkin yok." }, { status: 403 });
    return NextResponse.json({ error: "Teklif gönderilemedi. Tekrar dene." }, { status: 500 });
  }
}
