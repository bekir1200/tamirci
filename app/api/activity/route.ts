import { NextResponse } from "next/server";
import { AuthenticationRequiredError, getCurrentUser, PermissionDeniedError } from "@/lib/authorization";
import { query } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    await getCurrentUser(["admin", "staff"]);
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
       ORDER BY e.created_at DESC, e.id DESC
       LIMIT 20`,
    );
    return NextResponse.json({ events: result.rows });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: "Giriş yapman gerekiyor." }, { status: 401 });
    if (error instanceof PermissionDeniedError) return NextResponse.json({ error: "Bu işlem için yetkin yok." }, { status: 403 });
    return NextResponse.json({ error: "Son hareketler yüklenemedi." }, { status: 500 });
  }
}
