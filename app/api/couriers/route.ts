import { NextResponse } from "next/server";
import { AuthenticationRequiredError, getCurrentUser, PermissionDeniedError } from "@/lib/authorization";
import { query } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    await getCurrentUser(["admin", "staff"]);
    const result = await query(
      `SELECT id, full_name, city, district, available
       FROM users WHERE role = 'courier' AND is_active = true
       ORDER BY available DESC, full_name ASC LIMIT 200`,
    );
    return NextResponse.json({ couriers: result.rows });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: "Giriş yapman gerekiyor." }, { status: 401 });
    if (error instanceof PermissionDeniedError) return NextResponse.json({ error: "Bu işlem için yetkin yok." }, { status: 403 });
    return NextResponse.json({ error: "Kuryeler şu anda yüklenemedi." }, { status: 500 });
  }
}
