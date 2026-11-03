import { NextResponse } from "next/server";
import { AuthenticationRequiredError, getCurrentUser, PermissionDeniedError } from "@/lib/authorization";
import { query } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    await getCurrentUser(["admin", "staff"]);
    const result = await query(
      `SELECT u.id, u.full_name, u.email, u.shop_name, u.shop_address, u.shop_phone,
              u.city, u.district, u.specialties, u.available,
              count(r.id) FILTER (WHERE r.status NOT IN ('completed', 'cancelled'))::int AS active_jobs,
              count(r.id) FILTER (WHERE r.status = 'completed')::int AS completed_jobs
       FROM users u LEFT JOIN repair_requests r ON r.assigned_technician_id = u.id
       WHERE u.role = 'technician' AND u.is_active = true
       GROUP BY u.id
       ORDER BY u.available DESC, u.full_name ASC LIMIT 200`,
    );
    return NextResponse.json({ technicians: result.rows });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: "Giriş yapman gerekiyor." }, { status: 401 });
    if (error instanceof PermissionDeniedError) return NextResponse.json({ error: "Bu işlem için yetkin yok." }, { status: 403 });
    return NextResponse.json({ error: "Ustalar şu anda yüklenemedi." }, { status: 500 });
  }
}
