import { NextResponse } from "next/server";
import { AuthenticationRequiredError, getCurrentUser, PermissionDeniedError } from "@/lib/authorization";
import { query } from "@/lib/db";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser(["technician"]);
    const body: unknown = await request.json();
    const available = body && typeof body === "object" ? (body as Record<string, unknown>).available : null;
    if (typeof available !== "boolean") return NextResponse.json({ error: "Durum bilgisi geçersiz." }, { status: 400 });
    const result = await query(
      `UPDATE users SET available = $1, updated_at = now() WHERE id = $2 RETURNING available`,
      [available, user.id],
    );
    return NextResponse.json({ available: result.rows[0].available });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: "Giriş yapman gerekiyor." }, { status: 401 });
    if (error instanceof PermissionDeniedError) return NextResponse.json({ error: "Bu işlem için yetkin yok." }, { status: 403 });
    return NextResponse.json({ error: "Müsaitlik durumu kaydedilemedi." }, { status: 500 });
  }
}
