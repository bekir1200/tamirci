import { NextResponse } from "next/server";
import { AuthenticationRequiredError, getCurrentUser, PermissionDeniedError } from "@/lib/authorization";
import { query, withTransaction } from "@/lib/db";
import type { AppRole } from "@/types/next-auth";

export const runtime = "nodejs";

const roles: AppRole[] = ["admin", "staff", "technician", "courier", "customer"];

export async function GET() {
  try {
    await getCurrentUser(["admin"]);
    const result = await query(
      `SELECT id, full_name, email, role, shop_name, city, district, specialties, available, is_active, created_at
       FROM users ORDER BY created_at DESC LIMIT 500`,
    );
    return NextResponse.json({ users: result.rows });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: "Giriş yapman gerekiyor." }, { status: 401 });
    if (error instanceof PermissionDeniedError) return NextResponse.json({ error: "Bu işlem yalnızca admin için açık." }, { status: 403 });
    return NextResponse.json({ error: "Kullanıcılar yüklenemedi." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = await getCurrentUser(["admin"]);
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Değişiklik bilgileri geçersiz." }, { status: 400 });
    const input = body as Record<string, unknown>;
    if (typeof input.userId !== "string" || typeof input.role !== "string" || !roles.includes(input.role as AppRole)) {
      return NextResponse.json({ error: "Kullanıcı ve geçerli bir rol seç." }, { status: 400 });
    }
    const role = input.role as AppRole;
    const profile = input.profile && typeof input.profile === "object" ? input.profile as Record<string, unknown> : {};
    const shopName = typeof profile.shopName === "string" ? profile.shopName.trim().slice(0, 120) || null : null;
    const city = typeof profile.city === "string" ? profile.city.trim().slice(0, 50) || null : null;
    const district = typeof profile.district === "string" ? profile.district.trim().slice(0, 50) || null : null;
    const specialties = Array.isArray(profile.specialties)
      ? profile.specialties.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, 20)
      : [];

    const updated = await withTransaction(async (client) => {
      await client.query("SELECT pg_advisory_xact_lock(741029)");
      const target = await client.query(`SELECT id, role FROM users WHERE id = $1 FOR UPDATE`, [input.userId]);
      if (!target.rowCount) return { error: "Kullanıcı bulunamadı.", status: 404 } as const;
      if (target.rows[0].role === "admin" && role !== "admin") {
        const admins = await client.query(`SELECT count(*)::int AS count FROM users WHERE role = 'admin' AND is_active = true`);
        if (admins.rows[0].count <= 1) return { error: "Sistemde en az bir aktif admin kalmalı." , status: 409 } as const;
        if (input.userId === actor.id) return { error: "Kendi admin yetkini kaldıramazsın.", status: 409 } as const;
      }
      const result = await client.query(
        `UPDATE users SET role = $2,
           shop_name = CASE WHEN $2 = 'technician' THEN $3 ELSE shop_name END,
           city = CASE WHEN $2 IN ('technician', 'courier') THEN $4 ELSE city END,
           district = CASE WHEN $2 IN ('technician', 'courier') THEN $5 ELSE district END,
           specialties = CASE WHEN $2 = 'technician' THEN $6::text[] ELSE specialties END,
           updated_at = now()
         WHERE id = $1
         RETURNING id, full_name, email, role, shop_name, city, district, specialties, available, is_active`,
        [input.userId, role, shopName, city, district, specialties],
      );
      return { user: result.rows[0] } as const;
    });
    if ("error" in updated) return NextResponse.json({ error: updated.error }, { status: updated.status });
    return NextResponse.json({ user: updated.user });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: "Giriş yapman gerekiyor." }, { status: 401 });
    if (error instanceof PermissionDeniedError) return NextResponse.json({ error: "Bu işlem yalnızca admin için açık." }, { status: 403 });
    return NextResponse.json({ error: "Rol değiştirilemedi. Tekrar dene." }, { status: 500 });
  }
}
