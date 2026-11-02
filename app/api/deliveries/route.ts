import { NextResponse } from "next/server";
import { AuthenticationRequiredError, getCurrentUser, PermissionDeniedError } from "@/lib/authorization";
import { query } from "@/lib/db";
import { deliveryProjection } from "@/lib/deliveries";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getCurrentUser();
    const scope = user.role === "admin" || user.role === "staff"
      ? { sql: "", values: [] as unknown[] }
      : user.role === "courier"
        ? { sql: "WHERE d.courier_id = $1", values: [user.id] }
        : user.role === "customer"
          ? { sql: "WHERE r.customer_user_id = $1", values: [user.id] }
          : user.role === "technician"
            ? { sql: "WHERE r.assigned_technician_id = $1", values: [user.id] }
            : { sql: "WHERE false", values: [] as unknown[] };
    const result = await query(
      `${deliveryProjection} ${scope.sql} ORDER BY d.created_at DESC LIMIT 200`,
      scope.values,
    );
    return NextResponse.json({ deliveries: result.rows });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: "Giriş yapman gerekiyor." }, { status: 401 });
    if (error instanceof PermissionDeniedError) return NextResponse.json({ error: "Bu işlem için yetkin yok." }, { status: 403 });
    return NextResponse.json({ error: "Teslimat görevleri yüklenemedi." }, { status: 500 });
  }
}
