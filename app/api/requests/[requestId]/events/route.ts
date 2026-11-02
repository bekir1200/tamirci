import { NextResponse } from "next/server";
import { AuthenticationRequiredError, getCurrentUser, PermissionDeniedError } from "@/lib/authorization";
import { query } from "@/lib/db";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ requestId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const actor = await getCurrentUser();
    const { requestId } = await context.params;
    const access = await query(
      `SELECT r.id
       FROM repair_requests r
       WHERE r.id = $1 AND (
         $2 IN ('admin', 'staff') OR
         ($2 = 'customer' AND r.customer_user_id = $3) OR
         ($2 = 'technician' AND (
           r.assigned_technician_id = $3 OR
           EXISTS (SELECT 1 FROM repair_offers o WHERE o.request_id = r.id AND o.technician_id = $3)
         ))
       )`,
      [requestId, actor.role, actor.id],
    );
    if (!access.rowCount) return NextResponse.json({ error: "Talep bulunamadı." }, { status: 404 });

    const result = await query(
      `SELECT e.id, e.event_type, e.from_status, e.to_status, e.created_at,
              a.full_name AS actor_name, target.full_name AS technician_name,
              courier.full_name AS courier_name,
              r.reference, r.device, r.issue
       FROM repair_events e
       JOIN repair_requests r ON r.id = e.request_id
       LEFT JOIN users a ON a.id = e.actor_id
       LEFT JOIN users target ON target.id::text = e.details->>'technicianId'
       LEFT JOIN users courier ON courier.id::text = e.details->>'courierId'
       WHERE e.request_id = $1
       ORDER BY e.created_at DESC, e.id DESC
       LIMIT 100`,
      [requestId],
    );
    return NextResponse.json({ events: result.rows });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: "Giriş yapman gerekiyor." }, { status: 401 });
    if (error instanceof PermissionDeniedError) return NextResponse.json({ error: "Bu işlem için yetkin yok." }, { status: 403 });
    return NextResponse.json({ error: "Talep geçmişi yüklenemedi." }, { status: 500 });
  }
}
