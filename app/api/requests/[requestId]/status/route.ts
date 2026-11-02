import { NextResponse } from "next/server";
import { AuthenticationRequiredError, getCurrentUser, PermissionDeniedError } from "@/lib/authorization";
import { withTransaction } from "@/lib/db";
import type { AppRole } from "@/types/next-auth";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ requestId: string }> };
const validStatuses = new Set(["reviewing", "in_repair", "waiting_customer", "waiting_parts", "ready_for_delivery", "cancelled"]);
const technicianTransitions: Record<string, string[]> = {
  assigned: ["in_repair"],
  in_repair: ["waiting_customer", "waiting_parts", "ready_for_delivery", "completed"],
  waiting_customer: ["in_repair"],
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
    if (typeof nextStatus !== "string" || !validStatuses.has(nextStatus)) {
      return NextResponse.json({ error: "Geçerli bir talep durumu seç." }, { status: 400 });
    }

    const result = await withTransaction(async (client) => {
      const selected = await client.query(
        `SELECT id, reference, status, customer_user_id, assigned_technician_id
         FROM repair_requests WHERE id = $1 FOR UPDATE`,
        [requestId],
      );
      const repair = selected.rows[0];
      if (!repair) return { error: "Talep bulunamadı.", httpStatus: 404 } as const;

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
      } else if (!allowedRoles.includes(actor.role)) {
        return { error: "Bu işlem için yetkin yok.", httpStatus: 403 } as const;
      }

      await client.query(`UPDATE repair_requests SET status = $1, updated_at = now() WHERE id = $2`, [nextStatus, requestId]);
      await client.query(
        `INSERT INTO repair_events (request_id, actor_id, event_type, from_status, to_status)
         VALUES ($1, $2, 'status_changed', $3, $4)`,
        [requestId, actor.id, repair.status, nextStatus],
      );
      return { reference: repair.reference, status: nextStatus } as const;
    });

    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.httpStatus });
    return NextResponse.json({ request: result });
  } catch (error) {
    return statusError(error);
  }
}
