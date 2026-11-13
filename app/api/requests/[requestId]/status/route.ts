import { NextResponse } from "next/server";
import { AuthenticationRequiredError, getCurrentUser, PermissionDeniedError } from "@/lib/authorization";
import { withTransaction } from "@/lib/db";
import { notifyCustomerOfStatus } from "@/lib/notifications";
import type { AppRole } from "@/types/next-auth";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ requestId: string }> };
const validStatuses = new Set(["reviewing", "in_repair", "waiting_customer", "waiting_parts", "ready_for_delivery", "cancelled"]);
const technicianTransitions: Record<string, string[]> = {
  assigned: ["in_repair"],
  in_repair: ["waiting_customer", "waiting_parts", "ready_for_delivery"],
  waiting_parts: ["in_repair"],
};

function statusError(error: unknown) {
  if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: "Giriş yapman gerekiyor." }, { status: 401 });
  if (error instanceof PermissionDeniedError) return NextResponse.json({ error: "Bu işlem için yetkin yok." }, { status: 403 });
  return NextResponse.json({ error: "Durum güncellenemedi. Tekrar dene." }, { status: 500 });
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const actor = await getCurrentUser();
    const { requestId } = await context.params;
    const body: unknown = await request.json();
    const nextStatus = body && typeof body === "object" ? (body as Record<string, unknown>).status : null;
    const noteValue = body && typeof body === "object" ? (body as Record<string, unknown>).note : undefined;
    const note = typeof noteValue === "string" ? noteValue.trim() : "";
    if (typeof nextStatus !== "string" || !validStatuses.has(nextStatus)) {
      return NextResponse.json({ error: "Geçerli bir talep durumu seç." }, { status: 400 });
    }
    if (note.length > 1000 || (nextStatus === "waiting_customer" && note.length < 3)) return NextResponse.json({ error: "Onay için yapılacak işlemi açıklayın (3–1000 karakter)." }, { status: 400 });
    if (note && actor.role !== "technician" && actor.role !== "admin") return NextResponse.json({ error: "Bu işlem için yetkin yok." }, { status: 403 });

    const result = await withTransaction(async (client) => {
      const selected = await client.query(
        `SELECT id, reference, status, customer_user_id, assigned_technician_id,
                (SELECT status FROM repair_deliveries WHERE request_id = repair_requests.id) AS delivery_status
         FROM repair_requests WHERE id = $1 FOR UPDATE`,
        [requestId],
      );
      const repair = selected.rows[0];
      if (!repair) return { error: "Talep bulunamadı.", httpStatus: 404 } as const;
      if (repair.status === nextStatus) return { error: "Talep zaten bu durumda.", httpStatus: 409 } as const;
      if (["completed", "cancelled"].includes(repair.status)) return { error: "Tamamlanmış veya iptal edilmiş talep değiştirilemez.", httpStatus: 409 } as const;
      if (["in_repair", "waiting_customer", "waiting_parts", "ready_for_delivery"].includes(nextStatus) && !repair.assigned_technician_id) return { error: "Önce talebe bir usta atanmalı.", httpStatus: 409 } as const;
      if (nextStatus === "in_repair" && repair.status === "assigned" && repair.delivery_status && repair.delivery_status !== "at_shop") return { error: "Cihaz ustaya teslim edilmeden tamir başlatılamaz.", httpStatus: 409 } as const;
      if (nextStatus === "cancelled" && ["picked_up", "at_shop", "returning"].includes(repair.delivery_status)) return { error: "Cihaz teslimat sürecindeyken talep iptal edilemez.", httpStatus: 409 } as const;

      const allowedRoles: AppRole[] = ["admin"];
      if (actor.role === "technician") {
        if (repair.assigned_technician_id !== actor.id || !technicianTransitions[repair.status]?.includes(nextStatus)) {
          return { error: "Bu talebin durumunu bu aşamada değiştiremezsin.", httpStatus: 403 } as const;
        }
      } else if (actor.role === "customer") {
        if (repair.customer_user_id !== actor.id || repair.status !== "waiting_customer" || nextStatus !== "in_repair") {
          return { error: "Bu talep için şu anda onay verilemiyor.", httpStatus: 403 } as const;
        }
      } else if (actor.role === "staff") {
        if (nextStatus !== "reviewing" && nextStatus !== "cancelled") {
          return { error: "Görevli bu durum değişikliğini yapamaz.", httpStatus: 403 } as const;
        }
        if (nextStatus === "reviewing" && repair.status !== "new") return { error: "Bu talep artık inceleme aşamasına alınamaz.", httpStatus: 409 } as const;
      } else if (!allowedRoles.includes(actor.role)) {
        return { error: "Bu işlem için yetkin yok.", httpStatus: 403 } as const;
      }

      await client.query(`UPDATE repair_requests SET status = $1, repair_notes = COALESCE($3, repair_notes), updated_at = now() WHERE id = $2`, [nextStatus, requestId, note || null]);
      if (nextStatus === "cancelled") {
        const cancelledOffers = await client.query(`UPDATE repair_offers SET status = 'cancelled', responded_at = now() WHERE request_id = $1 AND status = 'pending' RETURNING id, technician_id`, [requestId]);
        for (const offer of cancelledOffers.rows) {
          await client.query(`INSERT INTO repair_events (request_id, actor_id, event_type, details) VALUES ($1, $2, 'offer_cancelled', $3::jsonb)`, [requestId, actor.id, JSON.stringify({ offerId: offer.id, technicianId: offer.technician_id, reason: "request_cancelled" })]);
        }
      }
      await client.query(
        `INSERT INTO repair_events (request_id, actor_id, event_type, from_status, to_status)
         VALUES ($1, $2, 'status_changed', $3, $4)`,
        [requestId, actor.id, repair.status, nextStatus],
      );
      return { reference: repair.reference, status: nextStatus } as const;
    });

    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.httpStatus });
    await notifyCustomerOfStatus(requestId, nextStatus);
    return NextResponse.json({ request: result });
  } catch (error) {
    return statusError(error);
  }
}
