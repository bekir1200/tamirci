import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { AuthenticationRequiredError, getCurrentUser, PermissionDeniedError } from "@/lib/authorization";
import { withTransaction } from "@/lib/db";
import { deliveryProjection } from "@/lib/deliveries";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ requestId: string }> };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request, context: RouteContext) {
  try {
    const actor = await getCurrentUser(["admin", "staff"]);
    const { requestId } = await context.params;
    const body: unknown = await request.json();
    const courierId = body && typeof body === "object" ? (body as Record<string, unknown>).courierId : null;
    if (typeof courierId !== "string" || !uuidPattern.test(courierId)) {
      return NextResponse.json({ error: "Geçerli bir kurye seç." }, { status: 400 });
    }

    const outcome = await withTransaction(async (client) => {
      const repairResult = await client.query(
        `SELECT id, reference, status FROM repair_requests WHERE id = $1 FOR UPDATE`, [requestId],
      );
      const repair = repairResult.rows[0];
      if (!repair) return { error: "Talep bulunamadı.", status: 404 } as const;
      if (["cancelled", "completed"].includes(repair.status)) return { error: "Tamamlanmış veya iptal edilmiş talebe kurye atanamaz.", status: 409 } as const;

      const courier = await client.query(
        `SELECT id FROM users WHERE id = $1 AND role = 'courier' AND is_active = true`, [courierId],
      );
      if (!courier.rowCount) return { error: "Kurye hesabı bulunamadı veya aktif değil.", status: 404 } as const;

      const existingResult = await client.query(
        `SELECT id, courier_id, status FROM repair_deliveries WHERE request_id = $1 FOR UPDATE`, [requestId],
      );
      const existing = existingResult.rows[0];
      let deliveryId: string;
      let eventType: string;
      let fromStatus: string | null;
      let previousCourierId: string | null = null;
      if (existing) {
        if (!["assigned", "accepted"].includes(existing.status)) {
          return { error: "Kurye yalnızca görev başlamadan önce değiştirilebilir.", status: 409 } as const;
        }
        if (existing.courier_id === courierId) return { error: "Bu kurye göreve zaten atanmış.", status: 409 } as const;
        deliveryId = existing.id;
        eventType = "delivery_reassigned";
        fromStatus = existing.status;
        previousCourierId = existing.courier_id;
        await client.query(
          `UPDATE repair_deliveries SET courier_id = $1, assigned_by = $2, status = 'assigned', updated_at = now() WHERE id = $3`,
          [courierId, actor.id, deliveryId],
        );
      } else {
        deliveryId = randomUUID();
        eventType = "delivery_assigned";
        fromStatus = null;
        await client.query(
          `INSERT INTO repair_deliveries (id, request_id, courier_id, assigned_by) VALUES ($1, $2, $3, $4)`,
          [deliveryId, requestId, courierId, actor.id],
        );
      }
      await client.query(
        `INSERT INTO repair_events (request_id, actor_id, event_type, from_status, to_status, details)
         VALUES ($1, $2, $3, $4, 'assigned', $5::jsonb)`,
        [requestId, actor.id, eventType, fromStatus, JSON.stringify({ deliveryId, courierId, previousCourierId })],
      );
      const data = await client.query(`${deliveryProjection} WHERE d.id = $1`, [deliveryId]);
      return { delivery: data.rows[0] } as const;
    });
    if ("error" in outcome) return NextResponse.json({ error: outcome.error }, { status: outcome.status });
    return NextResponse.json({ delivery: outcome.delivery }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: "Giriş yapman gerekiyor." }, { status: 401 });
    if (error instanceof PermissionDeniedError) return NextResponse.json({ error: "Bu işlem için yetkin yok." }, { status: 403 });
    return NextResponse.json({ error: "Kurye atanamadı. Tekrar dene." }, { status: 500 });
  }
}
